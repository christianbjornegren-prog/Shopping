import { describe, it, expect } from 'vitest';
import { shouldTryLegacyPickup, DONE, RETRY_AFTER_MS } from './legacyPickup.js';

const NOW = Date.parse('2026-09-05T20:00:00.000Z');

describe('hämtning från den gamla Inköp-platsen', () => {
  it('försöker när ingenting har prövats än', () => {
    expect(shouldTryLegacyPickup(null, NOW)).toBe(true);
  });

  it('slutar helt när det är avklarat', () => {
    expect(shouldTryLegacyPickup(DONE, NOW)).toBe(false);
  });

  it('tjatar inte vid varje start', () => {
    const nyss = new Date(NOW - 60 * 1000).toISOString();
    expect(shouldTryLegacyPickup(nyss, NOW)).toBe(false);
  });

  it('provar igen ett dygn senare, så inklistrade regler fångas upp av sig själva', () => {
    const igar = new Date(NOW - RETRY_AFTER_MS - 1000).toISOString();
    expect(shouldTryLegacyPickup(igar, NOW)).toBe(true);
  });

  it('provar igen om det som ligger sparat är skräp', () => {
    expect(shouldTryLegacyPickup('inte ett datum', NOW)).toBe(true);
  });
});
