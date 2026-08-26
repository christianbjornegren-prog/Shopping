// A small, readable operations log.
//
// The point is trust: when something looks wrong you should be able to open
// the app and see, in plain Swedish, what it actually did — and it must
// survive a restart, because that is exactly when you want to look.

const STORAGE_KEY = 'chrelin:driftlogg';
export const LOG_LIMIT = 200;

let entries = null;          // newest first
const listeners = new Set();

const readStorage = () => {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const writeStorage = () => {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (_) {
    // Private mode / quota: the log is a convenience, never a hard dependency.
  }
};

export const getLog = () => {
  if (entries === null) entries = readStorage();
  return entries;
};

// level: 'info' | 'ok' | 'warn' | 'error'
export const logEvent = (level, message) => {
  getLog();
  const entry = { t: new Date().toISOString(), level, message };
  entries = [entry, ...entries].slice(0, LOG_LIMIT);
  writeStorage();
  listeners.forEach(fn => { try { fn(entries); } catch (_) {} });
  return entry;
};

export const subscribeLog = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const clearLog = () => {
  entries = [];
  writeStorage();
  listeners.forEach(fn => { try { fn(entries); } catch (_) {} });
};

// "14:03:22" for today, "23 aug 14:03" for older entries.
export const formatTime = (iso, now = new Date()) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  const pad = (n) => String(n).padStart(2, '0');
  const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  if (sameDay) return clock;
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${clock.slice(0, 5)}`;
};

// Oldest first, for copying out of the app.
export const logToText = (list = getLog()) =>
  list.slice().reverse()
    .map(e => `${e.t}  ${(e.level || 'info').toUpperCase().padEnd(5)} ${e.message}`)
    .join('\n');

// Combine the per-list states into the single badge shown in the header.
// Worst state wins, because that is the one worth surfacing.
const RANK = { error: 4, saving: 3, loading: 2, synced: 1 };
export const combineStatus = (statuses) => {
  const list = (statuses || []).filter(Boolean);
  if (!list.length) return { phase: 'loading', lastSyncAt: null };
  let worst = list[0];
  list.forEach(s => { if ((RANK[s.phase] || 0) > (RANK[worst.phase] || 0)) worst = s; });
  const times = list.map(s => s.lastSyncAt).filter(Boolean).sort();
  return { phase: worst.phase, lastSyncAt: times.length ? times[times.length - 1] : null };
};

export const STATUS_TEXT = {
  loading: 'Hämtar…',
  saving: 'Sparar…',
  synced: 'Synkad',
  error: 'Ingen kontakt',
};
