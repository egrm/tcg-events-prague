# Prague TCG Events Aggregator — Design

2026-07-26. Approved direction: user requested autonomous build; decisions below were confirmed in conversation.

## Goal

One clean, always-current view of all TCG events (all games) in Prague stores: a static web page with game/store filters, a visible "last refreshed" time, every event linking to its original page — plus subscribable ICS feeds (one per game + all games).

## Sources (v1)

| Source | Method | Games | Notes |
|---|---|---|---|
| Najada | Public JSON API `najada.games/api/v1/playhouse/tournament/` (paginated; `date`/`start` filters unreliable → filter client-side) | MTG, Pokémon, Yu-Gi-Oh!, FaB, Lorcana, SWU, Riftbound, One Piece, Digimon, … | ~20–25 events/week; the dominant venue |
| Professor Onyx | HTML scrape of `professoronyx.com/kalendar-akci/` (server-rendered) | Pokémon, SWU | ~2–4/week; official Pokémon CZ/SK Liga Prague center |
| games-hub.gg | HTML/JSON-LD scrape of `seznam_turnaju` per game tab, filtered to Prague venues | Pokémon, FaB, Lorcana, MTG, Riftbound, SWU | Secondary aggregator; dedupe against Najada/Onyx |
| Černý Rytíř | Stub in v1 — new website launches 2026-07-27; add scraper after relaunch | MTG, Pokémon, others | Shown on site as "schedule pending website relaunch" with link |
| Xzone Lužiny | Not scrapable (Facebook-only schedule) | — | Listed as a known venue with FB link, no feed |

Excluded: Mystic Shop (closed), Rishada (Brno), Black Lotus (Ostrava), Tlama (no TCG), Veselý Drak (occasional fairs only — revisit if they announce in-store events).

No Playwright needed for v1 sources → faster, simpler CI. Add it only if a future source (Wizards locator, new Černý Rytíř site) requires JS rendering.

## Architecture

Single public repo, GitHub Actions + GitHub Pages (Cloudflare rejected: free tier limits on CPU/browser rendering; comparison in git history of this doc's research).

```
GitHub Actions cron (23 */6 * * *) + workflow_dispatch + push
  → node src/scrape.js     # runs all scrapers, each isolated
      writes data/<source>.json (events + fetchedAt + status)
      on failure: keeps previous data/<source>.json, marks status=error
  → commit data/ back to main (also keeps scheduled workflow alive past 60-day inactivity)
  → node src/build.js      # data/ → dist/
      dist/index.html      # single-page, embedded JSON, client-side filters
      dist/events.json     # merged normalized data
      dist/all.ics + dist/<game>.ics
  → actions/deploy-pages
```

### Event schema

`{id, title, game, storeId, start, end?, url, format?, price?}` — `game` canonicalized via keyword mapping (`src/lib/schema.js`), times as ISO 8601 with Europe/Prague offset. `id` stable (`store:sourceId`) so ICS UIDs don't churn.

### Merge step

- Drop events outside Prague (games-hub lists country-wide).
- Dedupe: same store + same start time + same game across sources → keep the store-native source (Najada/Onyx) over games-hub.
- Window: today → +60 days.

### Frontend

No framework; one HTML file with embedded data and vanilla JS. Upcoming events grouped by day; filter chips for game and store (persisted in URL hash); header shows overall last-refresh; per-store status footer (ok / stale + age / error); ICS subscribe links; EN UI; mobile-friendly; light/dark via `prefers-color-scheme`.

### Error handling

- Each scraper wrapped independently; one failure never blocks the rest.
- Failed source → previous data retained, marked stale on the page with its age.
- Scraper "success with 0 events" for a source that usually has many → treated as suspect: keep previous data, mark warning (guards against silent page-structure changes).
- Workflow itself failing → repo owner gets GitHub's failure email.

### Testing

`node --test`: unit tests for game canonicalization, time/DST handling, ICS output (folding, escaping, VTIMEZONE), and each parser against committed HTML/JSON fixtures. CI runs tests before deploy.

## Out of scope (v1)

Wizards/Pokémon official locators (need headless browser), Facebook sources, notifications/digests, Czech UI, multi-city.
