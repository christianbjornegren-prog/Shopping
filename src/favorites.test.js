import { describe, it, expect } from 'vitest';
import { getFavorites } from './categorization';

const history = {
  'Mjölk': { category: 'Mejeri', count: 12 },
  'Runda mackor': { category: '', count: 8 },
  'Kaffe': { category: 'Dryck', count: 5 },
  'Banan': { category: 'Frukt & Grönt', count: 1 },
  'Aldrig köpt': { category: 'Övrigt', count: 0 }
};

describe('getFavorites', () => {
  it('ranks by purchase count, most-bought first', () => {
    const favs = getFavorites(history, []);
    expect(favs.map(f => f.name)).toEqual(['Mjölk', 'Runda mackor', 'Kaffe', 'Banan']);
  });

  it('keeps the couple\'s own terms like "Runda mackor"', () => {
    const favs = getFavorites(history, []);
    expect(favs.find(f => f.name === 'Runda mackor')).toBeTruthy();
  });

  it('excludes items with zero count', () => {
    const favs = getFavorites(history, []);
    expect(favs.find(f => f.name === 'Aldrig köpt')).toBeFalsy();
  });

  it('excludes items already on the (unchecked) list', () => {
    const current = [{ name: 'mjölk', checked: false }];
    const favs = getFavorites(history, current);
    expect(favs.find(f => f.name === 'Mjölk')).toBeFalsy();
  });

  it('still suggests an item that is on the list but already checked off', () => {
    const current = [{ name: 'Mjölk', checked: true }];
    const favs = getFavorites(history, current);
    expect(favs.find(f => f.name === 'Mjölk')).toBeTruthy();
  });

  it('respects the limit', () => {
    expect(getFavorites(history, [], 2).map(f => f.name)).toEqual(['Mjölk', 'Runda mackor']);
  });

  it('handles empty/undefined history', () => {
    expect(getFavorites(undefined, [])).toEqual([]);
    expect(getFavorites({}, [])).toEqual([]);
  });

  it('carries the category through for one-click categorised adds', () => {
    const favs = getFavorites(history, []);
    expect(favs.find(f => f.name === 'Mjölk').category).toBe('Mejeri');
  });
});
