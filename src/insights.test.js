import { describe, it, expect } from 'vitest';
import {
  shoppingTrips,
  tripStats,
  avgLeadTimeDays,
  plannerVsShopper,
  restockSuggestions,
} from './categorization.js';

const iso = (s) => s; // readability helper

describe('shoppingTrips / tripStats', () => {
  // Two clusters: three buys on Jul 1 morning, two on Jul 5 evening.
  const items = [
    { checkedAt: '2026-07-01T09:00:00' },
    { checkedAt: '2026-07-01T09:20:00' },
    { checkedAt: '2026-07-01T09:35:00' },
    { checkedAt: '2026-07-05T18:00:00' },
    { checkedAt: '2026-07-05T18:10:00' },
    { checkedAt: null }, // ignored
  ];

  it('clusters buys within the gap into trips', () => {
    const trips = shoppingTrips(items, 3);
    expect(trips).toHaveLength(2);
    expect(trips[0].count).toBe(3);
    expect(trips[1].count).toBe(2);
  });

  it('summarises trips', () => {
    expect(tripStats(items, 3)).toEqual({
      trips: 2, totalBought: 5, avgItemsPerTrip: 2.5, biggestTrip: 3,
    });
  });

  it('handles no purchases', () => {
    expect(shoppingTrips([])).toEqual([]);
    expect(tripStats([])).toMatchObject({ trips: 0, totalBought: 0 });
  });
});

describe('avgLeadTimeDays', () => {
  it('averages days between added and bought', () => {
    const items = [
      { addedAt: '2026-07-01T00:00:00', checkedAt: '2026-07-03T00:00:00' }, // 2d
      { addedAt: '2026-07-01T00:00:00', checkedAt: '2026-07-05T00:00:00' }, // 4d
    ];
    expect(avgLeadTimeDays(items)).toBe(3);
  });

  it('ignores items missing a timestamp and returns null when empty', () => {
    expect(avgLeadTimeDays([{ addedAt: '2026-07-01T00:00:00' }])).toBeNull();
    expect(avgLeadTimeDays([])).toBeNull();
  });
});

describe('plannerVsShopper', () => {
  it('counts who adds vs who checks off', () => {
    const items = [
      { addedBy: 'a@x', checkedBy: 'b@x' },
      { addedBy: 'a@x', checkedBy: 'a@x' },
      { addedBy: 'b@x' },
    ];
    const r = plannerVsShopper(items);
    expect(r['a@x']).toEqual({ planned: 2, shopped: 1 });
    expect(r['b@x']).toEqual({ planned: 1, shopped: 1 });
  });
});

describe('restockSuggestions', () => {
  const NOW = new Date('2026-07-20T12:00:00').getTime();
  // Mjölk bought roughly every 5 days, last buy 6 days ago -> due.
  const items = [
    { name: 'Mjölk', category: 'Mejeri', checked: true, checkedAt: '2026-06-29T10:00:00' },
    { name: 'Mjölk', category: 'Mejeri', checked: true, checkedAt: '2026-07-04T10:00:00' },
    { name: 'Mjölk', category: 'Mejeri', checked: true, checkedAt: '2026-07-09T10:00:00' },
    { name: 'Mjölk', category: 'Mejeri', checked: true, checkedAt: '2026-07-14T10:00:00' },
    // Kaffe bought once -> not enough signal.
    { name: 'Kaffe', category: 'Dryck', checked: true, checkedAt: '2026-07-10T10:00:00' },
  ];

  it('suggests a regularly-bought item that is now due', () => {
    const s = restockSuggestions(items, NOW);
    const milk = s.find(x => x.name === 'Mjölk');
    expect(milk).toBeTruthy();
    expect(milk.intervalDays).toBe(5);
    expect(milk.daysSince).toBe(6);
  });

  it('ignores items with too few purchases', () => {
    expect(restockSuggestions(items, NOW).find(x => x.name === 'Kaffe')).toBeUndefined();
  });

  it('excludes items already on the list', () => {
    const withActive = [...items, { name: 'Mjölk', category: 'Mejeri', checked: false }];
    expect(restockSuggestions(withActive, NOW).find(x => x.name === 'Mjölk')).toBeUndefined();
  });

  it('does not suggest when not due yet', () => {
    const notDue = restockSuggestions(items, new Date('2026-07-15T12:00:00').getTime());
    expect(notDue.find(x => x.name === 'Mjölk')).toBeUndefined();
  });
});
