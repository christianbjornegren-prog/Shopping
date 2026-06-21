import { describe, it, expect } from 'vitest';
import {
  normalize,
  groceryDB,
  findProductCategory,
  resolveAddName
} from './categorization';

describe('normalize', () => {
  it('lowercases and strips Swedish accents', () => {
    expect(normalize('Kål')).toBe('kal');
    expect(normalize('TOMATPURÉ')).toBe('tomatpure');
    expect(normalize('Gräddfil')).toBe('graddfil');
  });
});

describe('findProductCategory – herbs that used to be uncategorised', () => {
  // Regression: koriander/persilja/dill etc. previously fell back to "Osorterat".
  for (const herb of ['koriander', 'persilja', 'dill', 'gräslök', 'basilika', 'timjan', 'rosmarin']) {
    it(`categorises "${herb}" as Frukt & Grönt`, () => {
      expect(findProductCategory(herb)?.category).toBe('Frukt & Grönt');
    });
  }
});

describe('findProductCategory – the "kål" bug', () => {
  it('categorises "kål" as Frukt & Grönt', () => {
    expect(findProductCategory('kål')?.category).toBe('Frukt & Grönt');
  });

  it('never resolves to a Kalamata/olive product', () => {
    const result = findProductCategory('kål');
    // There is no olive entry, and "kål" must not latch onto anything odd.
    expect(result?.category).toBe('Frukt & Grönt');
  });
});

describe('findProductCategory – existing products keep working', () => {
  it('matches "tomatpuré" exactly to Skafferi', () => {
    expect(findProductCategory('tomatpuré')?.category).toBe('Skafferi');
  });

  it('matches the "tomatpure" alias to Skafferi', () => {
    expect(findProductCategory('tomatpure')?.category).toBe('Skafferi');
  });

  it('matches "tryffelsalami" to Kött & Fisk via partial alias', () => {
    expect(findProductCategory('tryffelsalami')?.category).toBe('Kött & Fisk');
  });
});

describe('findProductCategory – tightened fuzzy matching', () => {
  it('does not let a short fragment latch onto a longer product name', () => {
    // "ana" is a substring of "banan" but only 3 chars — below the threshold —
    // so it must NOT partial-match Banan (this is the class of bug behind
    // "kål" previously matching "blomkål").
    expect(findProductCategory('ana')).toBeNull();
  });

  it('returns null for free-text custom names (preserves own language)', () => {
    // "runda mackor" is the couple's own term and must stay uncategorised.
    expect(findProductCategory('runda mackor')).toBeNull();
  });
});

describe('groceryDB integrity', () => {
  it('has unique normalized names', () => {
    const names = groceryDB.map(p => normalize(p.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it('every entry has the required shape', () => {
    for (const p of groceryDB) {
      expect(typeof p.name).toBe('string');
      expect(typeof p.category).toBe('string');
      expect(Array.isArray(p.aliases)).toBe(true);
      expect(Array.isArray(p.keywords)).toBe(true);
    }
  });
});

describe('resolveAddName – Enter never uses the ghost suggestion', () => {
  it('returns the typed text, not the autocomplete ghost', () => {
    expect(resolveAddName('kål', 'Kalamata oliver')).toBe('kål');
    expect(resolveAddName('tomat', 'Tomatpuré')).toBe('tomat');
  });

  it('trims whitespace', () => {
    expect(resolveAddName('  mjölk  ', 'Mjölk')).toBe('mjölk');
  });

  it('handles empty input', () => {
    expect(resolveAddName('', 'Mjölk')).toBe('');
    expect(resolveAddName(null, 'Mjölk')).toBe('');
  });
});
