import { get } from '../lib/fetch.js';
import { canonicalGame } from '../lib/schema.js';
import { isPrague } from '../lib/stores.js';
import { pragueISO } from '../lib/time.js';

const BASE = 'https://games-hub.gg/seznam_turnaju/?gid=';
const GIDS = ['magic', 'pokemon', 'lorcana', 'flesh-and-blood', 'riftbound', 'star-wars'];

const CZ_MONTHS = {
  ledna: 1, února: 2, března: 3, dubna: 4, května: 5, června: 6,
  července: 7, srpna: 8, září: 9, října: 10, listopadu: 11, prosince: 12,
};

function decode(s) {
  return s
    .replace(/&#8218;/g, '‚').replace(/&#8211;/g, '–').replace(/&#039;|&#8217;/g, "'")
    .replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/\s+/g, ' ').trim();
}

/** List page → [{url, title, date: 'YYYY-MM-DD'}]. Exported for tests. */
export function parseList(html) {
  const out = new Map();
  const re = /href="(https:\/\/games-hub\.gg\/turnaj\/[^"?]+)[^"]*"[^>]*>([\s\S]{0,1500}?)(\d{1,2})\.\s*(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)\s*(20\d\d)/g;
  for (const m of html.matchAll(re)) {
    const [, url, between, day, monthName, year] = m;
    const titleMatch = between.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/) || between.match(/>([^<>]{4,120})</);
    if (!titleMatch) continue;
    const pad = n => String(n).padStart(2, '0');
    const date = `${year}-${pad(CZ_MONTHS[monthName])}-${pad(+day)}`;
    if (!out.has(url)) out.set(url, { url, title: decode(titleMatch[1].replace(/<[^>]+>/g, '')), date });
  }
  return [...out.values()];
}

/** Detail page → {time, game, format, organizer, address}. Exported for tests. */
export function parseDetail(html) {
  const body = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  const txt = body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const pick = re => (txt.match(re) || [])[1]?.trim();
  return {
    time: pick(/Čas:\s*(\d{1,2}:\d{2})/),
    game: pick(/Hra:\s*([^ ].*?)(?= Formát:| Oznámení| Adresa:|$)/),
    format: pick(/Formát:\s*([^ ].*?)(?= Oznámení| Adresa:| Datum:|$)/),
    organizer: pick(/Informace o herně\s*(.*?)\s*Adresa:/),
    address: pick(/Adresa:\s*(.*?)(?= Kontakt:| Web:|$)/),
  };
}

/**
 * Scrape all game tabs; keep future events at Prague venues only.
 * Discovered organizers are returned as extra stores keyed `gh-<slug>`.
 */
export async function scrapeGamesHub({ now = new Date(), fetcher = get } = {}) {
  const today = now.toISOString().slice(0, 10);
  const seen = new Map();
  for (const gid of GIDS) {
    const html = await fetcher(`${BASE}${gid}`);
    for (const item of parseList(html)) {
      if (item.date >= today && !seen.has(item.url)) seen.set(item.url, { ...item, gid });
    }
  }
  const events = [];
  const stores = {};
  for (const item of seen.values()) {
    const d = parseDetail(await fetcher(item.url));
    if (!isPrague(d.address)) continue;
    const storeId = 'gh-' + (d.organizer || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    stores[storeId] = { name: d.organizer || 'Unknown venue', address: d.address, url: item.url };
    const [y, mo, day] = item.date.split('-').map(Number);
    const [h, mi] = (d.time || '00:00').split(':').map(Number);
    events.push({
      id: `gameshub:${item.url.split('/turnaj/')[1].replace(/\/$/, '')}`,
      title: item.title,
      game: canonicalGame(d.game || item.gid),
      storeId,
      start: pragueISO(y, mo, day, h, mi),
      url: item.url,
      format: d.format || undefined,
    });
  }
  return { events, stores };
}
