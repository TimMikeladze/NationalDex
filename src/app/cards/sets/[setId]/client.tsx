"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GameBadge, TcgCardGrid } from "@/components/tcg";
import { Button } from "@/components/ui/button";
import { usePocketSetIds } from "@/hooks/use-tcg";
import type { TcgSet } from "@/types/tcg";
import { assetUrl, formatReleaseDate, gameForSetId } from "@/types/tcg";

interface SetDetailClientProps {
  set: TcgSet;
}

export function SetDetailClient({ set }: SetDetailClientProps) {
  const pocketSetIds = usePocketSetIds();
  const game = gameForSetId(set.id, pocketSetIds);
  const [search, setSearch] = useState("");

  const logo = assetUrl(set.logo);
  const symbol = assetUrl(set.symbol);

  const cards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return set.cards;
    return set.cards.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        card.localId.toLowerCase().includes(query),
    );
  }, [set.cards, search]);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {logo ? (
            // biome-ignore lint/performance/noImgElement: external set logo
            <img
              src={logo}
              alt={set.name}
              className="h-16 max-w-48 object-contain"
            />
          ) : symbol ? (
            // biome-ignore lint/performance/noImgElement: external set symbol
            <img
              src={symbol}
              alt={set.name}
              className="size-12 object-contain"
            />
          ) : null}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-medium">{set.name}</h1>
              <GameBadge game={game} />
            </div>
            <p className="text-xs text-muted-foreground">
              {set.serie?.name}
              {set.releaseDate
                ? ` · ${formatReleaseDate(set.releaseDate)}`
                : ""}{" "}
              · {set.cardCount.official} cards
              {set.cardCount.total !== set.cardCount.official
                ? ` (${set.cardCount.total} with secrets)`
                : ""}
            </p>
            {set.legal && (
              <p className="text-xs text-muted-foreground">
                Standard: {set.legal.standard ? "legal" : "not legal"} ·
                Expanded: {set.legal.expanded ? "legal" : "not legal"}
              </p>
            )}
          </div>

          <div className="ml-auto flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/cards?set=${set.id}`}>filter in browser</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cards/sets">all sets</Link>
            </Button>
          </div>
        </div>

        {set.boosters && set.boosters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              boosters
            </span>
            {set.boosters.map((booster) => (
              <span
                key={booster.id}
                className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {booster.name}
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${set.name}...`}
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

        <p className="text-xs text-muted-foreground">
          Showing {cards.length} of {set.cards.length} cards
        </p>
      </header>

      <TcgCardGrid
        cards={cards}
        pocketSetIds={pocketSetIds}
        showGame={false}
        emptyMessage="No cards match that search"
      />
    </div>
  );
}
