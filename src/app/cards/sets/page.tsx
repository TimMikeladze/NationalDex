"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePocketSetIds, useTcgSeriesWithSets } from "@/hooks/use-tcg";
import { cn } from "@/lib/utils";
import type { TcgGame, TcgSerie } from "@/types/tcg";
import {
  assetUrl,
  gameForSetId,
  POCKET_SERIE_ID,
  TCG_GAME_FULL_LABELS,
} from "@/types/tcg";

type GameFilter = "all" | TcgGame;

const GAME_OPTIONS: { id: GameFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tcg", label: TCG_GAME_FULL_LABELS.tcg },
  { id: "pocket", label: TCG_GAME_FULL_LABELS.pocket },
];

const SKELETON_KEYS = Array.from(
  { length: 4 },
  (_, i) => `serie-skeleton-${i}`,
);

export default function CardSetsPage() {
  const { data: series, isLoading, isError } = useTcgSeriesWithSets();
  const pocketSetIds = usePocketSetIds();
  const [game, setGame] = useState<GameFilter>("all");
  const [search, setSearch] = useState("");

  const filteredSeries = useMemo(() => {
    if (!series) return [];
    const query = search.trim().toLowerCase();

    return series
      .map((serie) => ({
        ...serie,
        sets: serie.sets.filter((set) => {
          if (game === "pocket" && serie.id !== POCKET_SERIE_ID) return false;
          if (game === "tcg" && serie.id === POCKET_SERIE_ID) return false;
          if (!query) return true;
          return (
            set.name.toLowerCase().includes(query) ||
            set.id.toLowerCase().includes(query) ||
            serie.name.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((serie) => serie.sets.length > 0)
      .sort((a, b) => {
        // Pocket first when it is the focus, otherwise newest series first.
        if (a.id === POCKET_SERIE_ID) return game === "all" ? 1 : -1;
        if (b.id === POCKET_SERIE_ID) return game === "all" ? -1 : 1;
        return 0;
      });
  }, [series, search, game]);

  const totalSets = filteredSeries.reduce(
    (sum, serie) => sum + serie.sets.length,
    0,
  );

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {GAME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setGame(option.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  game === option.id
                    ? "border-foreground bg-foreground text-background"
                    : "hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">
              {totalSets} set{totalSets === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {isError ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Could not load card sets right now.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-8">
          {SKELETON_KEYS.map((key) => (
            <div key={key} className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`${key}-set-${index}`} className="h-20" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No sets found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredSeries.map((serie) => (
            <SerieSection
              key={serie.id}
              serie={serie}
              pocketSetIds={pocketSetIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SerieSection({
  serie,
  pocketSetIds,
}: {
  serie: TcgSerie;
  pocketSetIds: string[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{serie.name}</h2>
        <span className="text-xs text-muted-foreground">
          {serie.sets.length} set{serie.sets.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {serie.sets.map((set) => {
          const logo = assetUrl(set.logo);
          const symbol = assetUrl(set.symbol);
          const game = gameForSetId(set.id, pocketSetIds);

          return (
            <Link
              key={set.id}
              href={`/cards/sets/${set.id.toLowerCase()}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-12 shrink-0 items-center justify-center">
                {logo ? (
                  // biome-ignore lint/performance/noImgElement: external set logo
                  <img
                    src={logo}
                    alt={set.name}
                    className="max-h-12 w-full object-contain"
                    loading="lazy"
                  />
                ) : symbol ? (
                  // biome-ignore lint/performance/noImgElement: external set symbol
                  <img
                    src={symbol}
                    alt={set.name}
                    className="size-8 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {set.id.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{set.name}</p>
                <p className="text-xs text-muted-foreground">
                  {set.cardCount.official} cards
                  {set.cardCount.total !== set.cardCount.official
                    ? ` (${set.cardCount.total} with secrets)`
                    : ""}
                </p>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {game === "pocket" ? "pocket" : set.id}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
