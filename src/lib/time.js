const TZ = 'Europe/Prague';

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
});

/** Wall-clock parts of a Date in Prague: {year, month, day, hour, minute, second} as numbers. */
export function pragueParts(date) {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map(x => [x.type, x.value]));
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour % 24, minute: +p.minute, second: +p.second,
  };
}

/** UTC offset of Prague at the given instant, in minutes (60 for CET, 120 for CEST). */
export function pragueOffsetMinutes(date) {
  const p = pragueParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * Build an ISO 8601 string with the correct Prague offset from wall-clock
 * components, e.g. pragueISO(2026, 7, 31, 18, 30) -> "2026-07-31T18:30:00+02:00".
 */
export function pragueISO(year, month, day, hour = 0, minute = 0) {
  // First guess: interpret the wall time as UTC, then correct by the offset
  // in effect at that instant (a second pass settles DST-boundary times).
  let t = Date.UTC(year, month - 1, day, hour, minute);
  let off = pragueOffsetMinutes(new Date(t));
  off = pragueOffsetMinutes(new Date(t - off * 60000));
  const sign = off < 0 ? '-' : '+';
  const abs = Math.abs(off);
  const pad = n => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
