import { describe, it, expect, beforeEach } from 'vitest';
import {
  readSnapshots, recordSnapshot, thinSnapshots, clearSnapshots, describeSnapshot, MAX_SNAPSHOTS,
} from './snapshots.js';

const PATH = 'lists/L1';
const item = (id) => ({
  id,
  name: `Vara ${id}`,
  checked: false,
  addedAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
});
const many = (n) => Array.from({ length: n }, (_, i) => item(i + 1));

beforeEach(() => { localStorage.clear(); });

describe('versionshistorik', () => {
  it('sparar ett läge som servern har bekräftat', () => {
    recordSnapshot(PATH, { items: many(3) }, new Date('2026-09-05T19:14:00Z'));
    const saved = readSnapshots(PATH);
    expect(saved).toHaveLength(1);
    expect(saved[0].items).toHaveLength(3);
  });

  it('sparar aldrig en tom lista', () => {
    expect(recordSnapshot(PATH, { items: [] })).toBeNull();
    expect(readSnapshots(PATH)).toHaveLength(0);
  });

  it('sparar inte samma innehåll två gånger', () => {
    recordSnapshot(PATH, { items: many(3) });
    recordSnapshot(PATH, { items: many(3) });
    expect(readSnapshots(PATH)).toHaveLength(1);
  });

  it('lägger nyaste först', () => {
    recordSnapshot(PATH, { items: many(2) }, new Date('2026-09-05T10:00:00Z'));
    recordSnapshot(PATH, { items: many(5) }, new Date('2026-09-05T11:00:00Z'));
    const saved = readSnapshots(PATH);
    expect(saved[0].items).toHaveLength(5);
    expect(saved[1].items).toHaveLength(2);
  });

  it('växer inte i all oändlighet', () => {
    for (let i = 1; i <= MAX_SNAPSHOTS + 20; i++) {
      recordSnapshot(PATH, { items: many(i) }, new Date(Date.parse('2026-09-05T08:00:00Z') + i * 60000));
    }
    expect(readSnapshots(PATH).length).toBeLessThanOrEqual(MAX_SNAPSHOTS);
  });

  it('kraschar inte om localStorage är blockerat', () => {
    const original = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('blockerat'); };
    expect(() => recordSnapshot(PATH, { items: many(2) })).not.toThrow();
    localStorage.setItem = original;
  });

  it('går att rensa', () => {
    recordSnapshot(PATH, { items: many(2) });
    clearSnapshots(PATH);
    expect(readSnapshots(PATH)).toHaveLength(0);
  });
});

describe('gallringen', () => {
  const at = (iso, n = 1) => ({ t: iso, items: many(n) });

  it('behåller alltid nyaste och äldsta', () => {
    const entries = [
      at('2026-09-05T12:00:00Z'), at('2026-09-05T11:00:00Z'),
      at('2026-09-05T10:00:00Z'), at('2026-09-01T10:00:00Z'),
    ];
    const kept = thinSnapshots(entries, 2);
    expect(kept).toHaveLength(2);
    expect(kept[0].t).toBe('2026-09-05T12:00:00Z');
    expect(kept[1].t).toBe('2026-09-01T10:00:00Z');
  });

  it('en handlingsrunda knuffar inte ut gårdagens lista', () => {
    // 30 avbockningar på en halvtimme, plus en bra version från igår.
    const burst = Array.from({ length: 30 }, (_, i) => at(
      new Date(Date.parse('2026-09-05T17:00:00Z') + (30 - i) * 60000).toISOString(), 40
    ));
    const yesterday = at('2026-09-04T18:00:00Z', 43);
    const kept = thinSnapshots([...burst, yesterday], MAX_SNAPSHOTS);

    expect(kept).toHaveLength(MAX_SNAPSHOTS);
    expect(kept.some(e => e.t === yesterday.t)).toBe(true);
  });
});

describe('describeSnapshot', () => {
  const now = new Date('2026-09-05T20:00:00');

  it('säger idag, igår och datum', () => {
    expect(describeSnapshot('2026-09-05T19:14:00', now)).toBe('idag 19:14');
    expect(describeSnapshot('2026-09-04T08:30:00', now)).toBe('igår 08:30');
    expect(describeSnapshot('2026-09-01T18:02:00', now)).toBe('1 sep 18:02');
  });

  it('klarar skräpindata', () => {
    expect(describeSnapshot('inte ett datum', now)).toBe('');
  });
});
