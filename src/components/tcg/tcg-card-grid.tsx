"use client";

import { cn } from "@/lib/utils";
import type { TcgCardBrief } from "@/types/tcg";
import { TcgCardTile, TcgCardTileSkeleton } from "./tcg-card-tile";

const SKELETON_KEYS = Array.from(
  { length: 12 },
  (_, i) => `tcg-card-skeleton-${i}`,
);

interface TcgCardGridProps {
  cards: TcgCardBrief[];
  pocketSetIds?: string[];
  showGame?: boolean;
  isLoading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
  className?: string;
}

export function TcgCardGrid({
  cards,
  pocketSetIds,
  showGame = true,
  isLoading = false,
  skeletonCount = 12,
  emptyMessage = "No cards found",
  className,
}: TcgCardGridProps) {
  const gridClasses = cn(
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8",
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
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={gridClasses}>
      {cards.map((card, index) => (
        <TcgCardTile
          key={card.id}
          card={card}
          pocketSetIds={pocketSetIds}
          showGame={showGame}
          priority={index < 6}
        />
      ))}
    </div>
  );
}
