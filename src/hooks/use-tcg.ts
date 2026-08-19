"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  getCardsByDexId,
  getPocketSetIds,
  getTcgCard,
  getTcgEnergyTypes,
  getTcgRarities,
  getTcgRegulationMarks,
  getTcgSerie,
  getTcgSeriesWithSets,
  getTcgSet,
  getTcgSets,
  getTcgStages,
  getTcgSuffixes,
  getTcgTrainerTypes,
  searchTcgCards,
  type TcgCardFilters,
} from "@/lib/tcg";
import { seededShuffle } from "@/lib/utils";
import type {
  TcgCard,
  TcgCardBrief,
  TcgGame,
  TcgLanguage,
  TcgSerie,
  TcgSet,
  TcgSetBrief,
} from "@/types/tcg";
import {
  DEFAULT_TCG_LANGUAGE,
  FALLBACK_POCKET_SET_IDS,
  gameForCardId,
  gameForSetId,
} from "@/types/tcg";

/** Card data is versioned by set release, so it can be cached aggressively. */
const DAY = 1000 * 60 * 60 * 24;

export const CARDS_PER_PAGE = 36;

/**
 * Set ids belonging to Pokemon TCG Pocket. Everything not in this list is a
 * physical card, so most other card queries wait on it.
 */
export function usePocketSetIds(language: TcgLanguage = DEFAULT_TCG_LANGUAGE) {
  const { data } = useQuery({
    queryKey: ["tcg", "pocket-set-ids", language],
    queryFn: () => getPocketSetIds(language),
    staleTime: DAY,
    gcTime: DAY,
  });

  if (data) return data;
  return language === DEFAULT_TCG_LANGUAGE ? FALLBACK_POCKET_SET_IDS : [];
}

export function useTcgSets(language: TcgLanguage = DEFAULT_TCG_LANGUAGE) {
  return useQuery<TcgSetBrief[]>({
    queryKey: ["tcg", "sets", language],
    queryFn: () => getTcgSets(language),
    staleTime: DAY,
    gcTime: DAY,
  });
}

/**
 * How many of the newest sets a default browse opens on. Twelve is roughly the
 * last two years of releases in the physical game, and every Pocket set there
 * has ever been.
 */
export const LATEST_SET_COUNT = 12;

/**
 * Cards below which a set is a promo drop rather than an expansion. Promo sets
 * are mostly uncatalogued — TCGdex has no scan for them — so letting them into
 * the opening browse fills the first screen with stand-ins.
 */
export const EXPANSION_MIN_CARDS = 30;

/**
 * The newest sets of a game, as ids to search within. Browsing the catalogue in
 * printed order opens on 1999 promos — cards TCGdex mostly has no scan of —
 * which is nobody's starting point. TCGdex lists sets oldest-first, so the
 * newest ones are the tail.
 *
 * `isReady` is false until the set list has arrived: a search fired before then
 * would be the unscoped one, and its results would flash on screen.
 */
export function useLatestSetIds(
  game: "all" | TcgGame,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
  count = LATEST_SET_COUNT,
) {
  const { data: sets } = useTcgSets(language);
  const pocketSetIds = usePocketSetIds(language);

  return useMemo(() => {
    if (!sets) return { setIds: [] as string[], isReady: false };

    const scoped = sets.filter((set) => {
      if (set.cardCount.official < EXPANSION_MIN_CARDS) return false;
      if (game === "all") return true;
      return gameForSetId(set.id, pocketSetIds) === game;
    });

    return { setIds: scoped.slice(-count).map((set) => set.id), isReady: true };
  }, [sets, game, pocketSetIds, count]);
}

