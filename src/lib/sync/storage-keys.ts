/**
 * Every localStorage key the sync layer owns, in one place. Each hook reads
 * its key from here, sign-out and "delete everything" clear exactly this set,
 * and the backup export walks it — so a new synced resource is added here
 * first and nowhere else has to remember it.
 */
export const SYNCED_STORAGE_KEYS = {
  favorites: "pokedex-favorites",
  cardFavorites: "pokedex-card-favorites",
  lists: "pokedex-lists",
  decks: "pokedex-decks",
  teams: "pokedex-teams",
  preferences: "pokedex-preferences",
} as const;

/**
 * The per-hook keys `pokedex-preferences` replaced. Still read — once, on the
 * first load after the upgrade, and when a pre-v2 backup is restored — never
 * written.
 */
export const LEGACY_PREFERENCE_KEYS = {
  sprite: "pokedex-sprite-preferences",
  generation: "pokedex-generation-preference",
  game: "pokedex-game-preference",
  contentWidth: "nationaldex-content-width",
} as const;

/** Prefix of the per-resource offline outbox queues. */
export const OUTBOX_PREFIX = "pokedex-outbox-";

/** Prefix of the per-(resource, user) "first sync done" markers. */
export const SYNC_FLAG_PREFIX = "pokedex-synced-";

/** Removes every localStorage key that starts with `prefix`. */
export function removeStorageKeysWithPrefix(prefix: string) {
  if (typeof window === "undefined") return;
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(prefix)) {
      window.localStorage.removeItem(key);
    }
  }
}
