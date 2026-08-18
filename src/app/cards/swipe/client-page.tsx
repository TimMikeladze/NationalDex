"use client";

import { Grid3X3, Heart } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import { Suspense, useCallback, useEffect, useMemo } from "react";
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
import { useCardScope } from "../use-card-scope";

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

  // The deck opens where the grid does — on the newest sets, or on the same
  // shuffle — because the two read the same query string.
  const {
    scopeIsLive,
    randomIsLive,
    scopedSetIds,
    fanOutSetIds,
    shuffleSeed,
    isReady,
  } = useCardScope(filters, game, language);

  const searchFilters = useMemo(
    () => toCardSearchFilters(filters, scopedSetIds),
    [filters, scopedSetIds],
  );

  const {
    cards: dealtCards,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useTcgCardSearch(searchFilters, {
    language,
    shuffleSeed,
    fanOutSetIds,
    enabled: isReady,
  });

  // A card with no scan is nothing to look at, and looking is the whole point
  // of the deck — those are left in the grid, where the stand-in at least says
  // which card is missing.
  const cards = useMemo(
    () => dealtCards.filter((card) => Boolean(card.image)),
    [dealtCards],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Pages that were entirely scanless leave the deck short of cards it could
  // deal, so the next page is asked for straight away rather than waiting for
  // a swipe that may never come.
  useEffect(() => {
    if (cards.length === 0 && dealtCards.length > 0) loadMore();
  }, [cards.length, dealtCards.length, loadMore]);

  // Everything that came from the URL, so it is obvious which deck this is.
  const context = [
    filters.q && `“${filters.q}”`,
    filters.set,
    game !== "all" && (game === "tcg" ? "TCG" : "Pocket"),
    ...filters.types,
    ...filters.rarities,
    scopeIsLive && "newest sets",
    randomIsLive && "shuffled",
  ].filter(Boolean) as string[];

  const gridHref = withTcgLanguage("/cards", language);
  // Going back to the grid keeps the whole search, not just the language, so
  // the two views are the same query seen two ways.
  const query = searchParams.toString();
  const backToGrid = query ? `/cards?${query}` : gridHref;

  // The same deck, widened to the whole catalogue.
  const everySetHref = useMemo(() => {
    const params = new URLSearchParams(query);
    params.set("scope", "all");
    return `/cards/swipe?${params.toString()}`;
  }, [query]);

  return (
    // `--app-content-height` is the room the shell has already worked out for
    // this device and this chrome, so the deck fills the screen exactly rather
    // than guessing at the toolbars. The floor keeps the deck usable but can
    // never outgrow that room: a short landscape phone deals a smaller card
    // instead of one you would have to scroll to.
    //
    // `overflow-x-clip` rather than hidden: a thrown card travels well past the
    // edge, and it must not be able to widen the page or raise a scrollbar on
    // its way out — but clipping must not turn this into a scroll container.
    <div className="mx-auto flex h-(--app-content-height) min-h-[min(26rem,var(--app-content-height))] w-full max-w-lg flex-col gap-3 overflow-x-clip px-4 py-3 md:px-6">
      <div className="flex shrink-0 items-center justify-between gap-3">
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

      <div className="flex min-h-0 flex-1">
        <TcgSwipeDeck
          cards={cards}
          pocketSetIds={pocketSetIds}
          language={language}
          showGame={game === "all"}
          // Waiting on the set list is still loading, and the deck must not
          // report an empty search in the meantime.
          isLoading={isLoading || !isReady}
          hasMore={hasNextPage}
          onNeedMore={loadMore}
          emptyMessage="No cards match these filters"
          emptyAction={
            <Button variant="outline" size="sm" asChild>
              <Link href={gridHref}>change filters</Link>
            </Button>
          }
          // Reaching the end of the newest sets is a good moment to offer the
          // rest of the catalogue, rather than only "start over".
          exhaustedAction={
            scopeIsLive ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href={everySetHref}>keep swiping through every set</Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}

function SwipeSkeleton() {
  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col items-center px-4 py-3 md:px-6">
      <div className="aspect-[63/88] h-full max-w-full animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
