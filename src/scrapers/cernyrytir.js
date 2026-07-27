/**
 * Černý Rytíř relaunched its website on 2026-07-27; the new site's structure
 * is unknown until it's live. This stub keeps the store visible on the page
 * (status "pending") without failing the pipeline. Replace with a real
 * scraper once the new site is up.
 */
export async function scrapeCernyRytir() {
  // New site (launched 2026-07-27) is a Vue SPA backed by
  // POST https://eshop-api.cernyrytir.eu/api/public/tournament/upcoming
  // {eshopLang, filterType, tournamentGameId} — currently returns 500 for
  // every valid request (their launch-day bug). Finish this scraper once the
  // endpoint works; MTG events meanwhile come via the Wizards locator.
  return { events: [], pending: 'New site live, but its tournament API is still broken; MTG events come via the Wizards locator' };
}
