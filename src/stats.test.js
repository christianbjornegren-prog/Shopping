import { describe, it, expect } from 'vitest';
import {
  addsByHour,
  addsByWeekday,
  checksByHour,
  checksByWeekday,
  byPerson,
  byCategory,
  topProducts,
  displayName,
  WEEKDAY_LABELS
} from './categorization.js';

// A small fixture of items spanning a couple of known timestamps.
// 2026-06-15 is a Monday; 2026-06-17 is a Wednesday.
const monday0930 = '2026-06-15T09:30:00';
const monday2015 = '2026-06-15T20:15:00';
const wednesday0930 = '2026-06-17T09:30:00';

const items = [
  { name: 'Mjölk', category: 'Mejeri', addedBy: 'christian@gmail.com', addedAt: monday0930, checkedAt: monday2015 },
  { name: 'Bröd', category: 'Bröd & Bakelser', addedBy: 'christian@gmail.com', addedAt: monday0930 },
  { name: 'Äpple', category: '', addedBy: 'sambo@gmail.com', addedAt: wednesday0930, checkedAt: wednesday0930 },
  { name: 'Trasig', addedBy: 'christian@gmail.com' }, // no timestamps at all
];

describe('addsByHour', () => {
  it('buckets items into the correct local hour and ignores items without addedAt', () => {
    const buckets = addsByHour(items);
    expect(buckets).toHaveLength(24);
    expect(buckets[9].count).toBe(3); // three items added at 09:30 (Mon x2, Wed x1)
    expect(buckets[20].count).toBe(0); // 20:15 is a checkedAt, not addedAt
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(3); // the timestamp-less item is ignored
  });
});

describe('addsByWeekday', () => {
  it('is Monday-first and lands items on the right day', () => {
    const buckets = addsByWeekday(items);
    expect(buckets.map(b => b.label)).toEqual(WEEKDAY_LABELS);
    expect(buckets[0].label).toBe('Mån');
    expect(buckets[0].count).toBe(2); // two Monday adds
    expect(buckets[2].count).toBe(1); // one Wednesday add
    expect(buckets[6].count).toBe(0); // nothing on Sunday
  });
});

describe('checksByHour / checksByWeekday', () => {
  it('only counts items that have a checkedAt', () => {
    const hours = checksByHour(items);
    expect(hours[20].count).toBe(1); // Monday 20:15 check
    expect(hours[9].count).toBe(1); // Wednesday 09:30 check
    const total = hours.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(2);

    const days = checksByWeekday(items);
    expect(days[0].count).toBe(1); // Monday check
    expect(days[2].count).toBe(1); // Wednesday check
  });
});

describe('byPerson', () => {
  it('tallies added and checked per user', () => {
    const result = byPerson(items);
    expect(result['christian@gmail.com']).toEqual({ added: 2, checked: 1 });
    expect(result['sambo@gmail.com']).toEqual({ added: 1, checked: 1 });
    expect(result['Okänd']).toBeUndefined(); // the trasig item has an addedBy
  });
});

describe('byCategory', () => {
  it('counts real categories and skips items without one', () => {
    const result = byCategory(items);
    expect(result['Mejeri']).toBe(1);
    expect(result['Bröd & Bakelser']).toBe(1);
    // Äpple (empty category) and Trasig (no category) are skipped entirely.
    expect(result['Övrigt']).toBeUndefined();
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe('topProducts', () => {
  const history = {
    Mjölk: { category: 'Mejeri', count: 12 },
    Bröd: { category: 'Bröd & Bakelser', count: 7 },
    Kaffe: { category: 'Dryck', count: 20 },
    Aldrig: { category: 'Övrigt', count: 0 },
  };

  it('sorts descending by count, drops zero-count, respects limit', () => {
    const top = topProducts(history, 2);
    expect(top).toHaveLength(2);
    expect(top[0]).toMatchObject({ name: 'Kaffe', count: 20 });
    expect(top[1]).toMatchObject({ name: 'Mjölk', count: 12 });
    expect(top.find(p => p.name === 'Aldrig')).toBeUndefined();
  });

  it('handles empty/undefined history', () => {
    expect(topProducts(undefined)).toEqual([]);
    expect(topProducts({})).toEqual([]);
  });
});

describe('displayName', () => {
  it('uses the local part of the email, capitalised', () => {
    expect(displayName('christian@gmail.com')).toBe('Christian');
    expect(displayName('sambo@example.se')).toBe('Sambo');
  });

  it('falls back to Okänd for empty input', () => {
    expect(displayName('')).toBe('Okänd');
    expect(displayName(undefined)).toBe('Okänd');
  });
});
