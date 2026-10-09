"use client";

import { useCallback } from "react";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import type { TcgCardBrief, TcgLanguage } from "@/types/tcg";
import { cardImageUrl, DEFAULT_TCG_LANGUAGE, gameForCardId } from "@/types/tcg";
import { TcgCardLightbox } from "./tcg-card-lightbox";
import { TcgSwipeFace } from "./tcg-swipe-face";

interface TcgSwipeDeckProps {
  cards: TcgCardBrief[];
  pocketSetIds?: string[];
  /** Catalogue the cards came from, carried into every link out of the deck. */
  language?: TcgLanguage;
  showGame?: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  /** Asked for another page once the deck is nearly spent. */
  onNeedMore?: () => void;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  /** Offered alongside "start over" once the whole deck has been swiped. */
  exhaustedAction?: React.ReactNode;
  className?: string;
}

const cardKey = (card: TcgCardBrief) => card.id;
const cardName = (card: TcgCardBrief) => card.name;
const cardPreload = (card: TcgCardBrief) => cardImageUrl(card.image, "high");
const cardListEntry = (card: TcgCardBrief) => ({
  itemType: "card" as const,
  itemId: card.id,
  itemName: card.name,
  itemSprite: cardImageUrl(card.image, "low") ?? undefined,
});

/** The card catalogue dealt one card at a time — the deck, with card faces. */
export function TcgSwipeDeck({
  cards,
  pocketSetIds,
  language = DEFAULT_TCG_LANGUAGE,
  showGame = true,
  emptyMessage = "No cards match these filters",
  ...rest
}: TcgSwipeDeckProps) {
  const { isFavoriteCard, addFavoriteCard, removeFavoriteCard } =
    useCardFavorites();

  const isFavorite = useCallback(
    (card: TcgCardBrief) => isFavoriteCard(card.id),
    [isFavoriteCard],
  );
  const removeFavorite = useCallback(
    (card: TcgCardBrief) => removeFavoriteCard(card.id),
    [removeFavoriteCard],
  );

  return (
    <SwipeDeck
      {...rest}
      items={cards}
      getKey={cardKey}
      getName={cardName}
      isFavorite={isFavorite}
      addFavorite={addFavoriteCard}
      removeFavorite={removeFavorite}
      preloadSrc={cardPreload}
      toListEntry={cardListEntry}
      emptyMessage={emptyMessage}
      renderFace={(card, { priority, captionFade }) => (
        <TcgSwipeFace
          card={card}
          game={showGame ? gameForCardId(card.id, pocketSetIds) : undefined}
          priority={priority}
          captionFade={captionFade}
        />
      )}
      renderPeek={(card, onClose) => (
        <TcgCardLightbox card={card} language={language} onClose={onClose} />
      )}
    />
  );
}
