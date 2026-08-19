import type { TcgGame, TcgLanguage } from "./tcg";
import { DEFAULT_TCG_LANGUAGE } from "./tcg";

// =============================================================================
// A deck, as it is stored
// =============================================================================

/**
 * Everything about a card a deck needs to know, taken as a snapshot when the
 * card is added.
 *
 * A deck is opened far more often than it is built, and judging one — the copy
 * limit, whether the evolution lines hold up, whether the attacks can actually
 * be paid for — needs the parts of a card the search endpoint does not return.
 * Keeping a snapshot means opening a deck costs nothing rather than sixty card
 * requests, and a deck built today still reads back the same way if TCGdex
 * later re-catalogues a set.
 */
export interface DeckCard {
  id: string;
  name: string;
  localId: string;
  image?: string;
  /** `Pokemon`, `Trainer` or `Energy` — the three piles a deck is built from. */
  category: string;
  rarity?: string;
  setId: string;
  setName: string;
  /** Energy types printed on a Pokemon. */
  types?: string[];
  hp?: number;
  /** `Basic`, `Stage1`, `Stage2`, `VMAX`, ... */
  stage?: string;
  /** The mechanic printed on the name — `ex`, `V`, `VSTAR`, `GX`. */
  suffix?: string;
  /** The Pokemon this one evolves from, by name. */
  evolveFrom?: string;
  /** `Supporter`, `Item`, `Stadium`, `Tool`. */
  trainerType?: string;
  /** `Basic` or `Special`, on an Energy card. */
  energyType?: string;
  retreat?: number;
  regulationMark?: string;
  legal?: { standard: boolean; expanded: boolean };
  /** Costs are what decides whether a deck's energy line works. */
  attacks?: { name: string; cost?: string[]; damage?: string | number }[];
  abilities?: { name: string; type: string }[];
  weaknesses?: { type: string; value?: string }[];
}

/** One card name in a deck, and how many copies of it are played. */
export interface DeckEntry {
  card: DeckCard;
  count: number;
  addedAt: number;
}

