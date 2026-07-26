# Prague TCG Events

One clean, always-up-to-date view of trading card game events (Magic, Pokémon, One Piece, Lorcana, …) across Prague game stores — a static site plus subscribable ICS calendar feeds.

- **Site:** https://egrm.github.io/tcg-events-prague/
- **Calendar feeds:** `all.ics` plus one feed per game (linked from the site)

## How it works

A GitHub Actions cron job runs every ~6 hours:

1. `src/scrapers/*` fetch each store's schedule (Playwright for JS-rendered sites) and normalize events into a common schema (`Europe/Prague` timezone).
2. `src/build.js` writes `dist/`: `index.html` (filterable by game/store, shows last-refreshed time overall and per store, every event links to its original page), `events.json`, and the ICS feeds.
3. The workflow deploys `dist/` to GitHub Pages.

A failing store scraper never blocks the others — its last-known data is kept and marked stale on the page.

## Development

```
npm install
npm run scrape   # fetch fresh data into data/
npm run build    # generate dist/ from data/
npm test
```
