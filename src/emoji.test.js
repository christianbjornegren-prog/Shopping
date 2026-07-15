import { describe, it, expect } from 'vitest';
import { getItemEmoji, groceryDB, categoryMeta } from './categorization';

describe('getItemEmoji – product-specific emojis', () => {
  it('gives chicken its own emoji, not the meat-category emoji', () => {
    expect(getItemEmoji('Kycklingfilé', 'Kött & Fisk')).toBe('🍗');
    expect(getItemEmoji('Kycklingfilé', 'Kött & Fisk')).not.toBe(categoryMeta['Kött & Fisk'].emoji);
  });

  it('gives butter its own emoji, not the milk-glass category emoji', () => {
    expect(getItemEmoji('Smör', 'Mejeri')).toBe('🧈');
    expect(getItemEmoji('Smör', 'Mejeri')).not.toBe(categoryMeta['Mejeri'].emoji);
  });

  it('resolves via alias (Bregott → Smör → 🧈)', () => {
    expect(getItemEmoji('Bregott', 'Mejeri')).toBe('🧈');
  });

  it('is accent/case-insensitive', () => {
    expect(getItemEmoji('tomatpuré', 'Skafferi')).toBe('🍅');
    expect(getItemEmoji('TOMATPURE', 'Skafferi')).toBe('🍅');
  });
});

describe('getItemEmoji – keyword fallback (free text & compounds)', () => {
  it('resolves free-text items that are not exact DB entries', () => {
    expect(getItemEmoji('Ananas', 'Frukt & Grönt')).toBe('🍍');
    expect(getItemEmoji('Baguette', 'Bröd & Bakelser')).toBe('🥖');
    expect(getItemEmoji('Havrepuffar', 'Skafferi')).toBe('🥣');
    expect(getItemEmoji('Chips', 'Godis & Snacks')).toBe('🥔');
    expect(getItemEmoji('Räkmacka', 'Bröd & Bakelser')).toBe('🥪');
  });

  it('resolves compound words via their head noun (suffix/prefix)', () => {
    expect(getItemEmoji('Frysta köttbullar', 'Fryst')).toBe('🍖');
    expect(getItemEmoji('Kokosmjölk', 'Skafferi')).toBe('🥥');
    expect(getItemEmoji('Fläskfilé', 'Kött & Fisk')).toBe('🥩');
    expect(getItemEmoji('Kycklinglårfilé', 'Kött & Fisk')).toBe('🍗');
  });

  it('prefers the specific term over the generic one it contains', () => {
    expect(getItemEmoji('Vitlök', 'Frukt & Grönt')).toBe('🧄'); // not 🧅
    expect(getItemEmoji('Blomkål', 'Frukt & Grönt')).toBe('🥦');
    expect(getItemEmoji('Vattenmelon', 'Frukt & Grönt')).toBe('🍉'); // not 🍈 / 💧
    expect(getItemEmoji('Pepparkakor', 'Godis & Snacks')).toBe('🍪'); // not 🧂
    expect(getItemEmoji('Sparris', 'Frukt & Grönt')).toBe('🥬'); // not 🍚 (ris)
  });

  it('does not mis-match on dangerous substrings', () => {
    expect(getItemEmoji('Nappflaska', 'Hushåll')).toBe('🍼'); // "lask" must not hit
    expect(getItemEmoji('Vattenflaska', 'Hushåll')).toBe('💧');
    expect(getItemEmoji('Läsk', 'Dryck')).toBe('🥤');
    expect(getItemEmoji('Soppåsar', 'Hushåll')).toBe('🗑️'); // not 🍲 (soppa)
    expect(getItemEmoji('Disksvamp', 'Hushåll')).toBe('🧽'); // not 🍄 (svamp)
  });

  it('treats any "ost" word as cheese, without false positives', () => {
    // The reported bug: cheese fell through to the Mejeri milk-glass emoji.
    expect(getItemEmoji('Hushållsost', 'Mejeri')).toBe('🧀');
    expect(getItemEmoji('Grillost', 'Mejeri')).toBe('🧀');
    expect(getItemEmoji('Getost', 'Mejeri')).toBe('🧀');
    expect(getItemEmoji('Prästost', 'Mejeri')).toBe('🧀');
    expect(getItemEmoji('Riven ost', 'Mejeri')).toBe('🧀');
    expect(getItemEmoji('Hushållsost', 'Mejeri')).not.toBe(categoryMeta['Mejeri'].emoji);
    // "ost" must NOT hit words that merely contain it mid/other-position:
    expect(getItemEmoji('Rostbröd', 'Bröd & Bakelser')).toBe('🍞');
    expect(getItemEmoji('Rostbiff', 'Kött & Fisk')).toBe('🥩');
    expect(getItemEmoji('Ostron', 'Kött & Fisk')).toBe('🦪'); // oyster, not cheese
    expect(getItemEmoji('Rostade cashewnötter', 'Godis & Snacks')).toBe('🥜');
  });
});

describe('getItemEmoji – fallbacks', () => {
  it('falls back to the category emoji for a truly unknown item', () => {
    expect(getItemEmoji('Presentkort', 'Övrigt')).toBe(categoryMeta['Övrigt'].emoji);
  });

  it('falls back to Osorterat for an uncategorised unknown item', () => {
    expect(getItemEmoji('Xyzzy blipp', '')).toBe(categoryMeta['Osorterat'].emoji);
  });
});

describe('groceryDB emoji integrity', () => {
  it('every emoji that is set is a non-empty string', () => {
    for (const p of groceryDB) {
      if ('emoji' in p) {
        expect(typeof p.emoji).toBe('string');
        expect(p.emoji.length).toBeGreaterThan(0);
      }
    }
  });
});
