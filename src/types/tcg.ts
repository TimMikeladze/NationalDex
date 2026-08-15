import type { PokemonType } from "./pokemon";
import { TYPE_TEXT_COLORS } from "./pokemon";

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

/**
 * The printings a card exists in. TCGdex reports them twice: as booleans on
 * `variants`, and — for the sets it has priced — as `variants_detailed`, which
 * adds the card's physical size and per-variant market prices.
 */
export const TCG_VARIANT_KEYS = [
  "normal",
  "reverse",
  "holo",
  "firstEdition",
  "wPromo",
] as const;

export type TcgVariantKey = (typeof TCG_VARIANT_KEYS)[number];

export const TCG_VARIANT_LABELS: Record<TcgVariantKey, string> = {
  normal: "Normal",
  reverse: "Reverse holo",
  holo: "Holo",
  firstEdition: "1st Edition",
  wPromo: "W Promo",
};

export type TcgVariants = Partial<Record<TcgVariantKey, boolean>>;

/** A Cardmarket price block. Holo prices are suffixed rather than nested. */
export interface TcgCardmarketPricing {
  updated?: string;
  unit?: string;
  avg?: number;
  low?: number;
  trend?: number;
  [key: string]: string | number | null | undefined;
}

export interface TcgPlayerPrice {
  lowPrice?: number | null;
  midPrice?: number | null;
  highPrice?: number | null;
  marketPrice?: number | null;
  directLowPrice?: number | null;
}

export interface TcgPlayerPricing {
  updated?: string;
  unit?: string;
  [variant: string]: TcgPlayerPrice | string | undefined;
}

export interface TcgVariantPricing {
  cardmarket?: TcgCardmarketPricing;
  tcgplayer?: TcgPlayerPricing;
}

export interface TcgVariantDetailed {
  /** `normal`, `reverse`, `holo`, `lenticular`, ... */
  type: string;
  /**
   * What separates two printings of the same type — `shadowless`,
   * `unlimited`, `1999-2000-copyright`. Base Set holos have four.
   */
  subtype?: string;
  /** Stamps printed on the card, e.g. `1st-edition`, `staff`, `winner`. */
  stamp?: string[];
  /** The foil pattern — `cosmos`, `galaxy`, `cracked-ice`, `pokeball`, ... */
  foil?: string;
  /** `standard` or `jumbo`. */
  size?: string;
  variantId?: string;
  pricing?: TcgVariantPricing;
}

export interface TcgCard extends TcgCardBrief {
  illustrator?: string;
  rarity: string;
  /** `Pokemon`, `Trainer` or `Energy`. */
  category: string;
  variants?: TcgVariants;
  /** Present for priced sets — one entry per printing actually catalogued. */
  variants_detailed?: TcgVariantDetailed[];
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
// Languages
// =============================================================================

/**
 * TCGdex keeps a separate catalogue per language, and they are not translations
 * of one another: Japan gets sets that never reach English at all (the VS, web,
 * PCG and ADV eras, every Japanese-only SV expansion), while Korean, Thai,
 * Indonesian and Chinese each print their own subset. Browsing one language
 * only ever shows the sets that language printed, so the language is part of
 * every card query rather than a display preference.
 */
export const TCG_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "zh-tw", label: "Chinese (Traditional)", native: "繁體中文" },
  { code: "zh-cn", label: "Chinese (Simplified)", native: "简体中文" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
] as const;

export type TcgLanguage = (typeof TCG_LANGUAGES)[number]["code"];

export const DEFAULT_TCG_LANGUAGE: TcgLanguage = "en";

export function isTcgLanguage(value: string): value is TcgLanguage {
  return TCG_LANGUAGES.some((language) => language.code === value);
}

/**
 * The catalogue a page is reading, taken from the URL. Anything unrecognised
 * falls back to English rather than 404-ing the whole page.
 */
export function resolveTcgLanguage(
  value: string | string[] | undefined,
): TcgLanguage {
  const code = Array.isArray(value) ? value[0] : value;
  return code && isTcgLanguage(code) ? code : DEFAULT_TCG_LANGUAGE;
}

/**
 * Carries the language across a link. Card ids are only unique within a
 * catalogue — `SV1a-001` exists in Japanese and nowhere else — so any link to
 * a card or set has to say which one it means.
 */
