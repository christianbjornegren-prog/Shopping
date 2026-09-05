import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

// ---------------------------------------------------------------------------
// A stand-in Firestore: one shared document store, live listeners, and
// transactions with a real async round-trip. This is what lets us exercise the
// sync hook end-to-end — the part that could never be tested against the real
// backend from here, and where the list-wiping bug slipped through twice.
// ---------------------------------------------------------------------------
const server = {
  docs: new Map(),
  listeners: new Map(),
  failNextTransaction: false,
  failAll: false,          // "no signal": every transaction fails
  delayMs: 0,              // slow network
  inFlight: 0,
  maxInFlight: 0,
  writes: 0,

  reset() {
    this.docs.clear();
    this.listeners.clear();
    this.failNextTransaction = false;
    this.failAll = false;
    this.delayMs = 0;
    this.inFlight = 0;
    this.maxInFlight = 0;
    this.writes = 0;
  },
  put(path, data) {
    this.docs.set(path, JSON.parse(JSON.stringify(data)));
  },
  snapshotFor(path, fromCache = false) {
    const data = this.docs.get(path);
    return {
      exists: () => data !== undefined,
      data: () => JSON.parse(JSON.stringify(data)),
      metadata: { fromCache },
    };
  },
  // Push the current document to every subscriber (as Firestore does after a
  // write, and once when you subscribe).
  emit(path, fromCache = false) {
    (this.listeners.get(path) || new Set()).forEach(fn => fn(this.snapshotFor(path, fromCache)));
  },
};

vi.mock('./firebase', () => ({ db: { __fake: true }, auth: {}, googleProvider: {} }));

vi.mock('firebase/firestore', () => ({
  doc: (_db, ...parts) => ({ path: parts.join('/') }),
  onSnapshot: (ref, onNext) => {
    if (!server.listeners.has(ref.path)) server.listeners.set(ref.path, new Set());
    server.listeners.get(ref.path).add(onNext);
    return () => server.listeners.get(ref.path)?.delete(onNext);
  },
  runTransaction: async (_db, fn) => {
    server.inFlight += 1;
    server.maxInFlight = Math.max(server.maxInFlight, server.inFlight);
    try {
      if (server.failAll || server.failNextTransaction) {
        server.failNextTransaction = false;
        await new Promise(r => setTimeout(r, server.delayMs));
        throw new Error('unavailable');
      }
      const pendingWrites = [];
      const tx = {
        // A real transaction hits the network before the callback continues.
        get: async (ref) => {
          await new Promise(r => setTimeout(r, server.delayMs));
          return server.snapshotFor(ref.path);
        },
        set: (ref, data) => pendingWrites.push([ref.path, data]),
      };
      const result = await fn(tx);
      pendingWrites.forEach(([path, data]) => {
        server.writes += 1;
        server.put(path, data);
        server.emit(path);
      });
      return result;
    } finally {
      server.inFlight -= 1;
    }
  },
}));

const { useSyncedList } = await import('./useSyncedList.js');
const { getLog, clearLog } = await import('./syncLog.js');

const PATH = ['lists', 'L1'];
const KEY = 'lists/L1';
const makeEmpty = () => ({ items: [] });
const item = (id, extra = {}) => ({
  id,
  name: `Vara ${id}`,
  checked: false,
  addedAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  ...extra,
});
const many = (n) => Array.from({ length: n }, (_, i) => item(i + 1));
const serverItems = () => server.docs.get(KEY)?.items ?? [];

// Subscribe delivery is async in Firestore; mimic that.
const deliverInitialSnapshot = () => server.emit(KEY);

beforeEach(() => { server.reset(); localStorage.clear(); });
// Vitest runs without `globals`, so Testing Library's automatic unmount does
// not kick in. Without this, hooks from earlier tests stay mounted with live
// retry timers and write their stale lists into later tests' fake server.
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('useSyncedList – laddning', () => {
  it('hämtar serverns lista vid start', async () => {
    server.put(KEY, { items: many(3) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty));

    await act(async () => { deliverInitialSnapshot(); });

    expect(result.current[0].items).toHaveLength(3);
  });

  it('skriver ingenting när ingenting har ändrats', async () => {
    server.put(KEY, { items: many(3) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty));

    await act(async () => { deliverInitialSnapshot(); });
    await new Promise(r => setTimeout(r, 900)); // past the save debounce

    expect(server.writes).toBe(0);
    expect(result.current[0].items).toHaveLength(3);
  });
});

