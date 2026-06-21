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

describe('getItemEmoji – fallbacks', () => {
  it('falls back to the category emoji for a custom/free-text item', () => {
    // The couple's own term has no product emoji → category emoji.
    expect(getItemEmoji('Runda mackor', 'Bröd & Bakelser')).toBe(categoryMeta['Bröd & Bakelser'].emoji);
  });

  it('falls back to the category emoji for a DB product without its own emoji', () => {
    expect(getItemEmoji('Chips', 'Godis & Snacks')).toBe(categoryMeta['Godis & Snacks'].emoji);
  });

  it('falls back to Osorterat for an uncategorised unknown item', () => {
    expect(getItemEmoji('Något helt okänt', '')).toBe(categoryMeta['Osorterat'].emoji);
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