export function withTcgLanguage(href: string, language: TcgLanguage): string {
  if (language === DEFAULT_TCG_LANGUAGE) return href;
  return `${href}${href.includes("?") ? "&" : "?"}lang=${language}`;
}

export function tcgLanguageLabel(code: string): string {
  return (
    TCG_LANGUAGES.find((language) => language.code === code)?.label ?? code
  );
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

/** The set a card was printed in, read off its id: `base1-4` is `base1`. */
export function setIdFromCardId(cardId: string): string {
  return cardId.split("-").slice(0, -1).join("-");
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

/**
 * The printed energy colours are brand colours: Lightning yellow and Metal
 * grey are unreadable as text on a light background. Every energy maps to a
 * Pokemon type, so the dex's already-darkened text palette is reused rather
 * than inventing a second one.
 */
export function energyTextColor(type: string): string {
  const pokemonType = ENERGY_TO_POKEMON_TYPE[type];
  if (!pokemonType) return TCG_ENERGY_COLORS[type] ?? "#94A3B8";
  return TYPE_TEXT_COLORS[pokemonType];
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
/**
 * Rarities arrive alphabetically, which puts "ACE SPEC Rare" above "Common".
 * Players read them as a ladder, so they are ranked the way a pack does:
 * the physical game's common-to-secret run first, then Pocket's diamonds,
 * stars and crowns, then anything unrecognised.
 */
const RARITY_RANK: [RegExp, number][] = [
  [/^common$/i, 0],
  [/^uncommon$/i, 1],
  [/^rare$/i, 2],
  [/^(double|ultra|hyper|shiny|amazing|radiant|illustration|special)/i, 3],
  [/secret/i, 4],
  [/^(ace spec|classic|legend|prism|trainer gallery)/i, 5],
  [/promo/i, 6],
  // Anything else calling itself a rare belongs with the physical ladder —
  // checked before the Pocket patterns so "Holo Rare VSTAR" isn't read as a star.
  [/rare/i, 3],
  [/diamond/i, 10],
  [/star/i, 11],
  [/shiny/i, 12],
  [/crown/i, 13],
];

function rarityRank(rarity: string): number {
  if (/^none$/i.test(rarity)) return 20;
  for (const [pattern, rank] of RARITY_RANK) {
    if (pattern.test(rarity)) return rank;
  }
  return 7;
}

/** Pocket counts in words, so "Two Diamond" has to sort after "One Diamond". */
const COUNT_WORDS = ["one", "two", "three", "four", "five"];

function countRank(rarity: string): number {
  const index = COUNT_WORDS.findIndex((word) =>
    new RegExp(`^${word}\\b`, "i").test(rarity),
  );
  return index === -1 ? -1 : index;
}

export function sortRarities(rarities: string[]): string[] {
  return [...rarities].sort(
    (a, b) =>
      rarityRank(a) - rarityRank(b) ||
      countRank(a) - countRank(b) ||
      a.localeCompare(b),
  );
}

export function rarityGame(rarity: string): TcgGame | null {
  if (/diamond|star|shiny|crown/i.test(rarity)) return "pocket";
  return null;
}

/**
 * Card numbers come from the API url-encoded, so promos numbered `?` or `!`
 * arrive as `%3F` and `%21`. They are printed on the card as the character.
 */
export function formatLocalId(localId: string): string {
  try {
    return decodeURIComponent(localId);
  } catch {
    return localId;
  }
}

/**
 * A printing's name. `variants_detailed` uses the same keys as the booleans,
 * but nothing stops the API adding one, so anything unknown is title-cased
 * rather than dropped.
 */
export function variantLabel(type: string): string {
  const known = TCG_VARIANT_LABELS[type as TcgVariantKey];
  if (known) return known;
  const spaced = type.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Which booleans are set, in printing order. */
export function activeVariantKeys(
  variants: TcgVariants | undefined,
): TcgVariantKey[] {
  return TCG_VARIANT_KEYS.filter((key) => variants?.[key]);
}

/** Prettifies a hyphenated API token: `1st-edition` reads as "1st edition". */
export function formatVariantToken(token: string): string {
  return token.replace(/[-_]/g, " ");
}

/**
 * The full name of one printing — its type, then whatever distinguishes it
 * from the other printings of that type ("Holo · shadowless · 1st edition").
 */
export function variantFullLabel(variant: TcgVariantDetailed): string {
  const parts = [variantLabel(variant.type)];
  if (variant.subtype) parts.push(formatVariantToken(variant.subtype));
  if (variant.foil) parts.push(`${formatVariantToken(variant.foil)} foil`);
  for (const stamp of variant.stamp ?? [])
    parts.push(formatVariantToken(stamp));
  if (variant.size && variant.size !== "standard") parts.push(variant.size);
  return parts.join(" · ");
}

/** Stable identity for a printing, for keys and de-duplication. */
export function variantKey(variant: TcgVariantDetailed): string {
  return (
    variant.variantId ??
    [
      variant.type,
      variant.subtype ?? "",
      variant.foil ?? "",
      ...(variant.stamp ?? []),
    ].join("|")
  );
}

/**
 * Every printing a card is known to have, merging both shapes the API reports.
 * The detailed entries win where they exist, because they carry the subtype,
 * stamps, size and pricing that make one printing collectable and another not;
 * a boolean with no detailed counterpart still becomes a variant, so a card
 * from a set TCGdex has not catalogued in detail is not shown as having none.
 *
 * `firstEdition` is a stamp rather than a type in the detailed data, so it only
 * becomes its own entry when no detailed printing already carries the stamp.
 */
export function mergedVariants(card: {
  variants?: TcgVariants;
  variants_detailed?: TcgVariantDetailed[];
}): TcgVariantDetailed[] {
  const detailed = card.variants_detailed ?? [];
  const seenTypes = new Set(detailed.map((variant) => variant.type));
  const hasFirstEditionStamp = detailed.some((variant) =>
    variant.stamp?.includes("1st-edition"),
  );

  const extra = activeVariantKeys(card.variants)
    .filter((key) => {
      if (key === "firstEdition") return !hasFirstEditionStamp;
      return !seenTypes.has(key);
    })
    .map((key) => ({ type: key }) satisfies TcgVariantDetailed);

  return [...detailed, ...extra];
}

export interface TcgPriceQuote {
  value: number;
  unit: string;
  source: "TCGplayer" | "Cardmarket";
}

const TCGPLAYER_VARIANT_KEYS: Record<string, string[]> = {
  normal: ["normal"],
  reverse: ["reverse-holofoil", "reverseHolofoil"],
  holo: ["holofoil"],
  firstEdition: ["1stEditionNormal", "1stEditionHolofoil"],
};

/**
 * The one number worth putting next to a printing. TCGplayer's market price is
 * the closest thing to "what it sells for"; Cardmarket's average stands in when
 * a card is only priced in Europe.
 */
export function variantMarketPrice(
  variant: TcgVariantDetailed,
): TcgPriceQuote | null {
  const tcgplayer = variant.pricing?.tcgplayer;
  if (tcgplayer) {
    const keys = TCGPLAYER_VARIANT_KEYS[variant.type] ?? [variant.type];
    for (const key of keys) {
      const entry = tcgplayer[key];
      if (entry && typeof entry === "object") {
        const value = entry.marketPrice ?? entry.midPrice ?? entry.lowPrice;
        if (typeof value === "number") {
          return { value, unit: tcgplayer.unit ?? "USD", source: "TCGplayer" };
        }
      }
    }
  }

  const cardmarket = variant.pricing?.cardmarket;
  if (cardmarket) {
    // Holo printings are priced under `-holo` suffixed keys on the same block.
    const key =
      variant.type === "holo" || variant.type === "reverse"
        ? "avg-holo"
        : "avg";
    const value = cardmarket[key] ?? cardmarket.avg;
    if (typeof value === "number") {
      return { value, unit: cardmarket.unit ?? "EUR", source: "Cardmarket" };
    }
  }

  return null;
}

export function formatPrice(quote: TcgPriceQuote): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: quote.unit,
      maximumFractionDigits: 2,
    }).format(quote.value);
  } catch {
    return `${quote.value.toFixed(2)} ${quote.unit}`;
  }
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
