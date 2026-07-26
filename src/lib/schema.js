/**
 * Common event shape produced by every scraper.
 *
 * @typedef {Object} TcgEvent
 * @property {string} id        Stable unique id: `${storeId}:${slug-or-source-id}`
 * @property {string} title     Event name as the store lists it
 * @property {string} game      Canonical game key, see GAMES; "other" if unknown
 * @property {string} storeId   Key into STORES
 * @property {string} start     ISO 8601 with offset, Europe/Prague wall time
 * @property {string} [end]     ISO 8601 with offset, if the store lists one
 * @property {string} url       Link to the original event page (or the store's
 *                              schedule page when no per-event URL exists)
 * @property {string} [format]  Game format / event type as listed (e.g. "Modern")
 * @property {string} [price]   Entry fee as listed, free-form
 */

export const GAMES = {
  mtg: 'Magic: The Gathering',
  pokemon: 'Pokémon TCG',
  onepiece: 'One Piece Card Game',
  lorcana: 'Disney Lorcana',
  fab: 'Flesh and Blood',
  swu: 'Star Wars: Unlimited',
  riftbound: 'Riftbound',
  gundam: 'Gundam Card Game',
  digimon: 'Digimon Card Game',
  yugioh: 'Yu-Gi-Oh!',
  other: 'Other games',
};

/** Map a free-form game name from a store site to a canonical GAMES key. */
export function canonicalGame(raw) {
  const s = (raw || '').toLowerCase();
  if (/magic|mtg/.test(s)) return 'mtg';
  if (/pok[eé]mon/.test(s)) return 'pokemon';
  if (/one\s*piece/.test(s)) return 'onepiece';
  if (/lorcana/.test(s)) return 'lorcana';
  if (/flesh\s*(and|&)\s*blood|\bfab\b/.test(s)) return 'fab';
  if (/star\s*wars/.test(s)) return 'swu';
  if (/riftbound/.test(s)) return 'riftbound';
  if (/gundam/.test(s)) return 'gundam';
  if (/digimon/.test(s)) return 'digimon';
  if (/yu-?gi-?oh/.test(s)) return 'yugioh';
  return 'other';
}
