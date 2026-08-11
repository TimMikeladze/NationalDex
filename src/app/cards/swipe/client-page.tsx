"use client";

import { Grid3X3, Heart } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import { Suspense, useCallback, useMemo } from "react";
import { TcgSwipeDeck } from "@/components/tcg";
import { Button } from "@/components/ui/button";
import { usePocketSetIds, useTcgCardSearch } from "@/hooks/use-tcg";
import type { TcgLanguage } from "@/types/tcg";
import {
  DEFAULT_TCG_LANGUAGE,
  isTcgLanguage,
  withTcgLanguage,
} from "@/types/tcg";
import {
  CARD_FILTER_PARSERS,
  type GameFilter,
  isGameFilter,
  toCardSearchFilters,
} from "../filters";

export function SwipePageClient() {
  return (
    <Suspense fallback={<SwipeSkeleton />}>
      <SwipeBrowser />
    </Suspense>
  );
}

/**
 * The card catalogue, one card at a time. It reads the same query string the
 * grid writes, so narrowing a search on `/cards` and then coming here deals you
 * exactly the cards you were looking at.
 */
function SwipeBrowser() {
  const [filters] = useQueryStates(CARD_FILTER_PARSERS, {
    history: "replace",
    clearOnDefault: true,
  });
  const searchParams = useSearchParams();

  const language: TcgLanguage = isTcgLanguage(filters.lang)
    ? filters.lang
    : DEFAULT_TCG_LANGUAGE;
  const game: GameFilter = isGameFilter(filters.game) ? filters.game : "all";

  const pocketSetIds = usePocketSetIds(language);
  const searchFilters = useMemo(() => toCardSearchFilters(filters), [filters]);

  const { cards, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useTcgCardSearch(searchFilters, { language });

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Everything that came from the URL, so it is obvious which deck this is.
  const context = [
    filters.q && `“${filters.q}”`,
    filters.set,
    game !== "all" && (game === "tcg" ? "TCG" : "Pocket"),
    ...filters.types,
    ...filters.rarities,
  ].filter(Boolean) as string[];

  const gridHref = withTcgLanguage("/cards", language);
  // Going back to the grid keeps the whole search, not just the language, so
  // the two views are the same query seen two ways.
  const query = searchParams.toString();
  const backToGrid = query ? `/cards?${query}` : gridHref;

  return (
    <div className="mx-auto flex h-full min-h-[30rem] w-full max-w-md flex-col gap-4 px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Swipe</p>
          <p className="truncate text-xs text-muted-foreground">
            {context.length > 0 ? context.join(" · ") : "Every card"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/favorites" title="Favorited cards">
              <Heart className="size-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">
                favorites
              </span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={backToGrid} title="Back to the card grid">
              <Grid3X3 className="size-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">grid</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <TcgSwipeDeck
          cards={cards}
          pocketSetIds={pocketSetIds}
          language={language}
          showGame={game === "all"}
          isLoading={isLoading}
          hasMore={hasNextPage}
          onNeedMore={loadMore}
          emptyMessage="No cards match these filters"
          emptyAction={
            <Button variant="outline" size="sm" asChild>
              <Link href={gridHref}>change filters</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function SwipeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4 md:px-6">
      <div className="aspect-[63/88] w-full max-w-[min(20rem,82vw,40dvh)] animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
