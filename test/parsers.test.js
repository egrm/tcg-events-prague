import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { canonicalGame } from '../src/lib/schema.js';
import { pragueISO } from '../src/lib/time.js';
import { buildIcs } from '../src/lib/ics.js';
import { mapRecords } from '../src/scrapers/najada.js';
import { parseWeekly, expand } from '../src/scrapers/onyx.js';
import { parseList, parseDetail } from '../src/scrapers/gameshub.js';

const fixture = name => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8');

test('canonicalGame maps store names', () => {
  assert.equal(canonicalGame('Magic the Gathering'), 'mtg');
  assert.equal(canonicalGame('Pokémon turnaj - Standard'), 'pokemon');
  assert.equal(canonicalGame('FLESH&BLOOD'), 'fab');
  assert.equal(canonicalGame('Star Wars: Unlimited liga'), 'swu');
  assert.equal(canonicalGame('Riftbound Nexus Night'), 'riftbound');
  assert.equal(canonicalGame('Cardfight Vanguard'), 'vanguard');
  assert.equal(canonicalGame('Dragon Ball Super: Fusion World'), 'dbfw');
  assert.equal(canonicalGame('Beyblade X'), 'other');
});

test('pragueISO handles CEST and CET', () => {
  assert.equal(pragueISO(2026, 7, 31, 18, 30), '2026-07-31T18:30:00+02:00');
  assert.equal(pragueISO(2026, 12, 15, 18, 30), '2026-12-15T18:30:00+01:00');
  // DST switch day (last Sunday of Oct 2026 = 25th): 04:00 is CET already
  assert.equal(pragueISO(2026, 10, 25, 4, 0), '2026-10-25T04:00:00+01:00');
});

test('najada mapRecords maps API records and skips ended', () => {
  const data = JSON.parse(fixture('najada-sample.json'));
  // fixture holds ENDED events; force one to SCHEDULED to test mapping
  const rec = { ...data.results[4], status: 'SCHEDULED' };
  const events = mapRecords([data.results[0], rec]);
  assert.equal(events.length, 1);
  const e = events[0];
  assert.equal(e.id, 'najada:4426');
  assert.equal(e.game, 'mtg');
  assert.equal(e.start, '2024-02-02T16:30:00+01:00');
  assert.equal(e.price, '750 Kč');
  assert.equal(e.format, 'Sealed Deck');
  assert.equal(e.url, 'https://www.facebook.com/events/1178143996904728');
});

test('onyx parseWeekly finds the recurring schedule', () => {
  const weekly = parseWeekly(fixture('onyx.html'));
  assert.equal(weekly.length, 7);
  const monday = weekly.filter(w => w.weekday === 0);
  assert.equal(monday.length, 2);
  assert.equal(monday[0].title, 'Pokémon turnaj - Standard');
  assert.equal(monday[0].start, '17:30');
  assert.equal(monday[0].price, '150,-');
  const tue = weekly.find(w => w.weekday === 1);
  assert.equal(tue.end, '20:00');
  assert.equal(tue.price, 'Zdarma');
});

test('onyx expand creates dated events with correct weekday', () => {
  const weekly = parseWeekly(fixture('onyx.html'));
  const events = expand(weekly, { now: new Date('2026-07-26T10:00:00+02:00') });
  // 4 weeks x 7 weekly slots
  assert.equal(events.length, 28);
  const first = events[0];
  // 2026-07-27 is a Monday
  assert.equal(first.start, '2026-07-27T17:30:00+02:00');
  assert.equal(first.game, 'pokemon');
  assert.equal(first.storeId, 'onyx');
  const league = events.find(e => e.id.startsWith('onyx:pokemon-liga'));
  assert.ok(league.end.startsWith(league.start.slice(0, 10)));
});

test('gameshub parseList extracts cards with dates', () => {
  const items = parseList(fixture('gameshub.html'));
  assert.ok(items.length >= 10);
  const future = items.filter(i => i.date >= '2026-07-26');
  assert.ok(future.length >= 5, `expected >=5 future, got ${future.length}`);
  assert.ok(items.every(i => /^https:\/\/games-hub\.gg\/turnaj\//.test(i.url)));
  assert.ok(items.every(i => /^\d{4}-\d{2}-\d{2}$/.test(i.date)));
});

test('gameshub parseDetail extracts venue and time', () => {
  const d = parseDetail(fixture('gameshub-detail.html'));
  assert.equal(d.time, '17:00');
  assert.equal(d.organizer, 'Dragon World Store');
  assert.match(d.address, /Slaný/);
  assert.equal(d.game, 'Pokémon');
  assert.equal(d.format, 'Standard');
});

test('ICS output is valid-ish and folds long lines', () => {
  const events = [{
    id: 'najada:1', title: 'A very long tournament name that will definitely exceed the seventy five octet line limit for ICS files',
    game: 'mtg', storeId: 'najada', start: '2026-07-31T18:30:00+02:00', end: '2026-07-31T22:00:00+02:00',
    url: 'https://example.com', price: '100 Kč',
  }];
  const ics = buildIcs(events, { name: 'Test', stores: { najada: { name: 'Najáda', address: 'Ondříčkova 14, Praha 3' } }, now: new Date('2026-07-26T00:00:00Z') });
  assert.match(ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART;TZID=Europe\/Prague:20260731T183000/);
  assert.match(ics, /DTEND;TZID=Europe\/Prague:20260731T220000/);
  assert.match(ics, /UID:najada:1@tcg-events-prague/);
  for (const line of ics.split('\r\n')) assert.ok(Buffer.from(line, 'utf8').length <= 76, `line too long: ${line}`);
  assert.match(ics, /RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU/);
});
