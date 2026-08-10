import type { PokemonType } from "./pokemon";

// =============================================================================
// TCGdex API shapes
//
// The trading card data comes from the TCGdex REST API, which covers both the
// physical Pokemon TCG and Pokemon TCG Pocket in one database. Card ids are
// `${setId}-${localId}` (e.g. `swsh3-136`, `A1-036`) and lookups are
// case-insensitive, so lowercase slugs are safe to use in routes.
// =============================================================================

/** The trimmed card shape every list endpoint returns. */
export interface TcgCardBrief {
  id: string;
  localId: string;
  name: string;
  /** Image base URL — quality and extension still need appending. */
  image?: string;
}

export interface TcgSetBrief {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: {
    total: number;
    official: number;
  };
}

export interface TcgSerieBrief {
  id: string;
  name: string;
  logo?: string;
}

export interface TcgSerie extends TcgSerieBrief {
  sets: TcgSetBrief[];
}

export interface TcgLegality {
  standard: boolean;
  expanded: boolean;
}

export interface TcgBooster {
  id: string;
  name: string;
  logo?: string;
  artwork_front?: string;
  artwork_back?: string;
}

export interface TcgSet extends TcgSetBrief {
  serie: TcgSerieBrief;
  tcgOnline?: string;
  releaseDate: string;
  legal: TcgLegality;
  cardCount: {
    total: number;
    official: number;
    normal?: number;
    reverse?: number;
    holo?: number;
    firstEd?: number;
  };
  cards: TcgCardBrief[];
  boosters?: TcgBooster[];
}

export interface TcgAttack {
  cost?: string[];
  name: string;
  effect?: string;
  damage?: string | number;
}

export interface TcgAbility {
  type: string;
  name: string;
  effect: string;
}

export interface TcgTypeValue {
  type: string;
  value?: string;
}

export interface TcgCard extends TcgCardBrief {
  illustrator?: string;
  rarity: string;
  /** `Pokemon`, `Trainer` or `Energy`. */
  category: string;
  variants?: {
    normal?: boolean;
    reverse?: boolean;
    holo?: boolean;
    firstEdition?: boolean;
    wPromo?: boolean;
  };
  set: TcgSetBrief;
  /** National Dex numbers this card depicts — the link back into the Pokedex. */
  dexId?: number[];
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  weight?: string;
  description?: string;
  level?: number | string;
  stage?: string;
  suffix?: string;
  item?: { name: string; effect: string };
  abilities?: TcgAbility[];
  attacks?: TcgAttack[];
  weaknesses?: TcgTypeValue[];
  resistances?: TcgTypeValue[];
  retreat?: number;
  effect?: string;
  trainerType?: string;
  energyType?: string;
  regulationMark?: string;
  legal?: TcgLegality;
  boosters?: TcgBooster[];
}

// =============================================================================
// Games
// =============================================================================

/**
 * The two card games. `pocket` is Pokemon TCG Pocket, which TCGdex models as a
 * single series alongside the physical game's twenty-odd series.
 */
export type TcgGame = "tcg" | "pocket";

export const POCKET_SERIE_ID = "tcgp";

export const TCG_GAME_LABELS: Record<TcgGame, string> = {
  tcg: "TCG",
  pocket: "Pocket",
};

export const TCG_GAME_FULL_LABELS: Record<TcgGame, string> = {
  tcg: "Pokemon TCG",
  pocket: "Pokemon TCG Pocket",
};

export const TCG_GAME_COLORS: Record<TcgGame, string> = {
  tcg: "#F59E0B",
  pocket: "#0EA5E9",
};

/**
 * Pocket set ids as of the last release, used until the live series listing
 * loads (and as a fallback if it never does). Sets are added over time, so the
 * fetched list always wins when available.
 */
export const FALLBACK_POCKET_SET_IDS = [
  "A1",
  "A1a",
  "A2",
  "A2a",
  "A2b",
  "A3",
  "A3a",
  "A3b",
  "A4",
  "A4a",
  "B1",
  "B1a",
  "B2",
  "B2a",
  "P-A",
];