describe('REGRESSION: kapplöpningen som raderade allt', () => {
  it('sparning som utlöses innan React hunnit rendera raderar inte listan', async () => {
    server.put(KEY, { items: many(40) });
    renderHook(() => useSyncedList(PATH, makeEmpty));

    // Snapshot levereras UTAN act(): tillståndet är köat men inte applicerat —
    // exakt läget där den gamla koden såg en tom lista och skrev över servern.
    deliverInitialSnapshot();
    // Appen bakgrundas i just den luckan och tvingar fram en sparning.
    window.dispatchEvent(new Event('pagehide'));

    await act(async () => { await new Promise(r => setTimeout(r, 300)); });

    expect(serverItems()).toHaveLength(40);
  });

  it('en klient som fortfarande har varorna lägger tillbaka dem', async () => {
    server.put(KEY, { items: many(20) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty));
    await act(async () => { deliverInitialSnapshot(); });
    expect(result.current[0].items).toHaveLength(20);

    // Servern töms av något annat (t.ex. en trasig klient).
    await act(async () => {
      server.put(KEY, { items: [] });
      server.emit(KEY);
    });

    await waitFor(() => expect(serverItems()).toHaveLength(20), { timeout: 3000 });
    expect(result.current[0].items).toHaveLength(20);
  });
});

describe('REGRESSION: vara tillagd innan listan hunnit ladda', () => {
  it('överlever att inloggningen blir klar och hamnar på servern', async () => {
    server.put(KEY, { items: many(2) });

    // Appen startar innan auth hunnit ge oss ett listId (path = null).
    const { result, rerender } = renderHook(
      ({ p }) => useSyncedList(p, makeEmpty),
      { initialProps: { p: null } }
    );

    // Användaren hinner skriva in en vara under de sekunderna.
    act(() => {
      result.current[1](prev => ({ ...prev, items: [...prev.items, item(99, { name: 'Kyckling' })] }));
    });
    expect(result.current[0].items).toHaveLength(1);

    // Inloggningen blir klar och listan börjar synka.
    rerender({ p: PATH });
    await act(async () => { deliverInitialSnapshot(); });

    // Varan finns kvar – och serverns två varor har kommit in.
    expect(result.current[0].items.some(i => i.name === 'Kyckling')).toBe(true);
    expect(result.current[0].items).toHaveLength(3);
    await waitFor(() => expect(serverItems().some(i => i.id === 99)).toBe(true), { timeout: 3000 });
  });

  it('men utloggning tömmer fortfarande listan lokalt', async () => {
    server.put(KEY, { items: many(2) });
    const { result, rerender } = renderHook(
      ({ p }) => useSyncedList(p, makeEmpty),
      { initialProps: { p: PATH } }
    );
    await act(async () => { deliverInitialSnapshot(); });
    expect(result.current[0].items).toHaveLength(2);

    rerender({ p: null });
    expect(result.current[0].items).toHaveLength(0);
  });

  it('signalerar när listan är laddad, så tomt inte förväxlas med dataförlust', async () => {
    server.put(KEY, { items: many(2) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));

    expect(result.current[2].ready).toBe(false);
    expect(result.current[2].phase).toBe('loading');

    await act(async () => { deliverInitialSnapshot(); });

    expect(result.current[2].ready).toBe(true);
    expect(result.current[2].phase).toBe('synced');
    expect(result.current[2].lastSyncAt).toBeTruthy();
  });

  it('skriver läsbara rader i driftloggen', async () => {
    localStorage.clear();
    clearLog();
    server.put(KEY, { items: many(2) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));
    await act(async () => { deliverInitialSnapshot(); });

    expect(getLog()[0].message).toBe('Matvaror: ansluten till servern – 2 varor');

    act(() => {
      result.current[1](prev => ({ ...prev, items: [...prev.items, item(99)] }));
    });
    await waitFor(() => expect(getLog()[0].message).toContain('sparade'), { timeout: 3000 });
    expect(getLog()[0].message).toBe('Matvaror: sparade – 3 varor');
  });

  it('loggar när nätet fallerar och när skyddsnätet går in', async () => {
    localStorage.clear();
    clearLog();
    server.put(KEY, { items: many(20) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));
    await act(async () => { deliverInitialSnapshot(); });

    // Servern töms av något annat -> skyddsnätet ska stoppa det och logga.
    await act(async () => {
      server.put(KEY, { items: [] });
      server.emit(KEY);
    });
    await waitFor(
      () => expect(getLog().some(e => e.message.includes('skyddsnätet stoppade'))).toBe(true),
      { timeout: 3000 }
    );
    expect(result.current[0].items).toHaveLength(20);

    // Ett nätverksfel ska synas som ett läsbart fel.
    server.failNextTransaction = true;
    act(() => {
      result.current[1](prev => ({ ...prev, items: [...prev.items, item(500)] }));
    });
    await waitFor(
      () => expect(getLog().some(e => e.level === 'error' && e.message.includes('kunde inte spara'))).toBe(true),
      { timeout: 3000 }
    );
    expect(result.current[2].phase).toBe('error');
  });
});

