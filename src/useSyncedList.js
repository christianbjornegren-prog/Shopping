import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { mergeLists, listSignature, stripUndefined } from './sync';
import { logEvent } from './syncLog';
import { recordSnapshot } from './snapshots';

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

// "permission-denied" comes from the server's security rules, never from bad
// signal — it deserves its own status so it is not mislabelled "Ingen kontakt".
const isDenied = (error) => error?.code === 'permission-denied'
  || /permission-denied|Missing or insufficient permissions/i.test(String(error?.message || ''));

// ---------------------------------------------------------------------------
// Pending-edit persistence.
//
// Saves go through a Firestore transaction, which (unlike setDoc) is never
// queued offline: on a weak connection it simply fails and we retry. That is
// the right call for safety — but until now the retry lived only in React
// memory, so closing the app on one bar of signal in the shop silently threw
// the edit away. Now the unsaved list (together with the baseline it was made
// against, so a pending *delete* is not resurrected by the next snapshot) is
// kept in localStorage and restored on the next start.
// ---------------------------------------------------------------------------
const PENDING_PREFIX = 'chrelin:pending:';

export const readPending = (path) => {
  try {
    const raw = globalThis.localStorage?.getItem(PENDING_PREFIX + path);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && Array.isArray(parsed.list?.items) ? parsed : null;
  } catch (_) {
    return null;
  }
};

export const writePending = (path, base, list) => {
  try {
    globalThis.localStorage?.setItem(
      PENDING_PREFIX + path,
      JSON.stringify({ base: base || null, list, savedAt: new Date().toISOString() })
    );
  } catch (_) {
    // Storage full/blocked: the in-memory retry still runs; we just lose the
    // survive-a-restart guarantee for this one edit.
  }
};

export const clearPending = (path) => {
  try { globalThis.localStorage?.removeItem(PENDING_PREFIX + path); } catch (_) {}
};

