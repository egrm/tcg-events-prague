import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { scrapeNajada } from './scrapers/najada.js';
import { scrapeOnyx } from './scrapers/onyx.js';
import { scrapeGamesHub } from './scrapers/gameshub.js';
import { scrapeCernyRytir } from './scrapers/cernyrytir.js';
import { scrapePlayzone } from './scrapers/playzone.js';
import { scrapeWizards } from './scrapers/wizards.js';

const DATA_DIR = new URL('../data/', import.meta.url);

// A source that "succeeds" with far fewer events than usual most likely
// broke silently (page structure change) — keep its previous data instead.
const SUSPECT_MIN = { najada: 5, onyx: 2, gameshub: 0, cernyrytir: 0, playzone: 0, wizards: 3 };

const SOURCES = {
  najada: async () => ({ events: await scrapeNajada() }),
  onyx: async () => ({ events: await scrapeOnyx() }),
  gameshub: () => scrapeGamesHub(),
  cernyrytir: () => scrapeCernyRytir(),
  playzone: async () => ({ events: await scrapePlayzone() }),
  wizards: () => scrapeWizards(),
};

async function readPrevious(id) {
  try {
    return JSON.parse(await readFile(new URL(`${id}.json`, DATA_DIR), 'utf8'));
  } catch {
    return null;
  }
}

await mkdir(DATA_DIR, { recursive: true });
let failures = 0;

for (const [id, run] of Object.entries(SOURCES)) {
  const prev = await readPrevious(id);
  let record;
  try {
    const { events, stores, pending } = await run();
    if (pending) {
      record = { status: 'pending', note: pending, events: [] };
    } else if (events.length < SUSPECT_MIN[id] && prev?.events?.length > events.length) {
      record = { ...prev, status: 'suspect', note: `Got ${events.length} events, previously ${prev.events.length}; kept previous data` };
      failures++;
    } else {
      record = { status: 'ok', events, ...(stores ? { stores } : {}) };
    }
    record.fetchedAt = new Date().toISOString();
  } catch (err) {
    record = { ...(prev || { events: [] }), status: 'error', error: String(err), fetchedAt: prev?.fetchedAt };
    failures++;
  }
  record.source = id;
  await writeFile(new URL(`${id}.json`, DATA_DIR), JSON.stringify(record, null, 1));
  console.log(`${id}: ${record.status}, ${record.events.length} events${record.error ? ` (${record.error})` : ''}`);
}

// Exit non-zero only if everything failed — partial data should still deploy.
if (failures === Object.keys(SOURCES).length) {
  console.error('All sources failed');
  process.exit(1);
}
