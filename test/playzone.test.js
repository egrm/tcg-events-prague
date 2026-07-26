import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDetail, scrapePlayzone } from '../src/scrapers/playzone.js';

const html = readFileSync(new URL('fixtures/playzone-detail.html', import.meta.url), 'utf8');
const URL_ = 'https://www.playzonearena.cz/akce/2026-06-29-pokemon-league-od-toredo-3';

test('playzone parseDetail extracts next occurrence', () => {
  const ev = parseDetail(html, URL_);
  assert.equal(ev.title, 'Pokémon League od Torédo');
  assert.equal(ev.game, 'pokemon');
  assert.equal(ev.start, '2026-07-30T17:30:00+02:00');
  assert.equal(ev.storeId, 'playzone');
  assert.equal(ev.url, URL_);
});

test('playzone parseDetail rejects non-card events', () => {
  const stripped = html.replace(/Karetní hry/g, 'Esport');
  assert.equal(parseDetail(stripped, URL_), null);
});

test('playzone parseDetail ignores sidebar dates', () => {
  const ev = parseDetail(html, URL_);
  // sidebar "Podobné akce" shows 17:00 (Riftbound); main event is 17:30
  assert.notEqual(ev.start, '2026-07-30T17:00:00+02:00');
});

test('playzone scrape dedupes recurring series pages', async () => {
  const sitemap = `<urlset>
    <url><loc>https://www.playzonearena.cz/akce/2026-06-29-pokemon-league-od-toredo-2</loc></url>
    <url><loc>https://www.playzonearena.cz/akce/2026-06-29-pokemon-league-od-toredo-3</loc></url>
    <url><loc>https://www.playzonearena.cz/akce/2026-07-15-oktagon-92-stvanice</loc></url>
  </urlset>`;
  const fetcher = async u => (u.endsWith('.xml') || u.includes('sitemap') ? sitemap : html);
  const events = await scrapePlayzone({ now: new Date('2026-07-26T00:00:00Z'), fetcher });
  // two toredo pages report the same next occurrence -> one event; oktagon slug filtered out
  assert.equal(events.length, 1);
  assert.equal(events[0].game, 'pokemon');
});