describe('REGRESSION: Granola kom tillbaka – ändring i butik utan täckning', () => {
  const GRANOLA = item(1, { name: 'Granola' });
  const MJOLK = item(2, { name: 'Mjölk' });

  it('en ändring gjord utan täckning överlever att appen stängs, och sparas sedan', async () => {
    server.put(KEY, { items: [GRANOLA, MJOLK] });
    const first = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));
    await act(async () => { deliverInitialSnapshot(); });
    expect(first.result.current[0].items).toHaveLength(2);

    // Inne i butiken: en plupp. Varje sparning misslyckas.
    server.failAll = true;
    act(() => {
      first.result.current[1](prev => ({
        ...prev,
        items: [...prev.items.filter(i => i.name !== 'Granola'), item(3, { name: 'Fryspåsar' })],
      }));
    });
    await act(async () => { await new Promise(r => setTimeout(r, 900)); });
    expect(first.result.current[2].phase).toBe('error');
    expect(serverItems().some(i => i.name === 'Granola')).toBe(true); // servern vet inget än

    // Appen stängs.
    first.unmount();

    // Appen öppnas igen (fortfarande utan täckning).
    const second = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));
    const names = second.result.current[0].items.map(i => i.name);
    expect(names).toContain('Fryspåsar');
    expect(names).not.toContain('Granola');   // <- det som gick fel förut
    expect(getLog().some(e => e.message.includes('återställde osparade ändringar'))).toBe(true);

    // Serverns snapshot (som fortfarande har Granola) får INTE återuppliva den.
    await act(async () => { deliverInitialSnapshot(); });
    expect(second.result.current[0].items.map(i => i.name)).not.toContain('Granola');

    // Ute ur butiken: täckning igen -> sparas.
    server.failAll = false;
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await new Promise(r => setTimeout(r, 100));
    });
    await waitFor(() => expect(serverItems().map(i => i.name).sort()).toEqual(['Fryspåsar', 'Mjölk']), { timeout: 4000 });

    // Och den lokala kopian är städad när allt är sparat.
    expect(localStorage.getItem('chrelin:pending:' + KEY)).toBeNull();
  }, 15000); // long end-to-end story with real timers

  it('en avbockning utan täckning överlever också', async () => {
    server.put(KEY, { items: [GRANOLA, MJOLK] });
    const first = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));
    await act(async () => { deliverInitialSnapshot(); });

    server.failAll = true;
    act(() => {
      first.result.current[1](prev => ({
        ...prev,
        items: prev.items.map(i => i.name === 'Mjölk'
          ? { ...i, checked: true, checkedAt: '2026-09-05T17:10:00.000Z', updatedAt: '2026-09-05T17:10:00.000Z' }
          : i),
      }));
    });
    await act(async () => { await new Promise(r => setTimeout(r, 900)); });
    first.unmount();

    const second = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));
    expect(second.result.current[0].items.find(i => i.name === 'Mjölk')?.checked).toBe(true);

    server.failAll = false;
    await act(async () => { deliverInitialSnapshot(); });
    await waitFor(() => expect(serverItems().find(i => i.name === 'Mjölk')?.checked).toBe(true), { timeout: 4000 });
  });

  it('kör aldrig två sparningar samtidigt, och tappar inte ändringar under en långsam', async () => {
    server.put(KEY, { items: [MJOLK] });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));
    await act(async () => { deliverInitialSnapshot(); });

    server.delayMs = 400; // trögt nät
    act(() => { result.current[1](prev => ({ ...prev, items: [...prev.items, item(10, { name: 'A' })] })); });
    await act(async () => { await new Promise(r => setTimeout(r, 700)); }); // första transaktionen är igång
    act(() => { result.current[1](prev => ({ ...prev, items: [...prev.items, item(11, { name: 'B' })] })); });
    act(() => { result.current[1](prev => ({ ...prev, items: [...prev.items, item(12, { name: 'C' })] })); });

    await waitFor(
      () => expect(serverItems().map(i => i.name).sort()).toEqual(['A', 'B', 'C', 'Mjölk']),
      { timeout: 6000 }
    );
    expect(server.maxInFlight).toBe(1);
  });

  it('skräpar inte ner lagringen med tomma tillstånd', async () => {
    server.put(KEY, { items: many(2) });
    const { unmount } = renderHook(() => useSyncedList(PATH, makeEmpty, 'Matvaror'));
    // Appen stängs innan första snapshoten hunnit fram – inget att spara.
    unmount();
    expect(localStorage.getItem('chrelin:pending:' + KEY)).toBeNull();
  });
});

