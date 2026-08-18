"use client";

import { useMemo } from "react";
import {
  EXPANSION_MIN_CARDS,
  useLatestSetIds,
  usePocketSetIds,
  useTcgSets,
} from "@/hooks/use-tcg";
import { seededShuffle } from "@/lib/utils";
import type { TcgLanguage } from "@/types/tcg";
import { gameForSetId } from "@/types/tcg";
import {
  type CardFilterState,
  type CardScope,
  type GameFilter,
  isCardScope,
  scopeApplies,
} from "./filters";

/**
 * How many sets a shuffle draws from. Asking the API for every set at once
 * would just deal the oldest of them first, so a shuffle picks a handful of
 * sets and then shuffles the cards that come back.
 */
const RANDOM_SET_SAMPLE = 6;

export interface CardScopeState {
  scope: CardScope;
  /** Whether narrowing the catalogue decides anything for this search. */
  scopeMatters: boolean;
  /** Whether the browse is currently pinned to the newest sets. */
  scopeIsLive: boolean;
  /** Whether the browse is currently drawing from randomly chosen sets. */
  randomIsLive: boolean;
  /** The sets the search runs within, or undefined for the whole catalogue. */
  scopedSetIds: string[] | undefined;
  /**
   * Sets a page should be drawn evenly from rather than in one query. Only a
   * shuffle asks for this: without it a page is whichever of its sets sorts
   * first, and shuffling that only reorders one set's cards.
   */
  fanOutSetIds: string[] | undefined;
  /** Seed the results are dealt in, or null to read them in set order. */
  shuffleSeed: number | null;
  /** False while the set list a scope depends on is still loading. */
  isReady: boolean;
}

/**
 * Which slice of the catalogue a card search runs against. The grid and the
 * swipe deck read the same query string, so they work this out the same way:
 * a plain browse opens on the newest sets, a shuffle draws from sets picked at
 * random, and asking for a set, a name or a Pokemon means the whole catalogue.
 */
export function useCardScope(
  filters: CardFilterState,
  game: GameFilter,
  language: TcgLanguage,
): CardScopeState {
  const scope: CardScope = isCardScope(filters.scope)
    ? filters.scope
    : "latest";
  const seed = filters.seed;

  const scopeMatters = scopeApplies(filters);
  // A shuffle picks its own sets, which replaces the newest-sets default.
  const randomIsLive = seed !== null && scopeMatters;
  const scopeIsLive = scope === "latest" && scopeMatters && !randomIsLive;

  const { setIds: latestSetIds, isReady: latestSetsReady } = useLatestSetIds(
    game,
    language,
  );
  const { data: sets } = useTcgSets(language);
  const pocketSetIds = usePocketSetIds(language);

  // Undefined until the set list lands, which is how a shuffle knows to wait
  // rather than firing an unscoped search first. An empty draw is a real
  // answer — a catalogue with no expansions to pick from — and reads as the
  // whole catalogue rather than as a search that never arrives.
  const randomSetIds = useMemo(() => {
    if (seed === null || !randomIsLive || !sets) return undefined;

    // Promo drops are mostly unscanned, so a shuffle that landed on one would
    // deal a screen of stand-ins.
    const pool = sets.filter(
      (set) =>
        set.cardCount.official >= EXPANSION_MIN_CARDS &&
        (game === "all" || gameForSetId(set.id, pocketSetIds) === game),
    );

    return seededShuffle(
      pool.map((set) => set.id),
      seed,
    ).slice(0, RANDOM_SET_SAMPLE);
  }, [seed, randomIsLive, sets, game, pocketSetIds]);

  const scopedSetIds = randomIsLive
    ? randomSetIds
    : scopeIsLive
      ? latestSetIds
      : undefined;

  return {
    scope,
    scopeMatters,
    scopeIsLive,
    randomIsLive,
    scopedSetIds,
    fanOutSetIds: randomIsLive ? randomSetIds : undefined,
    // Shuffling the results themselves works whatever else is narrowing them,
    // so a shuffle inside a single set still reorders that set.
    shuffleSeed: seed,
    isReady: randomIsLive
      ? randomSetIds !== undefined
      : !scopeIsLive || latestSetsReady,
  };
}
