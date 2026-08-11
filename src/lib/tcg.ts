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
  DEFAULT_TCG_LANGUAGE,
  FALLBACK_POCKET_SET_IDS,
  POCKET_SERIE_ID,
  type TcgCard,
  type TcgCardBrief,
  type TcgGame,
  type TcgLanguage,
  type TcgSerie,
  type TcgSerieBrief,
  type TcgSet,
  type TcgSetBrief,
  type TcgVariantKey,
} from "@/types/tcg";

const TCG_API_BASE = "https://api.tcgdex.net/v2";

/** Card data barely changes, so responses are cached for a day. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

async function tcgFetch<T>(
  path: string,
  params?: URLSearchParams,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  const query = params?.toString();
  const url = `${TCG_API_BASE}/${language}${path}${query ? `?${query}` : ""}`;

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

export async function getTcgSeries(
  language?: TcgLanguage,
): Promise<TcgSerieBrief[]> {
  return (
    (await tcgFetch<TcgSerieBrief[]>("/series", undefined, language)) ?? []
  );
}

export async function getTcgSerie(
  id: string,
  language?: TcgLanguage,
): Promise<TcgSerie | null> {
  return tcgFetch<TcgSerie>(
    `/series/${encodeURIComponent(id)}`,
    undefined,
    language,
  );
}

export async function getTcgSets(
  language?: TcgLanguage,
): Promise<TcgSetBrief[]> {
  return (await tcgFetch<TcgSetBrief[]>("/sets", undefined, language)) ?? [];
}

export async function getTcgSet(
  id: string,
  language?: TcgLanguage,
): Promise<TcgSet | null> {
  return tcgFetch<TcgSet>(
    `/sets/${encodeURIComponent(id)}`,
    undefined,
    language,
  );
}

/**
 * Set ids belonging to Pokemon TCG Pocket. Everything else is the physical
 * game, which is how cards get split between the two without a per-card lookup.
 *
 * Pocket has only ever been catalogued in English, so any other language
 * answers 404 and gets an empty list — falling back to the English set ids
 * there would claim Pocket sets a Japanese browse can never return.
 */
export async function getPocketSetIds(
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
): Promise<string[]> {
  try {
    const serie = await getTcgSerie(POCKET_SERIE_ID, language);
    const ids = serie?.sets?.map((set) => set.id) ?? [];
    if (ids.length > 0) return ids;
  } catch {
    // Fall through to the shipped list.
  }
  return language === DEFAULT_TCG_LANGUAGE ? FALLBACK_POCKET_SET_IDS : [];
}

/** Every series, each with its sets, newest series first. */
export async function getTcgSeriesWithSets(
  language?: TcgLanguage,
): Promise<TcgSerie[]> {
  const series = await getTcgSeries(language);
  const detailed = await Promise.all(
    series.map((serie) => getTcgSerie(serie.id, language).catch(() => null)),
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
  trainerType?: string | null;
  energyType?: string | null;
  /** Printings the card must exist in, AND-ed (a card can have several). */
  variants?: TcgVariantKey[];
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
  /** Which language's catalogue to search — they hold different sets. */
  language?: TcgLanguage;
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
    trainerType,
    energyType,
    variants,
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
    // Pocket exists in the English catalogue only. Asking for it elsewhere has
    // to match nothing rather than send an empty `set=eq:` and hope.
    params.append(
      "set",
      pocketSetIds.length > 0 ? `eq:${pocketSetIds.join("|")}` : "eq:__none__",
    );
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
  if (trainerType) params.append("trainerType", `eq:${trainerType}`);
  if (energyType) params.append("energyType", `eq:${energyType}`);

  // The variant flags are nested booleans, which the query engine only matches
  // as text — `eq:true` finds nothing, while a plain `true` matches.
  for (const variant of variants ?? []) {
    params.append(`variants.${variant}`, "true");
  }

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
  return (
    (await tcgFetch<TcgCardBrief[]>("/cards", params, options.language)) ?? []
  );
}

export async function getTcgCard(
  id: string,
  language?: TcgLanguage,
): Promise<TcgCard | null> {
  return tcgFetch<TcgCard>(
    `/cards/${encodeURIComponent(id)}`,
    undefined,
    language,
  );
}

/** Every card depicting a National Dex number, newest sets last. */
export async function getCardsByDexId(
  dexId: number,
  options?: { limit?: number; language?: TcgLanguage },
): Promise<TcgCardBrief[]> {
  return searchTcgCards({
    dexId,
    page: 1,
    // Well clear of the ~300 cards the most-printed Pokemon have.
    itemsPerPage: options?.limit ?? 600,
    language: options?.language,
  });
}

// =============================================================================
// Facets
// =============================================================================

/**
 * Distinct values of a card field, for building filter controls. Facets are
 * per-language: a Japanese browse has its own rarity ladder.
 */
async function getCardFacet(
  endpoint: string,
  language?: TcgLanguage,
): Promise<string[]> {
  const values = await tcgFetch<Array<string | number>>(
    `/${endpoint}`,
    undefined,
    language,
  );
  return (values ?? []).map(String).filter(Boolean);
}

export function getTcgRarities(language?: TcgLanguage) {
  return getCardFacet("rarities", language);
}

export function getTcgStages(language?: TcgLanguage) {
  return getCardFacet("stages", language);
}

export function getTcgSuffixes(language?: TcgLanguage) {
  return getCardFacet("suffixes", language);
}

export function getTcgRegulationMarks(language?: TcgLanguage) {
  return getCardFacet("regulation-marks", language);
}

export function getTcgIllustrators(language?: TcgLanguage) {
  return getCardFacet("illustrators", language);
}

export function getTcgTrainerTypes(language?: TcgLanguage) {
  return getCardFacet("trainer-types", language);
}

export function getTcgEnergyTypes(language?: TcgLanguage) {
  return getCardFacet("energy-types", language);
}

export function getTcgVariants(language?: TcgLanguage) {
  return getCardFacet("variants", language);
}