describe('useSyncedList – vanlig användning', () => {
  it('sparar en tillagd vara', async () => {
    server.put(KEY, { items: many(2) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty));
    await act(async () => { deliverInitialSnapshot(); });

    act(() => {
      result.current[1](prev => ({ ...prev, items: [...prev.items, item(99)] }));
    });

    await waitFor(() => expect(serverItems()).toHaveLength(3), { timeout: 3000 });
    expect(serverItems().some(i => i.id === 99)).toBe(true);
  });

  it('sparar en avbockning', async () => {
    server.put(KEY, { items: many(2) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty));
    await act(async () => { deliverInitialSnapshot(); });

    act(() => {
      result.current[1](prev => ({
        ...prev,
        items: prev.items.map(i => i.id === 1
          ? { ...i, checked: true, checkedAt: '2026-07-09T10:00:00.000Z', updatedAt: '2026-07-09T10:00:00.000Z' }
          : i),
      }));
    });

    await waitFor(() => expect(serverItems().find(i => i.id === 1)?.checked).toBe(true), { timeout: 3000 });
  });

  it('raderar en vara i taget', async () => {
    server.put(KEY, { items: many(3) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty));
    await act(async () => { deliverInitialSnapshot(); });

    act(() => {
      result.current[1](prev => ({ ...prev, items: prev.items.filter(i => i.id !== 2) }));
    });

    await waitFor(() => expect(serverItems()).toHaveLength(2), { timeout: 3000 });
    expect(serverItems().some(i => i.id === 2)).toBe(false);
  });

  it('två enheter: den enas avbockning syns hos den andra', async () => {
    server.put(KEY, { items: many(2) });
    const phoneA = renderHook(() => useSyncedList(PATH, makeEmpty));
    const phoneB = renderHook(() => useSyncedList(PATH, makeEmpty));
    await act(async () => { deliverInitialSnapshot(); });

    act(() => {
      phoneA.result.current[1](prev => ({
        ...prev,
        items: prev.items.map(i => i.id === 1
          ? { ...i, checked: true, checkedAt: '2026-07-09T12:00:00.000Z', updatedAt: '2026-07-09T12:00:00.000Z' }
          : i),
      }));
    });

    await waitFor(
      () => expect(phoneB.result.current[0].items.find(i => i.id === 1)?.checked).toBe(true),
      { timeout: 3000 }
    );
  });

  it('behåller ändringen när nätet fallerar och försöker igen', async () => {
    server.put(KEY, { items: many(1) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty));
    await act(async () => { deliverInitialSnapshot(); });

    server.failNextTransaction = true;
    act(() => {
      result.current[1](prev => ({ ...prev, items: [...prev.items, item(77)] }));
    });

    // Första försöket misslyckas – men ändringen finns kvar lokalt.
    await act(async () => { await new Promise(r => setTimeout(r, 900)); });
    expect(result.current[0].items.some(i => i.id === 77)).toBe(true);

    // "Nätet är tillbaka" -> flush, och nu går skrivningen igenom.
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await new Promise(r => setTimeout(r, 200));
    });
    await waitFor(() => expect(serverItems().some(i => i.id === 77)).toBe(true), { timeout: 3000 });
  });

  it('skriver inte i en ändlös loop', async () => {
    server.put(KEY, { items: many(2) });
    const { result } = renderHook(() => useSyncedList(PATH, makeEmpty));
    await act(async () => { deliverInitialSnapshot(); });

    act(() => {
      result.current[1](prev => ({ ...prev, items: [...prev.items, item(5)] }));
    });
    await waitFor(() => expect(serverItems()).toHaveLength(3), { timeout: 3000 });

    const after = server.writes;
    await new Promise(r => setTimeout(r, 1200));
    expect(server.writes).toBe(after); // echoet från vår egen skrivning ger inga fler
  });
});
