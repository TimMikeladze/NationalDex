"use client";

import { Heart, ListPlus } from "lucide-react";
import Link from "next/link";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { cn } from "@/lib/utils";
import type { TcgCardBrief, TcgGame, TcgLanguage } from "@/types/tcg";
import {
  cardImageUrl,
  DEFAULT_TCG_LANGUAGE,
  formatLocalId,
  gameForCardId,
  withTcgLanguage,
} from "@/types/tcg";
import { GameBadge } from "./game-badge";
import { TcgCardImage } from "./tcg-card-image";

interface TcgCardTileProps {
  card: TcgCardBrief;
  /** Pocket set ids, so the game badge stays accurate as new sets ship. */
  pocketSetIds?: string[];
  showGame?: boolean;
  priority?: boolean;
  /** Catalogue the card came from — its detail page needs the same one. */
  language?: TcgLanguage;
  className?: string;
}

/**
 * A card in a grid: artwork first, then the two things that identify a print —
 * its name and its number. Actions sit on the artwork so the caption stays
 * readable at the two-column size a phone shows.
 */
export function TcgCardTile({
  card,
  pocketSetIds,
  showGame = true,
  priority = false,
  language = DEFAULT_TCG_LANGUAGE,
  className,
}: TcgCardTileProps) {
  const { isFavoriteCard, toggleFavoriteCard } = useCardFavorites();
  const game: TcgGame = gameForCardId(card.id, pocketSetIds);
  const favorited = isFavoriteCard(card.id);

  return (
    <div className={cn("group relative", className)}>
      <Link
        href={withTcgLanguage(`/cards/${card.id.toLowerCase()}`, language)}
        className="block space-y-1.5 outline-none"
      >
        <div className="relative overflow-hidden bg-muted/30 transition-transform duration-150 group-active:scale-[0.98] group-focus-visible:ring-2 group-focus-visible:ring-ring">
          <TcgCardImage
            image={card.image}
            alt={card.name}
            localId={card.localId}
            priority={priority}
            className="transition-transform duration-200 md:group-hover:scale-[1.03]"
          />
          {showGame && (
            <GameBadge
              game={game}
              variant="overlay"
              className="pointer-events-none absolute bottom-1 left-1 backdrop-blur"
            />
          )}
        </div>

        <div className="flex items-baseline gap-1.5 px-0.5">
          <p
            className="min-w-0 flex-1 truncate text-xs font-medium"
            title={card.name}
          >
            {card.name}
          </p>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {formatLocalId(card.localId)}
          </span>
        </div>
      </Link>

      {/* The heart stays put once a card is favourited; the rest only appears
          to a pointer, so a phone grid is artwork and nothing else. */}
      <div className="absolute right-0 top-0 flex flex-col items-end">
        <button
          type="button"
          onClick={() => toggleFavoriteCard(card)}
          className={cn(
            "p-2 transition-opacity",
            favorited
              ? "text-rose-500 opacity-100"
              : "text-muted-foreground opacity-0 focus-visible:opacity-100 md:group-hover:opacity-100",
          )}
          title={
            favorited
              ? `Remove ${card.name} from favorites`
              : `Add ${card.name} to favorites`
          }
          aria-label={
            favorited
              ? `Remove ${card.name} from favorites`
              : `Add ${card.name} to favorites`
          }
          aria-pressed={favorited}
        >
          <span className="flex size-6 items-center justify-center bg-background/80 backdrop-blur">
            <Heart className={cn("size-3.5", favorited && "fill-current")} />
          </span>
        </button>

        <AddToListDialog
          itemType="card"
          itemId={card.id}
          itemName={card.name}
          itemSprite={cardImageUrl(card.image, "low")}
          trigger={
            <button
              type="button"
              className="hidden p-2 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 md:block md:group-hover:opacity-100"
              title={`Add ${card.name} to a list`}
              aria-label={`Add ${card.name} to a list`}
            >
              <span className="flex size-6 items-center justify-center bg-background/80 backdrop-blur">
                <ListPlus className="size-3.5" />
              </span>
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
      <Skeleton className="aspect-[63/88] w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
