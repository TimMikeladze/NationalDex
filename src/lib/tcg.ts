/**
 * TCGdex API client.
 *
 * Covers both the physical Pokemon TCG and Pokemon TCG Pocket from one
 * database. Filtering, sorting and pagination all happen server-side through
 * query parameters, so a card browser never has to hold 20,000 cards in memory.
 *
 * Query syntax (as implemented by the API's query engine):
 * - `field=eq:value`      exact match, and "array contains" for array fields
 * - `field=value`         case-insensitive contains, with `*` anchoring
 *                         (`value*` = starts with, `*value` = ends with)
 * - `field=not:value`     the negation of the above
 * - `field=gte:10`        numeric comparisons (`gt`, `gte`, `lt`, `lte`)
 * - `a|b`                 several values in one parameter, OR-ed together
 * - repeating a parameter AND-s the conditions
 * - `sort:field` / `sort:order`, `pagination:page` / `pagination:itemsPerPage`
 */

import {
  FALLBACK_POCKET_SET_IDS,
  POCKET_SERIE_ID,
  type TcgCard,
  type TcgCardBrief,
  type TcgGame,
  type TcgSerie,
  type TcgSerieBrief,
  type TcgSet,
  type TcgSetBrief,
} from "@/types/tcg";

const TCG_API_BASE = "https://api.tcgdex.net/v2/en";

/** Card data barely changes, so responses are cached for a day. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

async function tcgFetch<T>(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  const url = `${TCG_API_BASE}${path}${query ? `?${query}` : ""}`;

  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  // The API answers 404 for unknown ids rather than an error body.
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`TCGdex request failed (${res.status}): ${path}`);
  }

  return (await res.json()) as T;
}

// =============================================================================
// Series and sets
// =============================================================================

export async function getTcgSeries(): Promise<TcgSerieBrief[]> {
  return (await tcgFetch<TcgSerieBrief[]>("/series")) ?? [];
}

export async function getTcgSerie(id: string): Promise<TcgSerie | null> {
  return tcgFetch<TcgSerie>(`/series/${encodeURIComponent(id)}`);
}

export async function getTcgSets(): Promise<TcgSetBrief[]> {
  return (await tcgFetch<TcgSetBrief[]>("/sets")) ?? [];
}

export async function getTcgSet(id: string): Promise<TcgSet | null> {
  return tcgFetch<TcgSet>(`/sets/${encodeURIComponent(id)}`);
}

/**
 * Set ids belonging to Pokemon TCG Pocket. Everything else is the physical
 * game, which is how cards get split between the two without a per-card lookup.
 */
export async function getPocketSetIds(): Promise<string[]> {
  try {
    const serie = await getTcgSerie(POCKET_SERIE_ID);
    const ids = serie?.sets?.map((set) => set.id) ?? [];
    return ids.length > 0 ? ids : FALLBACK_POCKET_SET_IDS;
  } catch {
    return FALLBACK_POCKET_SET_IDS;
  }
}

/** Every series, each with its sets, newest series first. */
export async function getTcgSeriesWithSets(): Promise<TcgSerie[]> {
  const series = await getTcgSeries();
  const detailed = await Promise.all(
    series.map((serie) => getTcgSerie(serie.id).catch(() => null)),
  );
  return detailed.filter((serie): serie is TcgSerie => serie !== null);
}

// =============================================================================
// Cards
// =============================================================================

export type TcgSortField = "name" | "id" | "localId" | "hp" | "rarity";
export type TcgSortOrder = "ASC" | "DESC";

export interface TcgCardFilters {
  /** Matched against the card name, case-insensitively and partially. */
  name?: string;
  /** Restrict to one of the two games. */
  game?: TcgGame | null;
  /** Set ids the card must belong to. */
  setIds?: string[];
  /** Energy types, OR-ed together. */
  types?: string[];
  /** Rarities, OR-ed together. */
  rarities?: string[];
  category?: string | null;
  stage?: string | null;
  suffix?: string | null;
  illustrator?: string | null;
  regulationMark?: string | null;
  /** National Dex number the card depicts. */
  dexId?: number | null;
  hpMin?: number | null;
  hpMax?: number | null;
  sortField?: TcgSortField | null;
  sortOrder?: TcgSortOrder;
}

