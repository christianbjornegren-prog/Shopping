import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLog, logEvent, clearLog, formatTime, logToText, combineStatus, LOG_LIMIT, STATUS_TEXT,
} from './syncLog.js';

beforeEach(() => {
  localStorage.clear();
  clearLog();
});

describe('driftloggen', () => {
  it('lägger nyaste händelsen först', () => {
    logEvent('info', 'första');
    logEvent('ok', 'andra');
    expect(getLog()[0].message).toBe('andra');
    expect(getLog()[1].message).toBe('första');
  });

  it('överlever en omstart av appen', () => {
    logEvent('ok', 'Sparade ändringar');
    // Simulera att appen startas om: modulens minne töms, localStorage finns kvar.
    const raw = localStorage.getItem('chrelin:driftlogg');
    expect(raw).toContain('Sparade ändringar');
    expect(JSON.parse(raw)[0].message).toBe('Sparade ändringar');
  });

  it('växer inte i all oändlighet', () => {
    for (let i = 0; i < LOG_LIMIT + 25; i++) logEvent('info', `rad ${i}`);
    expect(getLog()).toHaveLength(LOG_LIMIT);
    expect(getLog()[0].message).toBe(`rad ${LOG_LIMIT + 24}`);
  });

  it('kraschar inte om localStorage är blockerat', () => {
    const original = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('blockerat'); };
    expect(() => logEvent('info', 'test')).not.toThrow();
    localStorage.setItem = original;
  });

  it('går att kopiera ut som text, äldst först', () => {
    logEvent('info', 'ett');
    logEvent('ok', 'två');
    const lines = logToText().split('\n');
    expect(lines[0]).toContain('ett');
    expect(lines[1]).toContain('två');
    expect(lines[1]).toContain('OK');
  });
});

describe('formatTime', () => {
  const now = new Date('2026-08-24T18:00:00');

  it('visar bara klockslag för idag', () => {
    expect(formatTime('2026-08-24T14:03:22', now)).toBe('14:03:22');
  });

  it('visar datum för äldre rader', () => {
    expect(formatTime('2026-08-22T14:03:22', now)).toBe('22 aug 14:03');
  });

  it('klarar skräpindata', () => {
    expect(formatTime('inte ett datum', now)).toBe('');
  });
});

describe('combineStatus', () => {
  it('låter det allvarligaste läget vinna', () => {
    expect(combineStatus([{ phase: 'synced' }, { phase: 'error' }]).phase).toBe('error');
    expect(combineStatus([{ phase: 'synced' }, { phase: 'saving' }]).phase).toBe('saving');
    expect(combineStatus([{ phase: 'synced' }, { phase: 'loading' }]).phase).toBe('loading');
    expect(combineStatus([{ phase: 'synced' }, { phase: 'synced' }]).phase).toBe('synced');
  });

  it('tar den senaste lyckade synkningen', () => {
    const r = combineStatus([
      { phase: 'synced', lastSyncAt: '2026-08-24T10:00:00.000Z' },
      { phase: 'synced', lastSyncAt: '2026-08-24T12:00:00.000Z' },
    ]);
    expect(r.lastSyncAt).toBe('2026-08-24T12:00:00.000Z');
  });

  it('klarar tom indata', () => {
    expect(combineStatus([]).phase).toBe('loading');
    expect(combineStatus(undefined).phase).toBe('loading');
  });
});

describe('combineStatus – nya lägen', () => {
  it('nekad åtkomst väger tyngst, lokal kopia väger tyngre än synkad', () => {
    expect(combineStatus([{ phase: 'error' }, { phase: 'denied' }]).phase).toBe('denied');
    expect(combineStatus([{ phase: 'synced' }, { phase: 'cached' }]).phase).toBe('cached');
    expect(combineStatus([{ phase: 'loading' }, { phase: 'cached' }]).phase).toBe('loading');
  });

  it('har en text för varje läge', () => {
    ['loading', 'cached', 'saving', 'synced', 'error', 'denied'].forEach(p => {
      expect(typeof STATUS_TEXT[p]).toBe('string');
      expect(STATUS_TEXT[p].length).toBeGreaterThan(0);
    });
  });
});
