import { parseAsArrayOf, parseAsInteger, parseAsString } from "nuqs";
import type { TcgCardFilters, TcgSortField, TcgSortOrder } from "@/lib/tcg";
import type { TcgGame, TcgVariantKey } from "@/types/tcg";
import { DEFAULT_TCG_LANGUAGE, TCG_GAME_FULL_LABELS } from "@/types/tcg";

export type GameFilter = "all" | TcgGame;

/** The card browser's filter state, as it is held in the URL. */
export interface CardFilterState {
  q: string;
  game: string;
  set: string;
  types: string[];
  rarities: string[];
  category: string;
  stage: string;
  suffix: string;
  regulationMark: string;
  trainerType: string;
  energyType: string;
  /** Printings the card must exist in, e.g. `holo`, `reverse`. */
  variants: string[];
  illustrator: string;
  hpMin: number | null;
  hpMax: number | null;
  dexId: number | null;
  /**
   * The order the user asked for, or empty when they have not asked: an open
   * browse is shuffled unless it says otherwise, so the field has to be able
   * to say "set order" out loud.
   */
  sort: string;
  /** How much of the catalogue is in play — the newest sets, or all of it. */
  scope: string;
  /**
   * Seed for a shuffled browse, or null to let the browse draw its own. A seed
   * that made it into the URL pins that shuffle, so it can be shared,
   * reloaded, or handed to the swipe deck and still deal the same cards.
   */
  seed: number | null;
  /** Which language's catalogue is being browsed. */
  lang: string;
}

/**
 * How much of the catalogue a browse that is being read in order runs through:
 * the newest sets rather than 1999 promos. Widening to the whole catalogue is
 * one tap, and lives in the URL so the choice survives a share or a move
 * between the grid and the deck. A shuffled browse ignores it — it draws its
 * own sets from the whole catalogue instead.
 */
export type CardScope = "latest" | "all";

export function isCardScope(value: string): value is CardScope {
  return value === "latest" || value === "all";
}

/**
 * Whether narrowing to the newest sets means anything here. Asking for a set,
 * a name or a Pokemon is asking about the whole catalogue, so those searches
 * always run against all of it.
 */
export function scopeApplies(filters: CardFilterState): boolean {
  return (
    filters.set.length === 0 &&
    filters.q.trim().length === 0 &&
    filters.dexId === null
  );
}

/** Null clears a filter, which is also how it leaves the URL. */
export type CardFilterUpdate = Partial<{
  [K in keyof CardFilterState]: CardFilterState[K] | null;
}>;

/** Short labels — the full names wrap to three lines on a phone. */
export const GAME_OPTIONS: {
  id: GameFilter;
  label: string;
  title: string;
}[] = [
  { id: "all", label: "All", title: "Both card games" },
  { id: "tcg", label: "TCG", title: TCG_GAME_FULL_LABELS.tcg },
  { id: "pocket", label: "Pocket", title: TCG_GAME_FULL_LABELS.pocket },
];

export const HP_PRESETS = [
  { label: "Any", min: null, max: null },
  { label: "≤ 60", min: null, max: 60 },
  { label: "70-120", min: 70, max: 120 },
  { label: "130-200", min: 130, max: 200 },
  { label: "210+", min: 210, max: null },
];

/** Set order, as the sort control names it. */
export const SET_ORDER_SORT_VALUE = "default";

export const SORT_OPTIONS: {
  value: string;
  label: string;
  field: TcgSortField | null;
  order: TcgSortOrder;
}[] = [
  { value: "default", label: "Set order", field: null, order: "ASC" },
  { value: "name-asc", label: "Name A-Z", field: "name", order: "ASC" },
  { value: "name-desc", label: "Name Z-A", field: "name", order: "DESC" },
  { value: "hp-desc", label: "HP high to low", field: "hp", order: "DESC" },
  { value: "hp-asc", label: "HP low to high", field: "hp", order: "ASC" },
  { value: "id-asc", label: "Card ID", field: "id", order: "ASC" },
  {
    value: "rarity-desc",
    label: "Rarest first",
    field: "rarity",
    order: "DESC",
  },
  {
    value: "rarity-asc",
    label: "Commonest first",
    field: "rarity",
    order: "ASC",
  },
];

/**
 * A shuffle, as the sort control names it. The API has no random order, so
 * this is not one of `SORT_OPTIONS` — it is applied to the results instead,
 * and choosing it clears whatever sort field was set. Order is one choice
 * though, so the control has to be able to say "random".
 */