export interface TcgCardQueryOptions extends TcgCardFilters {
  page?: number;
  itemsPerPage?: number;
  /** Pocket set ids, so the game filter stays correct as new sets ship. */
  pocketSetIds?: string[];
}

/**
 * Builds the query string for a card search.
 *
 * The game filter is expressed through set ids: Pocket narrows to its own sets,
 * while the physical game excludes anything whose id starts with a Pocket set
 * prefix — the API has no "series" filter on cards.
 */
export function buildCardSearchParams(
  options: TcgCardQueryOptions,
): URLSearchParams {
  const {
    name,
    game,
    setIds,
    types,
    rarities,
    category,
    stage,
    suffix,
    illustrator,
    regulationMark,
    dexId,
    hpMin,
    hpMax,
    sortField,
    sortOrder = "ASC",
    page,
    itemsPerPage,
    pocketSetIds = FALLBACK_POCKET_SET_IDS,
  } = options;

  const params = new URLSearchParams();

  if (name?.trim()) {
    params.append("name", name.trim());
  }

  if (setIds && setIds.length > 0) {
    params.append("set", `eq:${setIds.join("|")}`);
  } else if (game === "pocket") {
    params.append("set", `eq:${pocketSetIds.join("|")}`);
  } else if (game === "tcg") {
    for (const setId of pocketSetIds) {
      params.append("id", `not:${setId.toLowerCase()}-*`);
    }
  }

  if (types && types.length > 0) {
    params.append("types", `eq:${types.join("|")}`);
  }

  if (rarities && rarities.length > 0) {
    params.append("rarity", `eq:${rarities.join("|")}`);
  }

  if (category) params.append("category", `eq:${category}`);
  if (stage) params.append("stage", `eq:${stage}`);
  if (suffix) params.append("suffix", `eq:${suffix}`);
  if (illustrator) params.append("illustrator", illustrator);
  if (regulationMark) {
    params.append("regulationMark", `eq:${regulationMark}`);
  }
  if (typeof dexId === "number") params.append("dexId", `eq:${dexId}`);
  if (typeof hpMin === "number") params.append("hp", `gte:${hpMin}`);
  if (typeof hpMax === "number") params.append("hp", `lte:${hpMax}`);

  if (sortField) {
    params.append("sort:field", sortField);
    params.append("sort:order", sortOrder);
  }

  if (typeof page === "number") {
    params.append("pagination:page", String(page));
  }
  if (typeof itemsPerPage === "number") {
    params.append("pagination:itemsPerPage", String(itemsPerPage));
  }

  return params;
}

/**
 * Searches cards. Always pass pagination — the unfiltered card list is tens of
 * thousands of entries.
 */
export async function searchTcgCards(
  options: TcgCardQueryOptions,
): Promise<TcgCardBrief[]> {
  const params = buildCardSearchParams(options);
  return (await tcgFetch<TcgCardBrief[]>("/cards", params)) ?? [];
}

export async function getTcgCard(id: string): Promise<TcgCard | null> {
  return tcgFetch<TcgCard>(`/cards/${encodeURIComponent(id)}`);
}

/** Every card depicting a National Dex number, newest sets last. */
export async function getCardsByDexId(
  dexId: number,
  options?: { limit?: number },
): Promise<TcgCardBrief[]> {
  return searchTcgCards({
    dexId,
    page: 1,
    // Well clear of the ~300 cards the most-printed Pokemon have.
    itemsPerPage: options?.limit ?? 600,
  });
}

// =============================================================================
// Facets
// =============================================================================

/** Distinct values of a card field, for building filter controls. */
async function getCardFacet(endpoint: string): Promise<string[]> {
  const values = await tcgFetch<Array<string | number>>(`/${endpoint}`);
  return (values ?? []).map(String).filter(Boolean);
}

export function getTcgRarities() {
  return getCardFacet("rarities");
}

export function getTcgStages() {
  return getCardFacet("stages");
}

export function getTcgSuffixes() {
  return getCardFacet("suffixes");
}

export function getTcgRegulationMarks() {
  return getCardFacet("regulation-marks");
}

export function getTcgIllustrators() {
  return getCardFacet("illustrators");
}
