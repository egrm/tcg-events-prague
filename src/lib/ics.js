import { pragueParts } from './time.js';
import { GAMES } from './schema.js';

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Prague',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

function icsLocal(iso) {
  const p = pragueParts(new Date(iso));
  const pad = n => String(n).padStart(2, '0');
  return `${p.year}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

function icsUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 line folding at 75 octets. */
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let start = 0;
  while (start < bytes.length) {
    let len = Math.min(start === 0 ? 75 : 74, bytes.length - start);
    // don't split inside a UTF-8 sequence
    while (len > 1 && (bytes[start + len] & 0xc0) === 0x80) len--;
    out.push((start === 0 ? '' : ' ') + bytes.subarray(start, start + len).toString('utf8'));
    start += len;
  }
  return out.join('\r\n');
}

/**
 * @param {import('./schema.js').TcgEvent[]} events
 * @param {{name: string, stores: Record<string, {name: string, address?: string}>, now: Date}} opts
 */
export function buildIcs(events, { name, stores, now }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tcg-events-prague//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'X-WR-TIMEZONE:Europe/Prague',
    ...VTIMEZONE,
  ];
  const stamp = icsUtcStamp(now);
  for (const ev of events) {
    const store = stores[ev.storeId] || { name: ev.storeId };
    const desc = [
      GAMES[ev.game] || ev.game,
      ev.format,
      ev.price,
      ev.url,
    ].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(ev.id)}@tcg-events-prague`,
      `DTSTAMP:${stamp}`,
      ...(ev.allDay
        ? [`DTSTART;VALUE=DATE:${icsLocal(ev.start).slice(0, 8)}`]
        : [`DTSTART;TZID=Europe/Prague:${icsLocal(ev.start)}`,
           ...(ev.end ? [`DTEND;TZID=Europe/Prague:${icsLocal(ev.end)}`] : [])]),
      `SUMMARY:${escapeText(`${ev.title} @ ${store.name}`)}`,
      `LOCATION:${escapeText(store.address || store.name)}`,
      `DESCRIPTION:${escapeText(desc)}`,
      `URL:${escapeText(ev.url)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