/** Which game a card belongs to, judged by the set its id is prefixed with. */
export function gameForCardId(
  cardId: string,
  pocketSetIds: string[] = FALLBACK_POCKET_SET_IDS,
): TcgGame {
  const id = cardId.toLowerCase();
  return pocketSetIds.some((setId) => id.startsWith(`${setId.toLowerCase()}-`))
    ? "pocket"
    : "tcg";
}

export function gameForSetId(
  setId: string,
  pocketSetIds: string[] = FALLBACK_POCKET_SET_IDS,
): TcgGame {
  const id = setId.toLowerCase();
  return pocketSetIds.some((pocketId) => pocketId.toLowerCase() === id)
    ? "pocket"
    : "tcg";
}

// =============================================================================
// Energy types
// =============================================================================

/** The energy types a card can be, in the order the games print them. */
export const TCG_ENERGY_TYPES = [
  "Grass",
  "Fire",
  "Water",
  "Lightning",
  "Psychic",
  "Fighting",
  "Darkness",
  "Metal",
  "Fairy",
  "Dragon",
  "Colorless",
] as const;

export type TcgEnergyType = (typeof TCG_ENERGY_TYPES)[number];

export const TCG_ENERGY_COLORS: Record<string, string> = {
  Grass: "#7AC74C",
  Fire: "#EE8130",
  Water: "#6390F0",
  Lightning: "#F7D02C",
  Psychic: "#F95587",
  Fighting: "#C22E28",
  Darkness: "#705746",
  Metal: "#B7B7CE",
  Fairy: "#D685AD",
  Dragon: "#6F35FC",
  Colorless: "#A8A77A",
};

/**
 * The card game collapses the video games' eighteen types into eleven energy
 * types. Mapping back lets a card link to the type pages a trainer already
 * knows — the ones without a counterpart (Ice, Flying, ...) simply never appear
 * on a card.
 */
const ENERGY_TO_POKEMON_TYPE: Record<string, PokemonType> = {
  Grass: "Grass",
  Fire: "Fire",
  Water: "Water",
  Lightning: "Electric",
  Psychic: "Psychic",
  Fighting: "Fighting",
  Darkness: "Dark",
  Metal: "Steel",
  Fairy: "Fairy",
  Dragon: "Dragon",
  Colorless: "Normal",
};

export function tcgTypeToPokemonType(type: string): PokemonType | null {
  return ENERGY_TO_POKEMON_TYPE[type] ?? null;
}

export const TCG_CATEGORIES = ["Pokemon", "Trainer", "Energy"] as const;
export type TcgCategory = (typeof TCG_CATEGORIES)[number];

// =============================================================================
// Assets
// =============================================================================

export type TcgImageQuality = "low" | "high";
export type TcgImageExtension = "png" | "jpg" | "webp";

/**
 * TCGdex serves images from a base URL with the quality and extension left off,
 * so they have to be appended. Not every card has artwork.
 */
export function cardImageUrl(
  image: string | undefined | null,
  quality: TcgImageQuality = "high",
  extension: TcgImageExtension = "png",
): string | null {
  if (!image) return null;
  return `${image}/${quality}.${extension}`;
}

/** Set logos and symbols only need an extension. */
export function assetUrl(
  asset: string | undefined | null,
  extension: TcgImageExtension = "png",
): string | null {
  if (!asset) return null;
  return `${asset}.${extension}`;
}

// =============================================================================
// Display helpers
// =============================================================================

/**
 * Rarities read very differently between the two games — the physical game has
 * Common/Rare/Secret Rare while Pocket counts diamonds, stars and crowns.
 */
export function rarityGame(rarity: string): TcgGame | null {
  if (/diamond|star|shiny|crown/i.test(rarity)) return "pocket";
  return null;
}

export function formatReleaseDate(releaseDate: string | undefined): string {
  if (!releaseDate) return "";
  const parsed = new Date(releaseDate);
  if (Number.isNaN(parsed.getTime())) return releaseDate;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