export const RANDOM_SORT_VALUE = "random";

/**
 * A fresh shuffle. `Math.random` rather than the clock, so shuffling twice in
 * the same millisecond — a double tap, a grid and a deck mounting together —
 * still deals two different draws.
 */
export function newShuffleSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * What the sort control is currently set to, which is not always what the URL
 * says. The catalogue is far too big to read front to back, and set order
 * would deal the same first screen of 1999 promos on every visit, so an open
 * browse opens on a shuffle. Asking for a set, a name or a Pokemon is asking
 * about particular cards, and those are read in order.
 *
 * Choosing an order writes it, including set order, so the choice outlives the
 * default. A seed on its own is a shuffle that was shared before the sort
 * field could say so.
 */
export function cardOrderValue(filters: CardFilterState): string {
  if (filters.sort) return filters.sort;
  if (filters.seed !== null) return RANDOM_SORT_VALUE;
  return scopeApplies(filters) ? RANDOM_SORT_VALUE : SET_ORDER_SORT_VALUE;
}

/** Whether the results are being dealt in a random order. */
export function isRandomOrder(filters: CardFilterState): boolean {
  return cardOrderValue(filters) === RANDOM_SORT_VALUE;
}

export function isGameFilter(value: string): value is GameFilter {
  return value === "all" || value === "tcg" || value === "pocket";
}

/**
 * The URL shape of the filter state. Shared so every way of reading the card
 * catalogue — the grid, the deck — answers to the same query string, and a
 * filtered search can be handed from one to the other by keeping the URL.
 */
export const CARD_FILTER_PARSERS = {
  q: parseAsString.withDefault(""),
  game: parseAsString.withDefault("all"),
  set: parseAsString.withDefault(""),
  types: parseAsArrayOf(parseAsString).withDefault([]),
  rarities: parseAsArrayOf(parseAsString).withDefault([]),
  category: parseAsString.withDefault(""),
  stage: parseAsString.withDefault(""),
  suffix: parseAsString.withDefault(""),
  regulationMark: parseAsString.withDefault(""),
  trainerType: parseAsString.withDefault(""),
  energyType: parseAsString.withDefault(""),
  variants: parseAsArrayOf(parseAsString).withDefault([]),
  illustrator: parseAsString.withDefault(""),
  hpMin: parseAsInteger,
  hpMax: parseAsInteger,
  dexId: parseAsInteger,
  sort: parseAsString.withDefault(""),
  scope: parseAsString.withDefault("latest"),
  seed: parseAsInteger,
  lang: parseAsString.withDefault(DEFAULT_TCG_LANGUAGE),
};

export function sortOptionFor(value: string) {
  return (
    SORT_OPTIONS.find((option) => option.value === value) ?? SORT_OPTIONS[0]
  );
}

/**
 * Turns the URL's filter state into the query the card API is asked.
 *
 * `scopedSetIds` narrows the search to a slice of the catalogue — the newest
 * sets, or the sets a shuffle drew. Leave it out to search all of it. Deciding
 * whether a scope applies at all is the caller's job, because it depends on
 * data (the set list) the filter state does not carry.
 */
export function toCardSearchFilters(
  filters: CardFilterState,
  scopedSetIds?: string[],
): TcgCardFilters {
  const game: GameFilter = isGameFilter(filters.game) ? filters.game : "all";
  const sort = sortOptionFor(filters.sort);

  return {
    name: filters.q || undefined,
    game: game === "all" ? null : game,
    setIds: filters.set
      ? [filters.set]
      : scopedSetIds && scopedSetIds.length > 0
        ? scopedSetIds
        : undefined,
    types: filters.types.length > 0 ? filters.types : undefined,
    rarities: filters.rarities.length > 0 ? filters.rarities : undefined,
    category: filters.category || null,
    stage: filters.stage || null,
    suffix: filters.suffix || null,
    regulationMark: filters.regulationMark || null,
    trainerType: filters.trainerType || null,
    energyType: filters.energyType || null,
    variants:
      filters.variants.length > 0
        ? (filters.variants as TcgVariantKey[])
        : undefined,
    illustrator: filters.illustrator || null,
    dexId: filters.dexId,
    hpMin: filters.hpMin,
    hpMax: filters.hpMax,
    sortField: sort.field,
    sortOrder: sort.order,
  };
}
