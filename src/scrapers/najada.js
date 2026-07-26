import { get } from '../lib/fetch.js';
import { canonicalGame } from '../lib/schema.js';
import { pragueISO, pragueParts } from '../lib/time.js';

const API = 'https://najada.games/api/v1/playhouse/tournament/';
const SCHEDULE_URL = 'https://www.najada.games/en/game-club/tournaments';
const PAGE = 50;

/** Map API records to events. Exported for tests. */
export function mapRecords(records) {
  const events = [];
  for (const r of records) {
    if (r.status !== 'SCHEDULED' || !r.published) continue;
    const [y, mo, d] = r.date.split('-').map(Number);
    const [h, mi] = (r.start || '00:00:00').split(':').map(Number);
    const fee = r.entry_credit_fee_czk;
    events.push({
      id: `najada:${r.id}`,
      title: r.name_en || r.name_cz,
      game: canonicalGame(r.game?.name || r.game?.internal_name),
      storeId: 'najada',
      start: pragueISO(y, mo, d, h, mi),
      url: r.link || SCHEDULE_URL,
      format: r.format || undefined,
      price: fee > 0 ? `${Math.round(fee)} Kč` : 'Free',
    });
  }
  return events;
}

export async function scrapeNajada({ now = new Date() } = {}) {
  const p = pragueParts(now);
  const pad = n => String(n).padStart(2, '0');
  const after = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  const records = [];
  for (let offset = 0; ; offset += PAGE) {
    const data = await get(`${API}?limit=${PAGE}&offset=${offset}&date_after=${after}`, { as: 'json' });
    records.push(...data.results);
    if (!data.next || offset > 2000) break;
  }
  return mapRecords(records);
}
