import { describe, it, expect } from 'vitest';
import { parseBulkItems } from './categorization.js';

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
