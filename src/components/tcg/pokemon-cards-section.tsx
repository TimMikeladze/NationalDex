"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCardsByDexId, usePocketSetIds } from "@/hooks/use-tcg";
import { cn } from "@/lib/utils";
import type { TcgGame } from "@/types/tcg";
import { TCG_GAME_FULL_LABELS } from "@/types/tcg";
import { TcgCardTile, TcgCardTileSkeleton } from "./tcg-card-tile";

const SKELETON_KEYS = Array.from(
  { length: 6 },
  (_, i) => `pokemon-card-skeleton-${i}`,
);

const INITIAL_COUNT = 12;

type GameFilter = "all" | TcgGame;

interface PokemonCardsSectionProps {
  /** National Dex number — the key both databases share. */
  dexId: number;
  pokemonName: string;
}

/**
 * The trading cards printed for a Pokemon, across the physical game and TCG
 * Pocket. Cards are matched on National Dex number, so every form of a species
 * lands on the same set of cards.
 */
export function PokemonCardsSection({
  dexId,
  pokemonName,
}: PokemonCardsSectionProps) {
  const pocketSetIds = usePocketSetIds();
  const { cards, byGame, isLoading, isError } = useCardsByDexId(dexId);
  const [game, setGame] = useState<GameFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const availableGames = useMemo(() => {
    const games: GameFilter[] = ["all"];
    if (byGame.tcg.length > 0) games.push("tcg");
    if (byGame.pocket.length > 0) games.push("pocket");
    return games;
  }, [byGame]);

  const visibleCards = game === "all" ? cards : byGame[game];
  const shown = expanded ? visibleCards : visibleCards.slice(0, INITIAL_COUNT);

  if (isError) return null;

  if (!isLoading && cards.length === 0) {
    return (
      <section className="space-y-3">
        <SectionHeading count={0} dexId={dexId} />
        <p className="text-xs text-muted-foreground">
          No trading cards found for {pokemonName}.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <SectionHeading count={cards.length} dexId={dexId} />

      {availableGames.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {availableGames.map((option) => {
            const count =
              option === "all" ? cards.length : byGame[option].length;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setGame(option);
                  setExpanded(false);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  game === option
                    ? "border-foreground bg-foreground text-background"
                    : "hover:bg-muted",
                )}
              >
                {option === "all" ? "All" : TCG_GAME_FULL_LABELS[option]} (
                {count})
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isLoading && cards.length === 0
          ? SKELETON_KEYS.map((key) => <TcgCardTileSkeleton key={key} />)
          : shown.map((card) => (
              <TcgCardTile
                key={card.id}
                card={card}
                pocketSetIds={pocketSetIds}
                showGame={game === "all"}
              />
            ))}
      </div>

      {visibleCards.length > INITIAL_COUNT && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "show fewer" : `show all ${visibleCards.length} cards`}
        </Button>
      )}
    </section>
  );
}

function SectionHeading({ count, dexId }: { count: number; dexId: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        trading cards{count > 0 ? ` (${count})` : ""}
      </span>
      {count > 0 && (
        <Link
          href={`/cards?dexId=${dexId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          browse
          <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
