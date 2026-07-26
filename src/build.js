import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { STORES } from './lib/stores.js';
import { GAMES } from './lib/schema.js';
import { buildIcs } from './lib/ics.js';

const DATA_DIR = new URL('../data/', import.meta.url);
const DIST_DIR = new URL('../dist/', import.meta.url);
const WINDOW_DAYS = 60;

const now = new Date();

// ---- load per-source data ----
const sources = {};
for (const f of (await readdir(DATA_DIR)).filter(f => f.endsWith('.json'))) {
  const rec = JSON.parse(await readFile(new URL(f, DATA_DIR), 'utf8'));
  sources[rec.source] = rec;
}

// ---- merge stores; fold games-hub organizers matching a known store ----
const stores = structuredClone(STORES);
const storeRemap = {};
for (const rec of Object.values(sources)) {
  for (const [id, st] of Object.entries(rec.stores || {})) {
    const known = Object.entries(STORES).find(([, k]) =>
      k.name.localeCompare(st.name, 'cs', { sensitivity: 'base' }) === 0 ||
      k.address.split(',')[0].toLowerCase() === (st.address || '').split(',')[0].toLowerCase());
    if (known) storeRemap[id] = known[0];
    else stores[id] = st;
  }
}

// ---- merge, window, dedupe, sort ----
const cutoff = new Date(now.getTime() + WINDOW_DAYS * 86400000);
const merged = new Map(); // dedupe key -> event
const NATIVE = ['najada', 'onyx', 'cernyrytir']; // preferred over aggregator data
for (const rec of Object.values(sources)) {
  for (const ev of rec.events) {
    const e = { ...ev, storeId: storeRemap[ev.storeId] || ev.storeId };
    const start = new Date(e.start);
    if (isNaN(start) || start < now || start > cutoff) continue;
    const key = `${e.storeId}|${e.start.slice(0, 13)}|${e.game}`;
    const existing = merged.get(key);
    if (existing && NATIVE.includes(existing.id.split(':')[0]) && !NATIVE.includes(e.id.split(':')[0])) continue;
    merged.set(key, e);
  }
}
const events = [...merged.values()].sort((a, b) => a.start.localeCompare(b.start));

// ---- source status for the UI ----
const status = Object.fromEntries(Object.entries(sources).map(([id, r]) => [id, {
  status: r.status,
  fetchedAt: r.fetchedAt || null,
  note: r.note || r.error || null,
  eventCount: r.events.length,
}]));

const payload = {
  generatedAt: now.toISOString(),
  windowDays: WINDOW_DAYS,
  stores,
  sources: status,
  games: GAMES,
  events,
};

// ---- write dist ----
await mkdir(DIST_DIR, { recursive: true });
await writeFile(new URL('events.json', DIST_DIR), JSON.stringify(payload, null, 1));
await writeFile(new URL('.nojekyll', DIST_DIR), '');

const template = await readFile(new URL('template.html', import.meta.url), 'utf8');
await writeFile(new URL('index.html', DIST_DIR),
  template.replace('/*__DATA__*/null', () => JSON.stringify(payload).replace(/</g, '\\u003c')));

await writeFile(new URL('all.ics', DIST_DIR),
  buildIcs(events, { name: 'Prague TCG Events', stores, now }));
const gamesPresent = [...new Set(events.map(e => e.game))];
for (const g of gamesPresent) {
  await writeFile(new URL(`${g}.ics`, DIST_DIR),
    buildIcs(events.filter(e => e.game === g), { name: `Prague TCG Events — ${GAMES[g] || g}`, stores, now }));
}

console.log(`build: ${events.length} events, ${gamesPresent.length} game feeds, ${Object.keys(stores).length} stores`);
