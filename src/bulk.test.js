import { describe, it, expect } from 'vitest';
import { parseBulkItems, looksLikeUrl, extractIngredientsFromText, shoppingProgress } from './categorization.js';

describe('parseBulkItems', () => {
  it('splits a pasted multi-line list and strips quantities/bullets', () => {
    const text = '2 äpplen\nMjölk\n- Bröd\n1 kg pasta';
    expect(parseBulkItems(text)).toEqual(['Äpplen', 'Mjölk', 'Bröd', 'Pasta']);
  });

  it('splits on commas and semicolons', () => {
    expect(parseBulkItems('ägg, mjölk; bröd')).toEqual(['Ägg', 'Mjölk', 'Bröd']);
  });

  it('strips numbered list markers and units', () => {
    expect(parseBulkItems('1. 3 st ägg\n2) 2 dl grädde')).toEqual(['Ägg', 'Grädde']);
  });

  it('dedupes case/accent-insensitively', () => {
    expect(parseBulkItems('Mjölk, mjölk, MJÖLK')).toEqual(['Mjölk']);
  });

  it('keeps "och" intact for typed input (default)', () => {
    expect(parseBulkItems('gott och blandat')).toEqual(['Gott och blandat']);
  });

  it('splits on "och"/"samt" only when conjunctions:true (voice)', () => {
    expect(parseBulkItems('mjölk och ägg samt bröd', { conjunctions: true }))
      .toEqual(['Mjölk', 'Ägg', 'Bröd']);
  });

  it('ignores empty fragments and pure numbers', () => {
    expect(parseBulkItems('  ,,, \n 5 \n')).toEqual([]);
    expect(parseBulkItems('')).toEqual([]);
    expect(parseBulkItems(null)).toEqual([]);
  });

  it('capitalises the first letter of each item', () => {
    expect(parseBulkItems('banan\navokado')).toEqual(['Banan', 'Avokado']);
  });
});

describe('looksLikeUrl', () => {
  it('recognises http(s) links and rejects plain text', () => {
    expect(looksLikeUrl('https://ica.se/recept/pasta')).toBe(true);
    expect(looksLikeUrl('http://example.com/x')).toBe(true);
    expect(looksLikeUrl('  https://coop.se/recept ')).toBe(true);
    expect(looksLikeUrl('mjölk, ägg')).toBe(false);
    expect(looksLikeUrl('ica.se')).toBe(false); // no scheme
    expect(looksLikeUrl('')).toBe(false);
  });
});

describe('extractIngredientsFromText', () => {
  const recipe = [
    '# Krämig pasta',
    '4 portioner',
    '## Ingredienser',
    '- 400 g pasta',
    '- 2 dl grädde',
    '* 1 gul lök',
    'salt',
    '',
    '## Gör så här',
    '1. Koka pastan',
    '2. Blanda i grädden',
  ].join('\n');

  it('pulls the ingredient section and cleans it', () => {
    expect(extractIngredientsFromText(recipe)).toEqual(['Pasta', 'Grädde', 'Gul lök', 'Salt']);
  });

  it('stops at the instructions and skips portions/headings', () => {
    const out = extractIngredientsFromText(recipe);
    expect(out).not.toContain('Portioner');
    expect(out).not.toContain('Koka pastan');
  });

  it('returns [] when there is no ingredient section', () => {
    expect(extractIngredientsFromText('Bara lite text utan lista')).toEqual([]);
    expect(extractIngredientsFromText('')).toEqual([]);
  });
});

describe('shoppingProgress', () => {
  const NOW = new Date('2026-07-14T18:00:00').getTime();
  const items = [
    { name: 'A', checked: false },                                   // remaining
    { name: 'B', checked: false },                                   // remaining
    { name: 'C', checked: true, checkedAt: '2026-07-14T09:00:00' },  // done today
    { name: 'D', checked: true, checkedAt: '2026-07-10T09:00:00' },  // bought earlier (excluded)
    { name: 'E', checked: true },                                    // no timestamp (excluded)
  ];

  it('scopes to today: excludes items bought on other days', () => {
    const p = shoppingProgress(items, NOW);
    expect(p.remaining).toBe(2);
    expect(p.doneToday).toBe(1);
    expect(p.total).toBe(3);
    expect(p.pct).toBe(33);
  });

  it('is 0% for a fresh trip and 100% when nothing remains', () => {
    expect(shoppingProgress([{ checked: false }], NOW)).toMatchObject({ pct: 0, remaining: 1 });
    expect(shoppingProgress([{ checked: true, checkedAt: '2026-07-14T10:00:00' }], NOW))
      .toMatchObject({ pct: 100, remaining: 0, doneToday: 1 });
  });

  it('reports total 0 when only historical items exist (bar hidden)', () => {
    expect(shoppingProgress([{ checked: true, checkedAt: '2026-07-01T10:00:00' }], NOW).total).toBe(0);
  });
});
