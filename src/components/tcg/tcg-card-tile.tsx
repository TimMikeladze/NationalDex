"use client";

import { Heart, ListPlus } from "lucide-react";
import Link from "next/link";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { cn } from "@/lib/utils";
import type { TcgCardBrief, TcgGame } from "@/types/tcg";
import { cardImageUrl, gameForCardId } from "@/types/tcg";
import { GameBadge } from "./game-badge";
import { TcgCardImage } from "./tcg-card-image";

interface TcgCardTileProps {
  card: TcgCardBrief;
  /** Pocket set ids, so the game badge stays accurate as new sets ship. */
  pocketSetIds?: string[];
  showGame?: boolean;
  priority?: boolean;
  className?: string;
}

/**
 * A card in a grid: artwork, number, and the same favourite/list actions every
 * other kind of entry in the dex has.
 */
export function TcgCardTile({
  card,
  pocketSetIds,
  showGame = true,
  priority = false,
  className,
}: TcgCardTileProps) {
  const { isFavoriteCard, toggleFavoriteCard } = useCardFavorites();
  const game: TcgGame = gameForCardId(card.id, pocketSetIds);
  const favorited = isFavoriteCard(card.id);

  return (
    <div className={cn("group relative", className)}>
      <Link
        href={`/cards/${card.id.toLowerCase()}`}
        className="block space-y-1.5"
      >
        <TcgCardImage
          image={card.image}
          alt={card.name}
          priority={priority}
          className="transition-transform group-hover:-translate-y-0.5"
        />
        <div className="space-y-0.5 px-0.5">
          <p className="truncate text-xs font-medium" title={card.name}>
            {card.name}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              #{card.localId}
            </span>
            {showGame && <GameBadge game={game} />}
          </div>
        </div>
      </Link>

      <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
        <button
          type="button"
          onClick={() => toggleFavoriteCard(card)}
          className={cn(
            "rounded-full bg-background/90 p-1.5 shadow-sm backdrop-blur transition-colors",
            favorited
              ? "text-rose-500"
              : "text-muted-foreground hover:text-foreground",
          )}
          title={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("size-3.5", favorited && "fill-current")} />
        </button>

        <AddToListDialog
          itemType="card"
          itemId={card.id}
          itemName={card.name}
          itemSprite={cardImageUrl(card.image, "low")}
          trigger={
            <button
              type="button"
              className="rounded-full bg-background/90 p-1.5 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
              title="Add to list"
            >
              <ListPlus className="size-3.5" />
            </button>
          }
        />
      </div>
    </div>
  );
}

export function TcgCardTileSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="aspect-[63/88] w-full rounded-lg" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2.5 w-1/3" />
    </div>
  );
}
