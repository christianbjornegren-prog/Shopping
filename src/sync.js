// Pure, UI-free sync logic for the shared shopping lists.
//
// The lists are edited on several devices (and can sit frozen in a PWA for
// days), so a plain "write my whole document" save is unsafe: a client holding
// yesterday's state would overwrite everything that happened since — items you
// checked off come back, or a not-yet-loaded empty list wipes the whole thing.
//
// Instead every write is a three-way merge, exactly like a git merge:
//   base   – the server state this client last reconciled against
//   local  – what this client currently has in memory
//   remote – what the server has right now (read inside a transaction)
//
// Kept free of React/Firebase so it can be unit-tested.

// Timestamps are ISO strings (occasionally numbers). Missing/invalid -> 0.
export const toMs = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// How recently an item was touched. `updatedAt` is stamped on every local
// mutation, so un-checking (which clears checkedAt) still counts as newer.
export const itemStamp = (item) => Math.max(
  toMs(item?.updatedAt),
  toMs(item?.checkedAt),
  toMs(item?.addedAt)
);

const indexById = (items) => {
  const map = new Map();
  (items || []).forEach(item => {
    if (item && item.id !== undefined && item.id !== null) map.set(String(item.id), item);
  });
  return map;
};

// Three-way merge of two item lists.
//
//   in local + remote   -> the more recently touched version wins
//   only in remote      -> kept if it appeared after `base` (someone else added
//                          it), dropped if it was in `base` (we deleted it)
//   only in local       -> kept if it is new here, dropped if it was in `base`
//                          (someone else deleted it)
//
// Local ordering is preserved, with remote-only additions appended.
export const mergeItems = (base, local, remote) => {
  const b = indexById(base);
  const l = indexById(local);
  const r = indexById(remote);

  const out = [];
  const seen = new Set();
  const order = [
    ...(local || []).map(i => (i && i.id !== undefined && i.id !== null ? String(i.id) : null)),
    ...(remote || []).map(i => (i && i.id !== undefined && i.id !== null ? String(i.id) : null)),
  ];

  for (const id of order) {
    if (id === null || seen.has(id)) continue;
    seen.add(id);
    const li = l.get(id);
    const ri = r.get(id);
    const inBase = b.has(id);

    if (li && ri) {
      out.push(itemStamp(ri) > itemStamp(li) ? ri : li);
    } else if (ri && !li) {
      if (!inBase) out.push(ri);   // added elsewhere since our baseline
    } else if (li && !ri) {
      if (!inBase) out.push(li);   // added here, not on the server yet
    }
  }
  return out;
};

// Merge whole list documents. Server-owned fields (members/createdAt) are never
// clobbered by a client that may be holding a stale copy.
export const mergeLists = (baseDoc, localDoc, remoteDoc) => {
  const remote = remoteDoc || {};
  const local = localDoc || {};
  const merged = {
    ...remote,
    ...local,
    items: mergeItems(baseDoc?.items, local.items, remote.items),
  };
  if (remote.members !== undefined) merged.members = remote.members;
  if (remote.createdAt !== undefined) merged.createdAt = remote.createdAt;
  return stripUndefined(merged);
};

// A stable fingerprint of the meaningful contents of a list. Used to decide
// whether a write is needed at all, which stops the
// save -> onSnapshot -> save feedback loop.
export const listSignature = (listDoc) => {
  const rows = (listDoc?.items || [])
    .filter(i => i && i.id !== undefined && i.id !== null)
    .map(i => [
      String(i.id),
      i.name || '',
      i.category || '',
      i.checked ? 1 : 0,
      toMs(i.checkedAt),
      toMs(i.updatedAt),
    ])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return JSON.stringify(rows);
};

// Firestore rejects `undefined` anywhere in a document; drop those keys.
export function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      if (v !== undefined) out[k] = stripUndefined(v);
    });
    return out;
  }
  return value;
}

// Monotonic, collision-free item ids. `Date.now()` alone repeats when several
// items are added in the same millisecond (bulk paste, voice input), which
// produced duplicate React keys and made checking one item check another.
let idSequence = 0;
export const newItemId = () => {
  idSequence = (idSequence + 1) % 1000;
  return Date.now() * 1000 + idSequence;
};
