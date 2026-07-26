import { get } from '../lib/fetch.js';
import { canonicalGame } from '../lib/schema.js';
import { pragueISO } from '../lib/time.js';

const SITEMAP = 'https://www.playzonearena.cz/sitemap.xml';
// Cheap slug filter so we only fetch pages that could be TCG events.
const TCG_SLUG = /pokemon|riftbound|magic|lorcana|karetn|tcg|one-?piece|yu-?gi|star-?wars|flesh|digimon|vanguard|gundam|dragon-?ball/;
/**
 * Detail page → event fields or null. Exported for tests.
 * The page body mixes in a "Podobné akce" sidebar with other events' dates,
 * so the only trustworthy date is the meta description, which describes the
 * main event alone: "Karetní hry · Čtvrtek, 30. 7. 2026 v 17:30".
 */
export function parseDetail(html, url) {
  const meta = (html.match(/name="description" content="([^"]+)"/) ||
    html.match(/property="og:description" content="([^"]+)"/) || [])[1];
  if (!meta || !meta.includes('Karetní hry')) return null;
  const title = (html.match(/<h1[^>]*>[\s\S]*?<span>([^<]+)<\/span>/) || html.match(/<title>([^|<]+)/) || [])[1]?.trim();
  const m = meta.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*v\s*(\d{1,2}):(\d{2})/);
  if (!title || !m) return null;
  const [, d, mo, y, h, mi] = m.map(Number);
  return {
    id: `playzone:${url.split('/akce/')[1]}`,
    title,
    game: canonicalGame(title),
    storeId: 'playzone',
    start: pragueISO(y, mo, d, h, mi),
    url,
  };
}

export async function scrapePlayzone({ now = new Date(), fetcher = get } = {}) {
  const xml = await fetcher(SITEMAP);
  const urls = [...xml.matchAll(/<loc>([^<]+\/akce\/[^<]+)<\/loc>/g)]
    .map(m => m[1])
    .filter(u => TCG_SLUG.test(u.split('/akce/')[1]));
  const events = [];
  for (const url of urls) {
    let ev = null;
    try {
      ev = parseDetail(await fetcher(url), url);
    } catch {
      continue; // individual stale pages may 404; skip them
    }
    if (ev && new Date(ev.start) >= now) events.push(ev);
  }
  // Recurring series have one page per past series-start; the same next
  // occurrence can appear on several pages. Keep one per start+game.
  const seen = new Set();
  return events.filter(e => {
    const k = `${e.start}|${e.game}|${e.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