export interface Deck {
  id: string;
  name: string;
  formatId: DeckFormatId;
  /** The catalogue the cards were drawn from — ids only mean anything there. */
  language: TcgLanguage;
  /**
   * The energy type a single-type format is built around. Only Gym Leader
   * Challenge asks for one, where it is the deck's defining choice.
   */
  typeFocus?: string | null;
  notes?: string;
  entries: DeckEntry[];
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// Formats — the rule sets a deck is built to
// =============================================================================

export type DeckFormatId =
  | "standard"
  | "expanded"
  | "unlimited"
  | "glc"
  | "pocket";

/**
 * Which slice of the catalogue a format may be built from. Each one is a search
 * the card API can actually be asked: a set of regulation marks, a run of sets,
 * everything, or the Pocket sets.
 */
export type DeckPoolKind = "standard" | "expanded" | "unlimited" | "pocket";

/**
 * The counts an experienced player holds a list to. These are not rules — a
 * deck breaking them is a deck worth a second look, not an illegal one — so
 * they are reported as notes rather than errors.
 */
export interface DeckGuidance {
  /** Below this, opening without a Basic stops being bad luck. */
  basicPokemonMin: number;
  pokemonRange: [number, number];
  supporterRange: [number, number];
  /** Null where energy is not in the deck at all. */
  energyRange: [number, number] | null;
}

export interface DeckFormat {
  id: DeckFormatId;
  name: string;
  /** Two or three letters, for a badge. */
  short: string;
  game: TcgGame;
  /** The one line a player would recognise the format by. */
  blurb: string;
  pool: DeckPoolKind;
  deckSize: number;
  /** Copies of one card name. Basic Energy is exempt where uncapped. */
  maxCopies: number;
  basicEnergyUncapped: boolean;
  /** Pocket draws from an Energy Zone, so energy cards are not in the deck. */
  usesEnergyCards: boolean;
  /** How many ACE SPEC cards the whole deck may hold. Zero bans them. */
  maxAceSpec: number;
  /** Radiant Pokemon are one per deck, whatever their names. */
  maxRadiant: number;
  /** Prism Star cards are one per name. */
  maxPrismStarPerName: number;
  /** Gym Leader Challenge bans everything with a rule box. */
  ruleBoxAllowed: boolean;
  /** Gym Leader Challenge decks hold Pokemon of a single energy type. */
  singleTypeOnly: boolean;
  openingHand: number;
  /**
   * Prize cards set out at the start of the game. Pocket has none: knocking a
   * Pokemon out scores points instead, which is what `pointsToWin` counts, so
   * "is this card prized" is a question only the physical game can ask.
   */
  prizeCount: number;
  usesPrizeCards: boolean;
  pointsToWin: number | null;
  /**
   * Whether the opening hand always contains a Basic Pokemon. Pocket deals one
   * every game, so a Pocket deck cannot mulligan however few Basics it plays.
   */
  guaranteedOpeningBasic: boolean;
  /** How many energy types a Pocket deck may register in its Energy Zone. */
  maxEnergyZoneTypes: number | null;
  guidance: DeckGuidance;
}

/**
 * The rule sets a deck can be built to.
 *
 * Standard and Expanded are the two tournament formats Play! Pokemon runs;
 * Unlimited is every card ever printed; Gym Leader Challenge is the singleton
 * format the community runs alongside them; Pocket is the phone game, which is
 * a different game rather than a smaller one — twenty cards, two copies, and no
 * energy in the deck at all.
 */
export const DECK_FORMATS: Record<DeckFormatId, DeckFormat> = {
  standard: {
    id: "standard",
    name: "Standard",
    short: "STD",
    game: "tcg",
    blurb: "The current rotation — the format almost every tournament uses.",
    pool: "standard",
    deckSize: 60,
    maxCopies: 4,
    basicEnergyUncapped: true,
    usesEnergyCards: true,
    maxAceSpec: 1,
    maxRadiant: 1,
    maxPrismStarPerName: 1,
    ruleBoxAllowed: true,
    singleTypeOnly: false,
    openingHand: 7,
    prizeCount: 6,
    usesPrizeCards: true,
    pointsToWin: null,
    guaranteedOpeningBasic: false,
    maxEnergyZoneTypes: null,
    guidance: {
      basicPokemonMin: 10,
      pokemonRange: [8, 20],
      supporterRange: [9, 18],
      energyRange: [5, 15],
    },
  },
  expanded: {
    id: "expanded",
    name: "Expanded",
    short: "EXP",
    game: "tcg",
    blurb: "Black & White onwards — every card since the 2011 reset.",
    pool: "expanded",
    deckSize: 60,
    maxCopies: 4,
    basicEnergyUncapped: true,
    usesEnergyCards: true,
    maxAceSpec: 1,
    maxRadiant: 1,
    maxPrismStarPerName: 1,
    ruleBoxAllowed: true,
    singleTypeOnly: false,
    openingHand: 7,
    prizeCount: 6,
    usesPrizeCards: true,
    pointsToWin: null,
    guaranteedOpeningBasic: false,
    maxEnergyZoneTypes: null,
    guidance: {
      basicPokemonMin: 10,
      pokemonRange: [10, 22],
      supporterRange: [8, 18],
      energyRange: [4, 15],
    },
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    short: "UNL",
    game: "tcg",
    blurb: "Every card ever printed, Base Set included.",
    pool: "unlimited",
    deckSize: 60,
    maxCopies: 4,
    basicEnergyUncapped: true,
    usesEnergyCards: true,
    maxAceSpec: 1,
    maxRadiant: 1,
    maxPrismStarPerName: 1,
    ruleBoxAllowed: true,
    singleTypeOnly: false,
    openingHand: 7,
    prizeCount: 6,
    usesPrizeCards: true,
    pointsToWin: null,
    guaranteedOpeningBasic: false,
    maxEnergyZoneTypes: null,
    guidance: {
      basicPokemonMin: 10,
      pokemonRange: [10, 24],
      supporterRange: [4, 18],
      energyRange: [4, 20],
    },
  },
  glc: {
    id: "glc",
    name: "Gym Leader Challenge",
    short: "GLC",
    game: "tcg",
    blurb:
      "One type, one copy of everything, and no rule-box Pokemon — singleton Expanded.",
    pool: "expanded",
    deckSize: 60,
    maxCopies: 1,
    basicEnergyUncapped: true,
    usesEnergyCards: true,
    maxAceSpec: 0,
    maxRadiant: 0,
    maxPrismStarPerName: 0,
    ruleBoxAllowed: false,
    singleTypeOnly: true,
    openingHand: 7,
    prizeCount: 6,
    usesPrizeCards: true,
    pointsToWin: null,
    guaranteedOpeningBasic: false,
    maxEnergyZoneTypes: null,
    guidance: {
      basicPokemonMin: 12,
      pokemonRange: [14, 24],
      supporterRange: [10, 20],
      energyRange: [8, 16],
    },
  },
  pocket: {
    id: "pocket",
    name: "TCG Pocket",
    short: "PKT",
    game: "pocket",
    blurb:
      "Twenty cards, two copies of a name, energy from the Energy Zone, and a race to three points.",
    pool: "pocket",
    deckSize: 20,
    maxCopies: 2,
    basicEnergyUncapped: false,
    usesEnergyCards: false,
    maxAceSpec: 0,
    maxRadiant: 0,
    maxPrismStarPerName: 0,
    ruleBoxAllowed: true,
    singleTypeOnly: false,
    openingHand: 5,
    prizeCount: 0,
    usesPrizeCards: false,
    pointsToWin: 3,
    guaranteedOpeningBasic: true,
    maxEnergyZoneTypes: 3,
    guidance: {
      basicPokemonMin: 6,
      pokemonRange: [10, 16],
      supporterRange: [2, 8],
      energyRange: null,
    },
  },
};

export const DECK_FORMAT_IDS = Object.keys(DECK_FORMATS) as DeckFormatId[];

export const DEFAULT_DECK_FORMAT_ID: DeckFormatId = "standard";

export function isDeckFormatId(value: string): value is DeckFormatId {
  return value in DECK_FORMATS;
}

/** The rules a deck is being judged by, falling back to Standard. */
export function deckFormat(id: string | undefined | null): DeckFormat {
  return id && isDeckFormatId(id)
    ? DECK_FORMATS[id]
    : DECK_FORMATS[DEFAULT_DECK_FORMAT_ID];
}

// =============================================================================
// Standard rotation
// =============================================================================

/**
 * Which regulation marks Standard has held, newest rotation first.
 *
 * Play! Pokemon rotates once a year in April, dropping the oldest mark: the
 * marks are letters printed in the card's bottom corner, so a rotation is
 * simply "everything from this letter on". This table decides which cards a
 * Standard deck may be built from, and needs a line adding each April.
 */
const STANDARD_ROTATIONS: { from: string; marks: string[] }[] = [
  { from: "2026-04-10", marks: ["H", "I", "J"] },
  { from: "2025-04-11", marks: ["G", "H", "I"] },
  { from: "2024-04-12", marks: ["F", "G", "H"] },
  { from: "2023-04-14", marks: ["E", "F", "G"] },
  { from: "2022-04-08", marks: ["D", "E", "F"] },
];

/**
 * The regulation marks a Standard deck may be built from today.
 *
 * A rotation only ever removes the oldest mark — a mark that ships mid-season
 * is legal the day it arrives — so any mark the catalogue reports that sorts
 * after the current run is folded in. That way a set released after this table
 * was last touched is playable rather than invisible.
 */
export function standardRegulationMarks(
  knownMarks: string[] = [],
  now: Date = new Date(),
): string[] {
  const today = now.toISOString().slice(0, 10);
  // The table is newest first, so the first entry whose date has passed is the
  // rotation in force. A date before every entry means a clock set wrong rather
  // than a format, and the oldest run is the safest thing to answer with.
  const current =
    STANDARD_ROTATIONS.find((rotation) => rotation.from <= today) ??
    STANDARD_ROTATIONS[STANDARD_ROTATIONS.length - 1];

  const newest = current.marks[current.marks.length - 1];
  const later = knownMarks
    .map((mark) => mark.trim().toUpperCase())
    .filter((mark) => /^[A-Z]$/.test(mark) && mark > newest);

  return [...current.marks, ...new Set(later)].sort();
}

/**
 * The set the Expanded pool starts at. Expanded is "Black & White onwards", and
 * TCGdex lists sets oldest first, so everything from this set's position in the
 * list is in the pool.
 */
export const EXPANDED_FIRST_SET_ID = "bw1";

/**
 * Sets that belong to Expanded but may not sort after {@link EXPANDED_FIRST_SET_ID}.
 *
 * The Black & White Black Star Promos started shipping a month before the set
 * that names the era, so cutting the list at Black & White by position would
 * leave them out — and the promos are Expanded-legal.
 */
export const EXPANDED_EXTRA_SET_IDS = ["bwp"];

// =============================================================================
// Banned cards
// =============================================================================

/**
 * A card a format does not allow, whatever else is legal about it.
 *
 * Reprints of a Trainer are the same card doing the same thing, so those are
 * matched by name alone. A banned Pokemon is a specific printing — Archeops
 * from Noble Victories is banned, every later Archeops is an ordinary card —
 * so those name the sets they mean, and a printing this list does not
 * recognise is left alone rather than guessed at.
 */
export interface BannedCard {
  name: string;
  /** Only these printings are the banned card. Omit where the name is enough. */
  setIds?: string[];
  formats: DeckFormatId[];
}

/**
 * The Expanded ban list as published by Play! Pokemon, which Gym Leader
 * Challenge inherits on top of its own restrictions. Standard has no ban list —
 * the rotation does that job — and Unlimited allows everything.
 *
 * This is a list that changes by announcement rather than on a schedule, so it
 * is worth re-checking against the official rules pages when a season turns.
 * Gym Leader Challenge is community-run and bans more than this; what is here
 * is the floor both formats agree on.
 */
export const BANNED_CARDS: BannedCard[] = [
  { name: "Archeops", setIds: ["bw3"], formats: ["expanded", "glc"] },
  { name: "Chip-Chip Ice Axe", formats: ["expanded", "glc"] },
  { name: "Delinquent", formats: ["expanded", "glc"] },
  { name: "Forest of Giant Plants", formats: ["expanded", "glc"] },
  { name: "Ghetsis", formats: ["expanded", "glc"] },
  { name: "Hex Maniac", formats: ["expanded", "glc"] },
  { name: "Lusamine", setIds: ["sm4"], formats: ["expanded", "glc"] },
  { name: "Lysandre's Trump Card", formats: ["expanded", "glc"] },
  { name: "Marshadow", setIds: ["sm35"], formats: ["expanded", "glc"] },
  { name: "Puzzle of Time", formats: ["expanded", "glc"] },
  { name: "Sableye", setIds: ["bw5"], formats: ["expanded", "glc"] },
  { name: "Unown", setIds: ["xy7"], formats: ["expanded", "glc"] },
  { name: "Wally", formats: ["expanded", "glc"] },
];

/** Whether this printing is on the format's ban list, and how to say so. */
export function bannedCardReason(
  name: string,
  setId: string,
  formatId: DeckFormatId,
): string | null {
  const wanted = name.trim().toLowerCase();
  const set = setId.trim().toLowerCase();

  const banned = BANNED_CARDS.find((entry) => {
    if (entry.name.toLowerCase() !== wanted) return false;
    if (!entry.formats.includes(formatId)) return false;
    // A printing-specific ban only applies to the printings it names.
    return entry.setIds
      ? entry.setIds.some((id) => id.toLowerCase() === set)
      : true;
  });

  return banned ? `Banned in ${DECK_FORMATS[formatId].name}` : null;
}

// =============================================================================
// Grouping
// =============================================================================

/**
 * How the binder is arranged. Card type is the way a deck list is written and
 * read; energy type is how a collection is sorted; the evolution line is how a
 * deck is actually built — a Stage 2 is meaningless without counting the Basics
 * underneath it.
 */
export type DeckGrouping = "card-type" | "energy-type" | "evolution-line";

export const DECK_GROUPINGS: {
  id: DeckGrouping;
  label: string;
  hint: string;
}[] = [
  {
    id: "card-type",
    label: "Card type",
    hint: "Pokemon, Trainers and Energy — the way a deck list is written",
  },
  {
    id: "energy-type",
    label: "Energy type",
    hint: "Grass, Fire, Water — the way a binder is sorted",
  },
  {
    id: "evolution-line",
    label: "Evolution line",
    hint: "Each Pokemon under the Basic it evolves from",
  },
];

export function isDeckGrouping(value: string): value is DeckGrouping {
  return DECK_GROUPINGS.some((grouping) => grouping.id === value);
}

// =============================================================================
// Defaults
// =============================================================================

export function emptyDeck(
  id: string,
  name: string,
  formatId: DeckFormatId = DEFAULT_DECK_FORMAT_ID,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
): Deck {
  const now = Date.now();
  return {
    id,
    name,
    formatId,
    language,
    typeFocus: null,
    entries: [],
    createdAt: now,
    updatedAt: now,
  };
}
