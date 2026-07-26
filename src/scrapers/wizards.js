import { get } from '../lib/fetch.js';
import { pragueParts, pragueISO } from '../lib/time.js';

// Wizards WPN event locator: server-rendered search results, ~10 cards/page.
// Covers every WPN store's scheduled MTG events around Prague — including
// stores we can't scrape directly (Černý Rytíř during its site rebuild,
// Cukrárna Alchymista, The Grail, ...).
const BASE = 'https://locator.wizards.com/search?searchType=events&query=Prague%2C+Czechia&distance=10&page=';
const MAX_PAGES = 30;

// WPN store id → our native store id. Najada is skipped entirely: its own API
// is richer and already scraped.
const STORE_MAP = { 11371: 'cernyrytir', 16080: 'alchymista', 11743: 'dracijeskyne', 18171: 'grail', 17202: 'xzone', 21963: 'fyft' };
const SKIP_WPN = new Set([11890]); // Najada (Ondříčkova 2166/14)

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

/** "Tue, Jul 28" → {month, day}; year inferred by caller. */
function parseCardDate(s) {
  const m = (s || '').match(/([A-Z][a-z]{2})\s+(\d{1,2})/);
  return m && MONTHS[m[1]] ? { month: MONTHS[m[1]], day: +m[2] } : null;
}

/** One search page → {cards, isoById}. Exported for tests. */
export function parsePage(html) {
  const cards = [];
  const chunks = html.split('data-testid="searchResultsEventItem"').slice(1);
  for (const c of chunks) {
    const id = (c.match(/eventId=(\d+)/) || [])[1];
    const title = (c.match(/eventCardTitle"><a[^>]*>([^<]+)<\/a>/) || [])[1];
    const store = c.match(/eventCardLocationLink" href="\/store\/(\d+)[^"]*"[^>]*>([^<]+)</);
    const date = (c.match(/eventCardDate"[\s\S]{0,800}?<span[^>]*>([^<]+)<\/span>/) || [])[1];
    const price = (c.match(/eventCardPrice">([^<]+)</) || [])[1];
    if (!id || !title) continue;
    cards.push({
      id, title: title.trim(),
      wpnStoreId: store ? +store[1] : null,
      storeName: store ? store[2].trim() : null,
      date: parseCardDate(date),
      price: price ? price.replace(/ /g, ' ').trim() : undefined,
    });
  }
  // Flight-data pairing: an event id followed (within a window) by an inline
  // ISO datetime. Back-referenced datetimes are missed → card-date fallback.
  const isoById = {};
  for (const card of cards) {
    const re = new RegExp(String.raw`\\"${card.id}\\"`, 'g');
    let m;
    while ((m = re.exec(html))) {
      const tail = html.slice(m.index, m.index + 900);
      const iso = tail.match(/\\"(20\d\d-\d\d-\d\dT[0-9:.]+Z)\\"/);
      if (iso) { isoById[card.id] = iso[1]; break; }
    }
  }
  return { cards, isoById };
}

function inferYear({ month, day }, now) {
  const y = now.getUTCFullYear();
  const candidate = Date.UTC(y, month - 1, day);
  return candidate < now.getTime() - 30 * 86400000 ? y + 1 : y;
}

export async function scrapeWizards({ now = new Date(), fetcher = get } = {}) {
  const events = [];
  const stores = {};
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { cards, isoById } = parsePage(await fetcher(BASE + page));
    if (!cards.length) break;
    for (const card of cards) {
      if (card.wpnStoreId && SKIP_WPN.has(card.wpnStoreId)) continue;
      const storeId = STORE_MAP[card.wpnStoreId] ||
        (card.wpnStoreId ? `wpn-${card.wpnStoreId}` : 'wpn-unknown');
      if (storeId.startsWith('wpn-') && card.storeName) {
        stores[storeId] = {
          name: card.storeName,
          address: 'Prague area (see store page)',
          url: `https://locator.wizards.com/store/${card.wpnStoreId}`,
        };
      }
      const ev = {
        id: `wizards:${card.id}`,
        title: card.title,
        game: 'mtg',
        storeId,
        url: `https://locator.wizards.com/search?searchType=magic-events&query=Prague%2C+Czechia&distance=10&page=1&eventId=${card.id}`,
        price: card.price,
      };
      const iso = isoById[card.id];
      if (iso) {
        const p = pragueParts(new Date(iso));
        ev.start = pragueISO(p.year, p.month, p.day, p.hour, p.minute);
      } else if (card.date) {
        const y = inferYear(card.date, now);
        ev.start = pragueISO(y, card.date.month, card.date.day, 0, 0);
        ev.allDay = true; // exact time not published in a parseable form
      } else {
        continue;
      }
      events.push(ev);
    }
  }
  return { events, stores };
}
