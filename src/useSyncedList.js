import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { mergeLists, listSignature, stripUndefined } from './sync';

// ===========================================================================
// Shared-list sync.
//
// Two devices edit the same document, and a PWA can sit frozen for days and
// wake up holding yesterday's state. A naive "write my whole list" save then
// either resurrects items that were checked off in the meantime, or — before
// the first load has arrived — writes an empty list over everything.
//
// So: we never blind-overwrite. Every write happens inside a transaction that
// re-reads the server document and three-way merges it (see sync.js). Writes
// are additionally gated on having a *server-confirmed* baseline for exactly
// this document, so a client that has not loaded yet can never delete data.
// ===========================================================================
export const SAVE_DEBOUNCE_MS = 600;
export const SAVE_RETRY_MS = 5000;

export const useSyncedList = (pathParts, makeEmpty) => {
  const path = pathParts && pathParts.every(Boolean) ? pathParts.join('/') : null;

  const [list, setList] = useState(makeEmpty);

  const partsRef = useRef(pathParts);
  partsRef.current = pathParts;
  const makeEmptyRef = useRef(makeEmpty);
  makeEmptyRef.current = makeEmpty;
  const listRef = useRef(list);
  listRef.current = list;

  const baseRef = useRef(null);       // last server state we reconciled against
  const serverSigRef = useRef(null);  // signature of that server state
  const readyRef = useRef(false);     // do we have a server-confirmed baseline?
  // Same flag as state, so the UI can show "loading" instead of an empty list
  // (an empty list looks exactly like data loss, which is not a nice guess to
  // leave the user with).
  const [ready, setReady] = useState(false);
  const saveTimer = useRef(null);
  const retryTimer = useRef(null);

  // Reset when the document changes (logout, joining another list).
  //
  // Crucially NOT when the path resolves for the first time (null -> a list):
  // signing in takes a moment, and anything typed while we waited must survive.
  // It has no baseline yet, so the first snapshot simply merges it in.
  const prevPathRef = useRef(null);
  useEffect(() => {
    const previous = prevPathRef.current;
    prevPathRef.current = path;

    readyRef.current = false;
    setReady(false);
    baseRef.current = null;
    serverSigRef.current = null;
    clearTimeout(saveTimer.current);
    clearTimeout(retryTimer.current);

    const isFirstResolve = previous === null && path !== null;
    if (isFirstResolve) return; // keep what the user has already entered

    const empty = makeEmptyRef.current();
    listRef.current = empty;
    setList(empty);
  }, [path]);

  // Merge-on-write. Reads the current server document inside a transaction so a
  // concurrent change can never be lost, then writes the merged result.
  const save = useRef(null);
  save.current = async () => {
    const parts = partsRef.current;
    if (!path || !parts || !readyRef.current) return;
    if (listSignature(listRef.current) === serverSigRef.current) return;

    const baseAtWrite = baseRef.current;
    try {
      const ref = doc(db, ...parts);
      const merged = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const remote = snap.exists() ? snap.data() : { items: [] };
        const result = stripUndefined(mergeLists(baseAtWrite, listRef.current, remote));
        tx.set(ref, { ...result, updatedAt: new Date().toISOString() });
        return result;
      });

      baseRef.current = merged;
      serverSigRef.current = listSignature(merged);
      // Fold the result back in; anything the user changed mid-write is newer
      // and survives the merge (and schedules another save).
      setList(prev => {
        const next = mergeLists(baseAtWrite, prev, merged);
        const resolved = listSignature(next) === listSignature(prev) ? prev : next;
        listRef.current = resolved;
        return resolved;
      });
    } catch (error) {
      // Offline or contention: keep the edit in memory and try again. Nothing
      // is lost because the next attempt re-merges against the server.
      console.error('Kunde inte spara listan, försöker igen:', error);
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => save.current?.(), SAVE_RETRY_MS);
    }
  };

  // Live updates. Remote data is merged into local state rather than replacing
  // it, so edits made while a snapshot is in flight are not dropped.
  useEffect(() => {
    const parts = partsRef.current;
    if (!path || !parts) return;
    const ref = doc(db, ...parts);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const fromCache = snap.metadata?.fromCache;
        if (snap.exists()) {
          const remote = snap.data();
          // Capture the baseline BEFORE it is replaced below: React runs this
          // updater on the next render, by which time baseRef would already
          // point at `remote` — and merging against itself reads every item
          // the server has as "deleted here".
          const baseAtMerge = baseRef.current;
          // listRef is kept in step with what React will actually hold, so a
          // save can never see a pre-merge list and mistake "not loaded yet"
          // for "the user deleted everything".
          setList(prev => {
            const next = mergeLists(baseAtMerge, prev, remote);
            const resolved = listSignature(next) === listSignature(prev) ? prev : next;
            listRef.current = resolved;
            return resolved;
          });
          // Only server-confirmed data becomes the baseline for deletes.
          if (!fromCache) {
            baseRef.current = remote;
            serverSigRef.current = listSignature(remote);
            readyRef.current = true;
            setReady(true);
          }
        } else if (!fromCache) {
          baseRef.current = { items: [] };
          serverSigRef.current = listSignature({ items: [] });
          readyRef.current = true;
          setReady(true);
        }
        // The server may now differ from what we hold without `list` changing
        // identity (e.g. it lost items we still have), which the effect below
        // would never notice. Schedule a save here too — debounced, never
        // immediate, so React has applied the merge before it runs and a save
        // can't see a pre-merge list.
        if (readyRef.current) {
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => save.current?.(), SAVE_DEBOUNCE_MS);
        }
      },
      (error) => console.error('Sync-fel:', error)
    );
    return () => unsubscribe();
  }, [path]);

  // Debounced save whenever local state drifts from the server.
  useEffect(() => {
    if (!path || !readyRef.current) return;
    if (listSignature(list) === serverSigRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.current?.(), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [list, path]);

  // Don't let pending edits die when the app is backgrounded or goes offline.
  useEffect(() => {
    const flush = () => save.current?.();
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  return [list, setList, ready];
};