export const useSyncedList = (pathParts, makeEmpty, label = 'Listan') => {
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
  // Exposed to the UI so it can show what is actually going on instead of an
  // empty list (an empty list looks exactly like data loss).
  // phase: 'loading' | 'cached' | 'synced' | 'saving' | 'error' | 'denied'
  //   cached – showing the on-device copy; the server has not confirmed it (yet)
  //   denied – the server's security rules refuse this document
  const [status, setStatus] = useState({ ready: false, phase: 'loading', lastSyncAt: null });
  const setReady = (value) => setStatus(s => ({ ...s, ready: value, phase: value ? s.phase : 'loading' }));
  const labelRef = useRef(label);
  labelRef.current = label;
  const countRef = useRef(0);
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
    if (!isFirstResolve) {
      const empty = makeEmptyRef.current();
      listRef.current = empty;
      setList(empty);
    }
    // (isFirstResolve: keep what the user has already typed while signing in.)

    // Bring back edits that never reached the server before the app was closed.
    if (path) {
      const pending = readPending(path);
      const meaningful = pending && (pending.base || (pending.list.items || []).length > 0);
      if (pending && !meaningful) clearPending(path);
      if (meaningful) {
        // Union with anything typed just now; nothing is thrown away.
        const restored = mergeLists(null, listRef.current, pending.list);
        listRef.current = restored;
        setList(restored);
        if (pending.base) {
          // We know what the server looked like when these edits were made, so
          // deletes among them are real deletes, and we may save straight away.
          baseRef.current = pending.base;
          serverSigRef.current = listSignature(pending.base);
          readyRef.current = true;
          setStatus(s => ({ ...s, ready: true, phase: 'saving' }));
        }
        logEvent('info', `${labelRef.current}: återställde osparade ändringar (${(restored.items || []).length} varor)`);
      }
    }
  }, [path]);

  // Merge-on-write. Reads the current server document inside a transaction so a
  // concurrent change can never be lost, then writes the merged result.
  const save = useRef(null);
  const inFlightRef = useRef(false);   // one transaction at a time
  const dirtyRef = useRef(false);      // an edit arrived mid-flight: go again
  const deniedLoggedRef = useRef(false); // log a permission problem once, not every retry
  save.current = async () => {
    const parts = partsRef.current;
    if (!path || !parts || !readyRef.current) return;
    if (listSignature(listRef.current) === serverSigRef.current) {
      clearPending(path);
      return;
    }
    if (inFlightRef.current) { dirtyRef.current = true; return; }
    inFlightRef.current = true;

    const baseAtWrite = baseRef.current;
    setStatus(s => (s.phase === 'saving' ? s : { ...s, phase: 'saving' }));
    try {
      const ref = doc(db, ...parts);
      const merged = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const remote = snap.exists() ? snap.data() : { items: [] };
        const result = stripUndefined(mergeLists(baseAtWrite, listRef.current, remote, {
          onBulkDeleteRefused: (n) =>
            logEvent('warn', `${labelRef.current}: skyddsnätet stoppade en massradering (${n} varor)`),
        }));
        tx.set(ref, { ...result, updatedAt: new Date().toISOString() });
        return result;
      });

      baseRef.current = merged;
      serverSigRef.current = listSignature(merged);
      deniedLoggedRef.current = false;
      recordSnapshot(path, merged);
      const savedCount = (merged.items || []).length;
      clearPending(path);
      logEvent('ok', `${labelRef.current}: sparade – ${savedCount} varor`);
      setStatus(s => ({ ...s, phase: 'synced', lastSyncAt: new Date().toISOString() }));
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
      const denied = isDenied(error);
      if (denied) {
        // Security rules, not signal. Log it once, back off hard, and keep the
        // edit on disk (the pending copy) so nothing is thrown away.
        if (!deniedLoggedRef.current) {
          logEvent('error', `${labelRef.current}: kunde inte spara – servern nekar åtkomst (permission-denied)`);
          deniedLoggedRef.current = true;
        }
        setStatus(s => ({ ...s, phase: 'denied' }));
      } else {
        deniedLoggedRef.current = false;
        logEvent('error', `${labelRef.current}: kunde inte spara – försöker igen (${error?.code || error?.message || 'okänt fel'})`);
        setStatus(s => ({ ...s, phase: 'error' }));
      }
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => save.current?.(), denied ? SAVE_RETRY_MS * 12 : SAVE_RETRY_MS);
    } finally {
      inFlightRef.current = false;
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setTimeout(() => save.current?.(), 0);
      }
    }
  };

  // Live updates. Remote data is merged into local state rather than replacing
  // it, so edits made while a snapshot is in flight are not dropped.
  //
  // `includeMetadataChanges` is essential, not cosmetic. With the on-device
  // cache enabled, Firestore first delivers the cached copy (fromCache: true)
  // and then, once the server has answered, a second snapshot with
  // fromCache: false. If the data is identical — the normal case when nobody
  // else has edited — that second snapshot is a *metadata-only* change, and
  // without this flag Firestore never delivers it. We would then sit on a
  // cached copy forever, never mark the list as server-confirmed, and never
  // save a single edit. That is exactly what happened: "visar sparad kopia
  // medan servern svarar" in the log, and nothing after it, for days.
  useEffect(() => {
    const parts = partsRef.current;
    if (!path || !parts) return;
    const ref = doc(db, ...parts);
    const unsubscribe = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        const fromCache = snap.metadata?.fromCache;
        if (snap.exists()) {
          const remote = snap.data();
          const remoteSig = listSignature(remote);
          const isFirst = !readyRef.current;
          const remoteChanged = remoteSig !== serverSigRef.current;
          // Capture the baseline BEFORE it is replaced below: React runs this
          // updater on the next render, by which time baseRef would already
          // point at `remote` — and merging against itself reads every item
          // the server has as "deleted here".
          const baseAtMerge = baseRef.current;
          // listRef is kept in step with what React will actually hold, so a
          // save can never see a pre-merge list and mistake "not loaded yet"
          // for "the user deleted everything".
          setList(prev => {
            const next = mergeLists(baseAtMerge, prev, remote, {
              onBulkDeleteRefused: (n) =>
                logEvent('warn', `${labelRef.current}: skyddsnätet stoppade en massradering (${n} varor)`),
            });
            const resolved = listSignature(next) === listSignature(prev) ? prev : next;
            listRef.current = resolved;
            return resolved;
          });
          // Only server-confirmed data becomes the baseline for deletes.
          if (!fromCache) {
            baseRef.current = remote;
            serverSigRef.current = remoteSig;
            readyRef.current = true;
            // Keep a restorable copy of every state the server has confirmed.
            recordSnapshot(path, remote);
            const n = (remote.items || []).length;
            if (isFirst) logEvent('ok', `${labelRef.current}: ansluten till servern – ${n} varor`);
            else if (remoteChanged) logEvent('info', `${labelRef.current}: uppdatering från servern – ${n} varor`);
            setStatus(s => ({ ...s, ready: true, phase: 'synced', lastSyncAt: new Date().toISOString() }));
          } else {
            if (isFirst) logEvent('info', `${labelRef.current}: visar sparad kopia medan servern svarar`);
            // Cached data on screen, server not (or no longer) confirming it.
            // Don't hide a save that is in progress or has failed.
            setStatus(s => (s.phase === 'saving' || s.phase === 'error' || s.phase === 'denied'
              ? s
              : { ...s, phase: 'cached' }));
          }
        } else if (!fromCache) {
          baseRef.current = { items: [] };
          serverSigRef.current = listSignature({ items: [] });
          readyRef.current = true;
          logEvent('info', `${labelRef.current}: ingen lista på servern än`);
          setStatus(s => ({ ...s, ready: true, phase: 'synced', lastSyncAt: new Date().toISOString() }));
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
      (error) => {
        console.error('Sync-fel:', error);
        if (isDenied(error)) {
          // Not a connectivity problem: the server's security rules refuse this
          // document. Retrying won't help; say so plainly.
          logEvent('error', `${labelRef.current}: servern nekar åtkomst till listan (permission-denied) – säkerhetsreglerna måste tillåta den`);
          setStatus(s => ({ ...s, phase: 'denied' }));
          return;
        }
        logEvent('error', `${labelRef.current}: tappade kontakten (${error?.code || error?.message || 'okänt fel'})`);
        setStatus(s => ({ ...s, phase: 'error' }));
      }
    );
    return () => unsubscribe();
  }, [path]);

  // Debounced save whenever local state drifts from the server.
  useEffect(() => {
    if (!path) return;
    if (readyRef.current && listSignature(list) === serverSigRef.current) {
      clearPending(path);
      return;
    }
    // Unsaved: keep a copy on disk right away, so closing the app can't lose it
    // (also before the first load – base is null then, and the restore unions).
    const hasContent = (list.items || []).length > 0;
    if (hasContent || baseRef.current) writePending(path, baseRef.current, list);
    if (!readyRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.current?.(), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [list, path]);

  // Stop timers on unmount so nothing fires into a dead hook.
  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    clearTimeout(retryTimer.current);
  }, []);

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

  return [list, setList, status];
};
