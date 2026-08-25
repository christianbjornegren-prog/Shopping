import { describe, it, expect } from 'vitest';
import {
  toMs, itemStamp, mergeItems, mergeLists, listSignature, stripUndefined, newItemId,
} from './sync.js';

const item = (id, extra = {}) => ({
  id,
  name: `Vara ${id}`,
  checked: false,
  addedAt: '2026-07-01T10:00:00.000Z',
  ...extra,
});

describe('itemStamp / toMs', () => {
  it('uses the most recent of updatedAt / checkedAt / addedAt', () => {
    expect(itemStamp(item(1))).toBe(Date.parse('2026-07-01T10:00:00.000Z'));
    expect(itemStamp(item(1, { checkedAt: '2026-07-02T10:00:00.000Z' })))
      .toBe(Date.parse('2026-07-02T10:00:00.000Z'));
    // Un-checking clears checkedAt but stamps updatedAt – must count as newest.
    expect(itemStamp(item(1, { checkedAt: null, updatedAt: '2026-07-03T10:00:00.000Z' })))
      .toBe(Date.parse('2026-07-03T10:00:00.000Z'));
  });

  it('treats missing/invalid timestamps as 0', () => {
    expect(toMs(null)).toBe(0);
    expect(toMs('inte ett datum')).toBe(0);
    expect(itemStamp({})).toBe(0);
    expect(itemStamp(undefined)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The two reported bugs
// ---------------------------------------------------------------------------

describe('BUG: avbockade varor kom tillbaka', () => {
  it('a stale client cannot resurrect items that were checked off later', () => {
    // Yesterday this device saw two unchecked items and then went to sleep.
    const base = [item(1), item(2)];
    const local = [item(1), item(2)];
    // Meanwhile they were checked off on the other phone.
    const remote = [
      item(1, { checked: true, checkedAt: '2026-07-02T18:00:00.000Z', checkedBy: 'a@x' }),
      item(2, { checked: true, checkedAt: '2026-07-02T18:05:00.000Z', checkedBy: 'a@x' }),
    ];

    const merged = mergeItems(base, local, remote);

    expect(merged).toHaveLength(2);
    expect(merged.every(i => i.checked)).toBe(true);
  });

  it('but a genuine local un-check (newer) still wins', () => {
    const base = [item(1, { checked: true, checkedAt: '2026-07-02T18:00:00.000Z' })];
    const local = [item(1, { checked: false, checkedAt: null, updatedAt: '2026-07-03T09:00:00.000Z' })];
    const remote = [item(1, { checked: true, checkedAt: '2026-07-02T18:00:00.000Z' })];

    expect(mergeItems(base, local, remote)[0].checked).toBe(false);
  });
});

describe('BUG: hela listan raderades av en kapplöpning vid start', () => {
  // The regression that wiped both users' lists: a save fired before React had
  // applied the freshly merged snapshot, so `local` was still the empty
  // startup list while `base` already held the full server list. Every item
  // then looked "deleted by the user".
  const many = Array.from({ length: 40 }, (_, n) => item(n + 1));

  it('an empty local list must never delete a full server list', () => {
    const merged = mergeItems(many, [], many);
    expect(merged).toHaveLength(40);
  });

  it('the same guard protects the other direction (server wiped, client intact)', () => {
    // A client that still holds the items restores them instead of accepting
    // the deletion – this is what lets a surviving device heal the list.
    const merged = mergeItems(many, many, []);
    expect(merged).toHaveLength(40);
  });

  it('still allows deleting items one at a time', () => {
    const base = many;
    const local = many.slice(1);            // one item removed here
    expect(mergeItems(base, local, many)).toHaveLength(39);
  });

  it('allows a small burst of deletes but refuses a mass wipe', () => {
    expect(mergeItems(many, many.slice(5), many)).toHaveLength(35);   // 5 deletes: allowed
    expect(mergeItems(many, many.slice(6), many)).toHaveLength(40);   // 6: refused
  });

  it('can be opted out of explicitly', () => {
    expect(mergeItems(many, [], many, { maxDeletes: Infinity })).toHaveLength(0);
  });
});

describe('BUG: listan blev tom (0 varor)', () => {
  it('an unloaded/empty client never wipes the server list', () => {
    // Nothing loaded yet: no baseline, empty local state.
    const remote = [item(1), item(2), item(3)];
    const merged = mergeItems(null, [], remote);
    expect(merged).toHaveLength(3);
  });

  it('an empty document on the server does not delete fresh local items', () => {
    const merged = mergeItems(null, [item(9)], []);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// Normal collaborative editing must keep working
// ---------------------------------------------------------------------------

describe('mergeItems – ordinary edits', () => {
  it('keeps items added on the other device', () => {
    const base = [item(1)];
    const merged = mergeItems(base, [item(1)], [item(1), item(2)]);
    expect(merged.map(i => i.id)).toEqual([1, 2]);
  });

  it('keeps items added locally that the server has not seen yet', () => {
    const base = [item(1)];
    const merged = mergeItems(base, [item(1), item(2)], [item(1)]);
    expect(merged.map(i => i.id)).toEqual([1, 2]);
  });

  it('propagates a local delete', () => {
    const base = [item(1), item(2)];
    const merged = mergeItems(base, [item(1)], [item(1), item(2)]);
    expect(merged.map(i => i.id)).toEqual([1]);
  });

  it('respects a delete made on the other device', () => {
    const base = [item(1), item(2)];
    const merged = mergeItems(base, [item(1), item(2)], [item(1)]);
    expect(merged.map(i => i.id)).toEqual([1]);
  });

  it('takes the most recently edited version of a shared item', () => {
    const base = [item(1)];
    const local = [item(1, { category: 'Mejeri', updatedAt: '2026-07-05T10:00:00.000Z' })];
    const remote = [item(1, { category: 'Fryst', updatedAt: '2026-07-04T10:00:00.000Z' })];
    expect(mergeItems(base, local, remote)[0].category).toBe('Mejeri');
  });

  it('preserves local ordering and appends remote-only items', () => {
    const merged = mergeItems([], [item(3), item(1)], [item(3), item(1), item(7)]);
    expect(merged.map(i => i.id)).toEqual([3, 1, 7]);
  });

  it('ignores malformed entries without ids', () => {
    const merged = mergeItems([], [item(1), null, { name: 'utan id' }], []);
    expect(merged.map(i => i.id)).toEqual([1]);
  });
});

describe('mergeLists', () => {
  it('never lets a stale client overwrite server-owned fields', () => {
    const merged = mergeLists(
      { items: [] },
      { id: 'L', items: [], members: ['a'], createdAt: 'gammalt' },
      { id: 'L', items: [], members: ['a', 'b'], createdAt: 'original' },
    );
    expect(merged.members).toEqual(['a', 'b']);
    expect(merged.createdAt).toBe('original');
  });

  it('handles a missing remote document', () => {
    const merged = mergeLists(null, { id: 'L', items: [item(1)] }, undefined);
    expect(merged.items).toHaveLength(1);
  });
});

describe('listSignature', () => {
  it('is stable regardless of item order', () => {
    expect(listSignature({ items: [item(1), item(2)] }))
      .toBe(listSignature({ items: [item(2), item(1)] }));
  });

  it('changes when something meaningful changes', () => {
    const before = listSignature({ items: [item(1)] });
    expect(listSignature({ items: [item(1, { checked: true, checkedAt: '2026-07-09T10:00:00.000Z' })] }))
      .not.toBe(before);
    expect(listSignature({ items: [item(1, { category: 'Mejeri' })] })).not.toBe(before);
    expect(listSignature({ items: [item(1), item(2)] })).not.toBe(before);
  });
});

// The sync loop is: local edit -> merge+write -> our own snapshot echoes back
// -> merge again. If that second merge produced anything different we would
// write again forever. These properties guarantee it settles.
describe('convergence (no endless write loop)', () => {
  const base = [item(1), item(2)];
  const local = [item(1, { checked: true, checkedAt: '2026-07-06T10:00:00.000Z' }), item(3)];
  const remote = [item(1), item(2), item(4)];

  it('merging is idempotent', () => {
    const merged = mergeItems(base, local, remote);
    const again = mergeItems(base, merged, remote);
    expect(listSignature({ items: again })).toBe(listSignature({ items: merged }));
  });

  it('the echo of our own write changes nothing', () => {
    const merged = mergeLists({ items: base }, { items: local }, { items: remote });
    // Server now holds `merged`; it comes back via onSnapshot with base = merged.
    const afterEcho = mergeLists(merged, merged, merged);
    expect(listSignature(afterEcho)).toBe(listSignature(merged));
  });

  it('two devices editing different items converge to the same result', () => {
    const shared = [item(1), item(2)];
    const deviceA = [item(1, { checked: true, checkedAt: '2026-07-06T10:00:00.000Z' }), item(2)];
    const deviceB = [item(1), item(2, { checked: true, checkedAt: '2026-07-06T10:01:00.000Z' })];

    // A writes first, then B merges against A's result – and vice versa.
    const aThenB = mergeItems(shared, deviceB, mergeItems(shared, deviceA, shared));
    const bThenA = mergeItems(shared, deviceA, mergeItems(shared, deviceB, shared));

    expect(listSignature({ items: aThenB })).toBe(listSignature({ items: bThenA }));
    expect(aThenB.every(i => i.checked)).toBe(true);
  });
});

describe('stripUndefined', () => {
  it('removes undefined values Firestore would reject', () => {
    const clean = stripUndefined({ a: 1, b: undefined, items: [{ c: undefined, d: null }] });
    expect('b' in clean).toBe(false);
    expect('c' in clean.items[0]).toBe(false);
    expect(clean.items[0].d).toBeNull();
  });
});

describe('newItemId', () => {
  it('never collides, even for many items added in the same millisecond', () => {
    const ids = new Set();
    for (let i = 0; i < 500; i++) ids.add(newItemId());
    expect(ids.size).toBe(500);
  });

  it('stays a safe integer', () => {
    expect(Number.isSafeInteger(newItemId())).toBe(true);
  });
});
