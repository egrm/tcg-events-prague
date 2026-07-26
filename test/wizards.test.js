import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePage, scrapeWizards } from '../src/scrapers/wizards.js';

const html = readFileSync(new URL('fixtures/wizards-page.html', import.meta.url), 'utf8');

test('wizards parsePage extracts cards with stores and dates', () => {
  const { cards, isoById } = parsePage(html);
  assert.equal(cards.length, 10);
  assert.ok(cards.every(c => c.id && c.title));
  assert.ok(cards.every(c => c.wpnStoreId && c.storeName));
  assert.ok(cards.every(c => c.date));
  // most events get an exact ISO time from the flight data
  assert.ok(Object.keys(isoById).length >= 8, `got ${Object.keys(isoById).length}`);
  assert.equal(isoById['11298636'], '2026-07-28T15:30:00.0000000Z');
});

test('wizards scrape maps stores, skips Najada, converts times', async () => {
  const fetcher = async url => (url.endsWith('page=1') ? html : '');
  const { events, stores } = await scrapeWizards({ now: new Date('2026-07-26T00:00:00Z'), fetcher });
  assert.ok(events.length >= 6);
  // Najada (WPN 11890) skipped — its own API is the richer source
  assert.ok(!events.some(e => e.storeId === 'najada' || e.storeId === 'wpn-11890'));
  const cr = events.find(e => e.storeId === 'cernyrytir');
  assert.ok(cr, 'Cerny Rytir events come via the locator');
  const alch = events.find(e => e.storeId === 'alchymista');
  assert.ok(alch);
  assert.ok(events.every(e => e.game === 'mtg'));
  // 15:30 UTC in July = 17:30 Prague (CEST)
  const modern = events.find(e => e.id === 'wizards:11298636');
  assert.equal(modern.start, '2026-07-28T17:30:00+02:00');
  // the back-referenced-time event falls back to all-day
  const fallback = events.find(e => e.id === 'wizards:11215800');
  assert.equal(fallback.allDay, true);
  assert.match(fallback.start, /^2026-07-2[78]T00:00/);
  // every event links to its locator deep link
  assert.ok(events.every(e => e.url.includes(`eventId=${e.id.split(':')[1]}`)));
  // known stores are not duplicated into the dynamic registry
  assert.ok(!('cernyrytir' in stores) && !('alchymista' in stores));
});
