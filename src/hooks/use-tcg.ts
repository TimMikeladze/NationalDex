"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getCardsByDexId,
  getPocketSetIds,
  getTcgCard,
  getTcgRarities,
  getTcgSerie,
  getTcgSeriesWithSets,
  getTcgSet,
  getTcgSets,
  getTcgStages,
  getTcgSuffixes,
  searchTcgCards,
  type TcgCardFilters,
} from "@/lib/tcg";
import type {
  TcgCard,
  TcgCardBrief,
  TcgGame,
  TcgSerie,
  TcgSet,
  TcgSetBrief,
} from "@/types/tcg";
import { FALLBACK_POCKET_SET_IDS, gameForCardId } from "@/types/tcg";

/** Card data is versioned by set release, so it can be cached aggressively. */
const DAY = 1000 * 60 * 60 * 24;

export const CARDS_PER_PAGE = 36;

/**
 * Set ids belonging to Pokemon TCG Pocket. Everything not in this list is a
 * physical card, so most other card queries wait on it.
 */
export function usePocketSetIds() {
  const { data } = useQuery({
    queryKey: ["tcg", "pocket-set-ids"],
    queryFn: getPocketSetIds,
    staleTime: DAY,
    gcTime: DAY,
  });

  return data ?? FALLBACK_POCKET_SET_IDS;
}

export function useTcgSets() {
  return useQuery<TcgSetBrief[]>({
    queryKey: ["tcg", "sets"],
    queryFn: getTcgSets,
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgSeriesWithSets() {
  return useQuery<TcgSerie[]>({
    queryKey: ["tcg", "series-with-sets"],
    queryFn: getTcgSeriesWithSets,
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgSerie(id: string | null) {
  return useQuery<TcgSerie | null>({
    queryKey: ["tcg", "serie", id],
    queryFn: () => (id ? getTcgSerie(id) : null),
    enabled: id !== null,
    staleTime: DAY,
  });
}

export function useTcgSet(id: string | null) {
  return useQuery<TcgSet | null>({
    queryKey: ["tcg", "set", id],
    queryFn: () => (id ? getTcgSet(id) : null),
    enabled: id !== null,
    staleTime: DAY,
  });
}

export function useTcgCard(id: string | null) {
  return useQuery<TcgCard | null>({
    queryKey: ["tcg", "card", id],
    queryFn: () => (id ? getTcgCard(id) : null),
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
  options?: { enabled?: boolean; itemsPerPage?: number },
) {
  const pocketSetIds = usePocketSetIds();
  const itemsPerPage = options?.itemsPerPage ?? CARDS_PER_PAGE;

  const query = useInfiniteQuery({
    queryKey: ["tcg", "cards", filters, pocketSetIds, itemsPerPage],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const cards = await searchTcgCards({
        ...filters,
        page: pageParam,
        itemsPerPage,
        pocketSetIds,
      });

      // A Pocket set shipping between deploys would otherwise leak into the
      // physical game's results, so the split is re-checked locally. Whether
      // more pages exist still depends on what the API returned, not on what
      // survived this check.
      return {
        cards: filters.game
          ? cards.filter(
              (card) => gameForCardId(card.id, pocketSetIds) === filters.game,
            )
          : cards,
        fetched: cards.length,
      };
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.fetched < itemsPerPage ? undefined : allPages.length + 1,
    enabled: options?.enabled ?? true,
    staleTime: DAY,
  });

  const cards = useMemo(
    () => query.data?.pages.flatMap((page) => page.cards) ?? [],
    [query.data?.pages],
  );

  return { ...query, cards };
}

/** Every card depicting a Pokemon, split by game. */
export function useCardsByDexId(dexId: number | null) {
  const pocketSetIds = usePocketSetIds();

  const query = useQuery<TcgCardBrief[]>({
    queryKey: ["tcg", "cards-by-dex-id", dexId],
    queryFn: () => (dexId === null ? [] : getCardsByDexId(dexId)),
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
export function useTcgCardQuickSearch(query: string, limit = 8) {
  const trimmed = query.trim();

  return useQuery<TcgCardBrief[]>({
    queryKey: ["tcg", "quick-search", trimmed, limit],
    queryFn: () =>
      searchTcgCards({
        name: trimmed,
        sortField: "name",
        page: 1,
        itemsPerPage: limit,
      }),
    enabled: trimmed.length >= 2,
    staleTime: DAY,
    placeholderData: (previous) => previous,
  });
}

export function useTcgRarities() {
  return useQuery<string[]>({
    queryKey: ["tcg", "rarities"],
    queryFn: getTcgRarities,
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgStages() {
  return useQuery<string[]>({
    queryKey: ["tcg", "stages"],
    queryFn: getTcgStages,
    staleTime: DAY,
    gcTime: DAY,
  });
}

export function useTcgSuffixes() {
  return useQuery<string[]>({
    queryKey: ["tcg", "suffixes"],
    queryFn: getTcgSuffixes,
    staleTime: DAY,
    gcTime: DAY,
  });
}
