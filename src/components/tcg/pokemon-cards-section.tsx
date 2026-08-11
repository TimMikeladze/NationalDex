"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardsByDexId, usePocketSetIds } from "@/hooks/use-tcg";
import type { TcgGame } from "@/types/tcg";
import { TCG_GAME_FULL_LABELS, TCG_GAME_LABELS } from "@/types/tcg";
import { TcgCardTile } from "./tcg-card-tile";
import { Chip, SectionLabel } from "./tcg-chip";

const SKELETON_KEYS = Array.from(
  { length: 6 },
  (_, i) => `pokemon-card-skeleton-${i}`,
);

/** A rail holds plenty without turning the Pokemon page into a card page. */
const RAIL_LIMIT = 24;

type GameFilter = "all" | TcgGame;

interface PokemonCardsSectionProps {
  /** National Dex number — the key both databases share. */
  dexId: number;
  pokemonName: string;
}

/**
 * The trading cards printed for a Pokemon, across the physical game and TCG
 * Pocket. Cards are matched on National Dex number, so every form of a species
 * lands on the same set of cards. They scroll sideways: a Pokemon can have a
 * hundred prints, and none of them should push the rest of the page away.
 */
export function PokemonCardsSection({
  dexId,
  pokemonName,
}: PokemonCardsSectionProps) {
  const pocketSetIds = usePocketSetIds();
  const { cards, byGame, isLoading, isError } = useCardsByDexId(dexId);
  const [game, setGame] = useState<GameFilter>("all");

  const availableGames = useMemo(() => {
    const games: GameFilter[] = ["all"];
    if (byGame.tcg.length > 0) games.push("tcg");
    if (byGame.pocket.length > 0) games.push("pocket");
    return games;
  }, [byGame]);

  const visibleCards = game === "all" ? cards : byGame[game];
  const shown = visibleCards.slice(0, RAIL_LIMIT);
  const hasMore = visibleCards.length > shown.length;

  if (isError) return null;

  if (!isLoading && cards.length === 0) {
    return (
      <section className="space-y-2">
        <SectionLabel>trading cards</SectionLabel>
        <p className="text-xs text-muted-foreground">
          No trading cards found for {pokemonName}.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>
          trading cards{cards.length > 0 ? ` (${cards.length})` : ""}
        </SectionLabel>
        {cards.length > 0 && (
          <Link
            href={`/cards?dexId=${dexId}`}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            browse
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>

      {availableGames.length > 2 && (
        <div className="flex flex-wrap gap-1">
          {availableGames.map((option) => (
            <Chip
              key={option}
              selected={game === option}
              title={
                option === "all" ? undefined : TCG_GAME_FULL_LABELS[option]
              }
              onClick={() => setGame(option)}
            >
              {option === "all" ? "All" : TCG_GAME_LABELS[option]}
              <span className="ml-1 tabular-nums opacity-60">
                {option === "all" ? cards.length : byGame[option].length}
              </span>
            </Chip>
          ))}
        </div>
      )}

      {/* Bleeds to the page edge so the rail reads as scrollable on a phone */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <div className="flex w-max snap-x snap-mandatory gap-2 md:gap-3">
          {isLoading && cards.length === 0
            ? SKELETON_KEYS.map((key) => (
                <div key={key} className="w-28 shrink-0 space-y-1.5 sm:w-32">
                  <Skeleton className="aspect-[63/88] w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))
            : shown.map((card) => (
                <TcgCardTile
                  key={card.id}
                  card={card}
                  pocketSetIds={pocketSetIds}
                  showGame={game === "all"}
                  className="w-28 shrink-0 snap-start sm:w-32"
                />
              ))}

          {hasMore && (
            <Link
              href={`/cards?dexId=${dexId}`}
              className="flex w-28 shrink-0 snap-start flex-col items-center justify-center gap-1.5 border border-dashed text-center text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:w-32"
              style={{ aspectRatio: "63 / 88" }}
            >
              <ArrowRight className="size-4" />
              {visibleCards.length - shown.length} more
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