export function useTcgSeriesWithSets(
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  return useQuery<TcgSerie[]>({
    queryKey: ["tcg", "series-with-sets", language],
    queryFn: () => getTcgSeriesWithSets(language),
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgSerie(
  id: string | null,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  return useQuery<TcgSerie | null>({
    queryKey: ["tcg", "serie", id, language],
    queryFn: () => (id ? getTcgSerie(id, language) : null),
    enabled: id !== null,
    staleTime: DAY,
  });
}

export function useTcgSet(
  id: string | null,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  return useQuery<TcgSet | null>({
    queryKey: ["tcg", "set", id, language],
    queryFn: () => (id ? getTcgSet(id, language) : null),
    enabled: id !== null,
    staleTime: DAY,
  });
}

export function useTcgCard(
  id: string | null,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  return useQuery<TcgCard | null>({
    queryKey: ["tcg", "card", id, language],
    queryFn: () => (id ? getTcgCard(id, language) : null),
    enabled: id !== null,
    staleTime: DAY,
  });
}

/**
 * Paginated card search. Filtering happens on the API so the browser only ever
 * holds the pages that have actually been scrolled to.
 */
export function useTcgCardSearch(
  filters: TcgCardFilters,
  options?: {
    enabled?: boolean;
    itemsPerPage?: number;
    language?: TcgLanguage;
    /** Deals the results in a seeded random order instead of set order. */
    shuffleSeed?: number | null;
    /**
     * Sets to draw a page evenly from, rather than in one query. Asking the
     * API for several sets at once returns them one set after another, so a
     * page would be a slab of whichever set comes first however it was then
     * shuffled. Asking each set for its own slice is what makes a shuffled
     * page a genuine cross-section of the sets in play.
     */
    fanOutSetIds?: string[];
  },
) {
  const language = options?.language ?? DEFAULT_TCG_LANGUAGE;
  const pocketSetIds = usePocketSetIds(language);
  const itemsPerPage = options?.itemsPerPage ?? CARDS_PER_PAGE;
  const shuffleSeed = options?.shuffleSeed ?? null;

  const fanOutSetIds =
    options?.fanOutSetIds && options.fanOutSetIds.length > 0
      ? options.fanOutSetIds
      : null;
  const perSetItems = fanOutSetIds
    ? Math.max(1, Math.ceil(itemsPerPage / fanOutSetIds.length))
    : itemsPerPage;

  const query = useInfiniteQuery({
    queryKey: [
      "tcg",
      "cards",
      filters,
      pocketSetIds,
      itemsPerPage,
      language,
      fanOutSetIds,
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const slices = fanOutSetIds
        ? await Promise.all(
            fanOutSetIds.map((setId) =>
              searchTcgCards({
                ...filters,
                setIds: [setId],
                page: pageParam,
                itemsPerPage: perSetItems,
                pocketSetIds,
                language,
              }),
            ),
          )
        : [
            await searchTcgCards({
              ...filters,
              page: pageParam,
              itemsPerPage,
              pocketSetIds,
              language,
            }),
          ];

      const fetched = slices.flat();

      // A Pocket set shipping between deploys would otherwise leak into the
      // physical game's results, so the split is re-checked locally. Whether
      // more pages exist still depends on what the API returned, not on what
      // survived this check.
      return {
        cards: filters.game
          ? fetched.filter(
              (card) => gameForCardId(card.id, pocketSetIds) === filters.game,
            )
          : fetched,
        // One set running dry does not end the browse while the others still
        // have cards to give.
        hasMore: slices.some((slice) => slice.length >= perSetItems),
      };
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: options?.enabled ?? true,
    staleTime: DAY,
  });

  const cards = useMemo(() => {
    const pages = query.data?.pages ?? [];
    if (shuffleSeed === null) return pages.flatMap((page) => page.cards);

    // Each page is shuffled on its own rather than the list as a whole, so
    // scrolling to the next page never rearranges the cards already on screen.
    return pages.flatMap((page, index) =>
      seededShuffle(page.cards, shuffleSeed + index),
    );
  }, [query.data?.pages, shuffleSeed]);

  return { ...query, cards };
}

/** Every card depicting a Pokemon, split by game. */
export function useCardsByDexId(
  dexId: number | null,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  const pocketSetIds = usePocketSetIds(language);

  const query = useQuery<TcgCardBrief[]>({
    queryKey: ["tcg", "cards-by-dex-id", dexId, language],
    queryFn: () => (dexId === null ? [] : getCardsByDexId(dexId, { language })),
    enabled: dexId !== null,
    staleTime: DAY,
  });

  const byGame = useMemo(() => {
    const groups: Record<TcgGame, TcgCardBrief[]> = { tcg: [], pocket: [] };
    for (const card of query.data ?? []) {
      groups[gameForCardId(card.id, pocketSetIds)].push(card);
    }
    return groups;
  }, [query.data, pocketSetIds]);

  return { ...query, cards: query.data ?? [], byGame };
}

/**
 * Card matches for the global search overlay. Kept small and name-only so it
 * stays snappy while typing.
 */
export function useTcgCardQuickSearch(
  query: string,
  limit = 8,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  const trimmed = query.trim();

  return useQuery<TcgCardBrief[]>({
    queryKey: ["tcg", "quick-search", trimmed, limit, language],
    queryFn: () =>
      searchTcgCards({
        name: trimmed,
        sortField: "name",
        page: 1,
        itemsPerPage: limit,
        language,
      }),
    enabled: trimmed.length >= 2,
    staleTime: DAY,
    placeholderData: (previous) => previous,
  });
}

/**
 * Fetches one card's full details on demand, through the same cache the card
 * pages read. The deck builder needs them the moment a card is dropped into a
 * deck — a search result carries a name and a scan, while a deck has to know
 * the card's category, stage, retreat and regulation mark — and a card dragged
 * across the screen has usually been prefetched by the time it lands.
 */
export function useTcgCardFetcher(
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  const queryClient = useQueryClient();

  const resolve = useCallback(
    (id: string) =>
      queryClient.fetchQuery({
        queryKey: ["tcg", "card", id, language],
        queryFn: () => getTcgCard(id, language),
        staleTime: DAY,
      }),
    [queryClient, language],
  );

  const prefetch = useCallback(
    (id: string) => {
      void queryClient.prefetchQuery({
        queryKey: ["tcg", "card", id, language],
        queryFn: () => getTcgCard(id, language),
        staleTime: DAY,
      });
    },
    [queryClient, language],
  );

  return { resolve, prefetch };
}

export function useTcgRarities(language: TcgLanguage = DEFAULT_TCG_LANGUAGE) {
  return useQuery<string[]>({
    queryKey: ["tcg", "rarities", language],
    queryFn: () => getTcgRarities(language),
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgStages(language: TcgLanguage = DEFAULT_TCG_LANGUAGE) {
  return useQuery<string[]>({
    queryKey: ["tcg", "stages", language],
    queryFn: () => getTcgStages(language),
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgSuffixes(language: TcgLanguage = DEFAULT_TCG_LANGUAGE) {
  return useQuery<string[]>({
    queryKey: ["tcg", "suffixes", language],
    queryFn: () => getTcgSuffixes(language),
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgRegulationMarks(
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  return useQuery<string[]>({
    queryKey: ["tcg", "regulation-marks", language],
    queryFn: () => getTcgRegulationMarks(language),
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgTrainerTypes(
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  return useQuery<string[]>({
    queryKey: ["tcg", "trainer-types", language],
    queryFn: () => getTcgTrainerTypes(language),
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgEnergyTypes(
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
) {
  return useQuery<string[]>({
    queryKey: ["tcg", "energy-types", language],
    queryFn: () => getTcgEnergyTypes(language),
    staleTime: DAY,
    gcTime: DAY,
  });
}
