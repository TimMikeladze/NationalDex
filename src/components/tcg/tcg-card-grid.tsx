"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TcgCardBrief, TcgLanguage } from "@/types/tcg";
import { TcgCardLightbox } from "./tcg-card-lightbox";
import { TcgCardTile, TcgCardTileSkeleton } from "./tcg-card-tile";

const SKELETON_KEYS = Array.from(
  { length: 36 },
  (_, i) => `tcg-card-skeleton-${i}`,
);

interface TcgCardGridProps {
  cards: TcgCardBrief[];
  pocketSetIds?: string[];
  showGame?: boolean;
  /** Catalogue these cards came from, carried into every tile's link. */
  language?: TcgLanguage;
  isLoading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

export function TcgCardGrid({
  cards,
  pocketSetIds,
  showGame = true,
  language,
  isLoading = false,
  skeletonCount = 12,
  emptyMessage = "No cards found",
  emptyAction,
  className,
}: TcgCardGridProps) {
  // The grid doubles as a viewer: a card can be read full size and the rest of
  // the results walked from there, without losing your place in the scroll.
  const [peekIndex, setPeekIndex] = useState<number | null>(null);
  const peeked = peekIndex === null ? null : (cards[peekIndex] ?? null);

  const gridClasses = cn(
    "grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8",
    className,
  );

  if (isLoading && cards.length === 0) {
    return (
      <div className={gridClasses}>
        {SKELETON_KEYS.slice(0, skeletonCount).map((key) => (
          <TcgCardTileSkeleton key={key} />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      <div className={gridClasses}>
        {cards.map((card, index) => (
          <TcgCardTile
            key={card.id}
            card={card}
            pocketSetIds={pocketSetIds}
            showGame={showGame}
            language={language}
            priority={index < 6}
            onPeek={() => setPeekIndex(index)}
          />
        ))}
      </div>

      <TcgCardLightbox
        card={peeked}
        language={language}
        onClose={() => setPeekIndex(null)}
        onPrevious={
          peekIndex !== null && peekIndex > 0
            ? () => setPeekIndex(peekIndex - 1)
            : undefined
        }
        onNext={
          peekIndex !== null && peekIndex < cards.length - 1
            ? () => setPeekIndex(peekIndex + 1)
            : undefined
        }
      />
    </>
  );
}
