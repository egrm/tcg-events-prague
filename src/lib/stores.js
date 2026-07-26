/** Known Prague venues. Scrapers may add discovered organizers at runtime. */
export const STORES = {
  najada: {
    name: 'Najáda',
    address: 'Ondříčkova 2166/14, Praha 3',
    url: 'https://www.najada.games/en/game-club/tournaments',
  },
  onyx: {
    name: 'Professor Onyx',
    address: 'Arbesovo náměstí 781/14, Praha 5',
    url: 'https://www.professoronyx.com/kalendar-akci/',
  },
  cernyrytir: {
    name: 'Černý Rytíř',
    address: 'Za Poříčskou bránou 21, Praha 8',
    url: 'https://cernyrytir.cz/',
  },
  xzone: {
    name: 'Xzone TCG Hub (Lužiny)',
    address: 'Archeologická 2256/1, Praha 13',
    url: 'https://www.facebook.com/xzonecz',
    // No machine-readable schedule: events are announced in Facebook groups.
    noFeed: 'Schedule only on Facebook',
  },
};

/** True if a free-form address/city string is in Prague. */
export function isPrague(s) {
  return /praha|prague/i.test(s || '');
}
