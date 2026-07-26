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
  playzone: {
    name: 'Vodafone PLAYzone Arena',
    address: 'Roztylská 2321/19 (Westfield Chodov), Praha 4',
    url: 'https://www.playzonearena.cz/kalendar',
  },
  butovice: {
    name: 'Herna Butovice',
    address: 'Radlická 520/117 (Galerie Butovice), Praha 5',
    url: 'https://www.facebook.com/hernabutovice',
    noFeed: 'Schedule only on Facebook (Pokémon, Fridays)',
  },
  tomovyhry: {
    name: 'Tomovy hry (Mephit)',
    address: 'Arbesovo náměstí 14, Praha 5',
    url: 'https://www.tomovyhry.cz/',
    noFeed: 'Pokémon league venue; no machine-readable schedule',
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
