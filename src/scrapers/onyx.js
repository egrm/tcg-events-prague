import { get } from '../lib/fetch.js';
import { canonicalGame } from '../lib/schema.js';
import { pragueISO, pragueParts } from '../lib/time.js';

const URL = 'https://www.professoronyx.com/kalendar-akci/';
// Monday-first, matching the page's weekday headings.
const WEEKDAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
const LABELS = ['Registrace', 'Začátek', 'Start', 'Konec', 'Startovné'];
const EXPAND_DAYS = 28;

/** HTML of the calendar article → text lines. */
function toLines(html) {
  let seg = html;
  const from = seg.indexOf('Kalendář akcí');
  if (from >= 0) seg = seg.slice(from);
  seg = seg.replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  const to = seg.search(/Zápatí|<\/article/);
  if (to >= 0) seg = seg.slice(0, to);
  return seg
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Parse the recurring weekly schedule.
 * Exported for tests. Returns [{weekday: 0-6 Monday-first, title, reg?, start, end?, price?}]
 */
export function parseWeekly(html) {
  const lines = toLines(html);
  const out = [];
  let weekday = -1;
  for (let i = 0; i < lines.length; i++) {
    const wd = WEEKDAYS.findIndex(w => lines[i].startsWith(w));
    if (wd >= 0 && lines[i].length < 15) { weekday = wd; continue; }
    // An event title is a line immediately followed by a known field label —
    // but field values (times like "17:00") also precede labels, so require
    // letters and exclude label lines themselves.
    if (weekday < 0 || !/^(Registrace|Začátek)\s*:?$/.test(lines[i + 1] || '')) continue;
    if (!/\p{L}/u.test(lines[i]) || /^(Registrace|Začátek|Start|Konec|Startovné)\s*:?$/.test(lines[i])) continue;
    const ev = { weekday, title: lines[i] };
    for (let j = i + 1; j < lines.length - 1; j += 2) {
      const label = (lines[j].match(/^([^:]+)\s*:?$/) || [])[1]?.trim();
      if (!LABELS.includes(label)) break;
      const value = lines[j + 1];
      if (label === 'Registrace') ev.reg = value;
      else if (label === 'Začátek' || label === 'Start') ev.start = value;
      else if (label === 'Konec') ev.end = value;
      else if (label === 'Startovné') ev.price = value;
    }
    if (ev.start || ev.reg) out.push(ev);
  }
  return out;
}

/** Expand weekly schedule into dated events for the next EXPAND_DAYS days. */
export function expand(weekly, { now = new Date() } = {}) {
  const events = [];
  for (let d = 0; d < EXPAND_DAYS; d++) {
    const day = new Date(now.getTime() + d * 86400000);
    const p = pragueParts(day);
    // JS getUTCDay of the Prague-local date: 0=Sun; convert to Monday-first.
    const dow = (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7;
    for (const ev of weekly) {
      if (ev.weekday !== dow) continue;
      const [h, mi] = (ev.start || ev.reg).split(':').map(Number);
      if (isNaN(h)) continue;
      const start = pragueISO(p.year, p.month, p.day, h, mi || 0);
      if (d === 0 && new Date(start) < now) continue;
      const slug = ev.title.normalize('NFD').replace(/\p{M}/gu, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const e = {
        id: `onyx:${slug}-${start.slice(0, 10)}`,
        title: ev.title,
        game: canonicalGame(ev.title),
        storeId: 'onyx',
        start,
        url: URL,
        price: ev.price,
      };
      if (ev.end) {
        const [eh, emi] = ev.end.split(':').map(Number);
        if (!isNaN(eh)) e.end = pragueISO(p.year, p.month, p.day, eh, emi || 0);
      }
      events.push(e);
    }
  }
  return events;
}

export async function scrapeOnyx({ now = new Date() } = {}) {
  const html = await get(URL);
  return expand(parseWeekly(html), { now });
}
