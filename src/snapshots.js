// Versionshistorik: en ångerknapp för hela listan.
//
// I augusti skrev en bugg en tom lista över flera månaders data, och det fanns
// ingenting att återställa från. Servern hade bara det senaste, och det senaste
// var fel. Därför sparar varje enhet nu en rullande historik över de lägen som
// servern faktiskt har bekräftat. Går något sönder igen ligger gårdagens lista
// kvar på telefonen, och båda telefonerna har varsin uppsättning.
//
// Fri från React och Firebase så logiken kan testas.
import { listSignature } from './sync';

const PREFIX = 'chrelin:versioner:';
export const MAX_SNAPSHOTS = 25;

const read = (path) => {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + path);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(e => e && Array.isArray(e.items)) : [];
  } catch (_) {
    return [];
  }
};

// Newest first, which is both how they are shown and how they are pruned.
export const readSnapshots = (path) => read(path);

const write = (path, entries) => {
  try {
    globalThis.localStorage?.setItem(PREFIX + path, JSON.stringify(entries));
    return true;
  } catch (_) {
    // Quota: keep the recent half rather than losing the history entirely.
    try {
      const half = entries.slice(0, Math.max(3, Math.floor(entries.length / 2)));
      globalThis.localStorage?.setItem(PREFIX + path, JSON.stringify(half));
      return true;
    } catch (_) {
      return false;
    }
  }
};

// Drop the version that covers the least unique time, never the newest or the
// oldest. A shopping round produces a burst of confirmations, and without this
// those thirty minutes would push out yesterday's list — exactly the version
// you would want back.
export const thinSnapshots = (entries, max = MAX_SNAPSHOTS) => {
  const out = entries.slice();
  while (out.length > max) {
    let worstIndex = 1;
    let worstSpan = Infinity;
    for (let i = 1; i < out.length - 1; i++) {
      const span = Date.parse(out[i - 1].t) - Date.parse(out[i + 1].t);
      const value = Number.isNaN(span) ? 0 : span;
      if (value < worstSpan) {
        worstSpan = value;
        worstIndex = i;
      }
    }
    out.splice(worstIndex, 1);
  }
  return out;
};

// Record a server-confirmed state. Returns the stored entry, or null when
// there was nothing worth keeping.
export const recordSnapshot = (path, listDoc, now = new Date()) => {
  const items = listDoc?.items || [];
  // An empty list is never worth restoring, and letting one in would push a
  // good version out of the history.
  if (!items.length) return null;

  const entries = read(path);
  const signature = listSignature({ items });
  if (entries.length && listSignature({ items: entries[0].items }) === signature) return null;

  const entry = { t: now.toISOString(), items };
  const next = thinSnapshots([entry, ...entries], MAX_SNAPSHOTS);
  write(path, next);
  return entry;
};

export const clearSnapshots = (path) => {
  try { globalThis.localStorage?.removeItem(PREFIX + path); } catch (_) {}
};

// "idag 19:14" / "igår 08:30" / "3 sep 18:02"
export const describeSnapshot = (iso, now = new Date()) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
      new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000
  );
  if (days === 0) return `idag ${clock}`;
  if (days === 1) return `igår ${clock}`;
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${clock}`;
};
