"use client";

import { useMemo } from "react";
import {
  usePocketSetIds,
  useTcgRegulationMarks,
  useTcgSets,
} from "@/hooks/use-tcg";
import type { DeckPoolContext } from "@/lib/deck";
import type { TcgCardFilters } from "@/lib/tcg";
import type { DeckFormat } from "@/types/deck";
import { EXPANDED_FIRST_SET_ID, standardRegulationMarks } from "@/types/deck";
import type { TcgLanguage } from "@/types/tcg";
import { DEFAULT_TCG_LANGUAGE } from "@/types/tcg";

export interface DeckPool {
  /** What a card is judged against once it is in the deck. */
  context: DeckPoolContext;
  /** What the card search is narrowed to, so the results are buildable. */
  filters: Partial<TcgCardFilters>;
  /** False while the set list the pool is cut from is still loading. */
  isReady: boolean;
}

/**
 * The slice of the catalogue a format may be built from, as both a filter for
 * the search and a test for cards already in the deck.
 *
 * Standard is a run of regulation marks — the letter in the card's bottom
 * corner — which is exactly how the rotation is announced. Expanded is every
 * set from Black & White on, so it is expressed as the tail of the set list.
 * Unlimited asks for nothing, and Pocket is its own game.
 */
export function useDeckPool(
  format: DeckFormat,
  language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
): DeckPool {
  const { data: sets } = useTcgSets(language);
  const { data: knownMarks } = useTcgRegulationMarks(language);
  const pocketSetIds = usePocketSetIds(language);

  return useMemo(() => {
    const standardMarks = standardRegulationMarks(knownMarks ?? []);

    // TCGdex lists sets oldest first, so Expanded is everything from Black &
    // White onwards. If that set ever stops being in the list the pool is left
    // unknown rather than guessed at — an empty pool narrows nothing and flags
    // nothing, which is the honest answer.
    const expandedStart =
      sets?.findIndex(
        (set) => set.id.toLowerCase() === EXPANDED_FIRST_SET_ID,
      ) ?? -1;
    const expandedSetIds =
      sets && expandedStart >= 0
        ? sets.slice(expandedStart).map((set) => set.id)
        : [];

    const context: DeckPoolContext = {
      standardMarks,
      expandedSetIds,
      pocketSetIds,
    };

    if (format.pool === "pocket") {
      return { context, filters: { game: "pocket" }, isReady: true };
    }

    if (format.pool === "standard") {
      return {
        context,
        // The query engine ORs several values in one parameter, which is how a
        // three-mark rotation becomes one search.
        filters: { game: "tcg", regulationMark: standardMarks.join("|") },
        isReady: true,
      };
    }

    if (format.pool === "expanded") {
      return {
        context,
        filters:
          expandedSetIds.length > 0
            ? { game: "tcg", setIds: expandedSetIds }
            : { game: "tcg" },
        isReady: Boolean(sets),
      };
    }

    return { context, filters: { game: "tcg" }, isReady: true };
  }, [format.pool, sets, knownMarks, pocketSetIds]);
}
