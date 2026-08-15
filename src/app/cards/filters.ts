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
  sort: string;
  /** How much of the catalogue is in play — the newest sets, or all of it. */
  scope: string;
  /** Which language's catalogue is being browsed. */
  lang: string;
}

/**
 * Browsing opens on the newest sets rather than on 1999 promos. Widening to the
 * whole catalogue is one tap, and lives in the URL so the choice survives a
 * share or a move between the grid and the deck.
 */
export type CardScope = "latest" | "all";

export const CARD_SCOPE_OPTIONS: {
  id: CardScope;
  label: string;
  title: string;
}[] = [
  {
    id: "latest",
    label: "Newest sets",
    title: "Cards from the most recent expansions",
  },
  { id: "all", label: "All sets", title: "Every card ever printed" },
];

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
  sort: parseAsString.withDefault("default"),
  scope: parseAsString.withDefault("latest"),
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
 * `latestSetIds` is what the newest-sets scope searches within; leave it out to
 * search the whole catalogue. It is only used where a scope makes sense — a
 * name search or a chosen set always means the whole catalogue.
 */
export function toCardSearchFilters(
  filters: CardFilterState,
  latestSetIds?: string[],
): TcgCardFilters {
  const game: GameFilter = isGameFilter(filters.game) ? filters.game : "all";
  const sort = sortOptionFor(filters.sort);
  const scopedToLatest =
    filters.scope !== "all" &&
    scopeApplies(filters) &&
    latestSetIds !== undefined &&
    latestSetIds.length > 0;

  return {
    name: filters.q || undefined,
    game: game === "all" ? null : game,
    setIds: filters.set
      ? [filters.set]
      : scopedToLatest
        ? latestSetIds
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
