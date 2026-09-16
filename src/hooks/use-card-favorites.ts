"use client";

import { useCallback } from "react";
import type { WriteRequest } from "@/lib/sync/outbox";
import { SYNCED_STORAGE_KEYS } from "@/lib/sync/storage-keys";
import {
  createStorageStore,
  parseJsonArray,
  useStorageStore,
} from "@/lib/sync/storage-store";
import { useRemoteSync } from "@/lib/sync/use-remote-sync";
import type { TcgCardBrief } from "@/types/tcg";

/**
 * Favourited cards keep a snapshot of what is needed to render them, so the
 * favourites page never has to fetch one request per card to draw a grid.
 */
export interface FavoriteCard {
  id: string;
  name: string;
  /** Card number within its set. */
  localId: string;
  /** Image base URL, without quality or extension. */
  image?: string;
  addedAt: number;
}

/** Shape of a row returned by `/api/card-favorites`. */
interface CardFavoriteRow {
  id: string;
  userId: string;
  cardId: string;
  name: string;
  localId: string;
  image: string | null;
  addedAt: string | number | Date;
}

function toFavorite(card: TcgCardBrief): FavoriteCard {
  return {
    id: card.id,
    name: card.name,
    localId: card.localId,
    image: card.image,
    addedAt: Date.now(),
  };
}

/** A stored favourite, re-checked — imported backups may predate `localId`. */
export function reviveFavoriteCard(item: unknown): FavoriteCard | null {
  const favorite = item as Partial<FavoriteCard> | null;
  if (!favorite || typeof favorite.id !== "string") return null;
  return {
    id: favorite.id,
    name: favorite.name ?? "",
    // The card number is the trailing segment of the card id.
    localId: favorite.localId ?? favorite.id.split("-").pop() ?? "",
    image: favorite.image,
    addedAt: favorite.addedAt ?? Date.now(),
  };
}

// A heart sits on every card in a grid, so dozens of components read and
// write these favourites at once — they share one store (see storage-store).
const store = createStorageStore<FavoriteCard[]>(
  SYNCED_STORAGE_KEYS.cardFavorites,
  { parse: (raw) => parseJsonArray(raw, reviveFavoriteCard) },
);

const getId = (card: FavoriteCard) => card.id;
const fromApi = (rows: CardFavoriteRow[]): FavoriteCard[] =>
  rows.map((row) => ({
    id: row.cardId,
    name: row.name,
    localId: row.localId,
    image: row.image ?? undefined,
    addedAt: new Date(row.addedAt).getTime(),
  }));

/** The request that favourites one card — also used by the backup restorer. */
export const createCardFavoriteRequest = (
  card: FavoriteCard,
): WriteRequest => ({
  method: "POST",
  path: "/api/card-favorites",
  body: {
    cardId: card.id,
    name: card.name,
    localId: card.localId,
    image: card.image,
  },
});
const deleteRequest = (card: FavoriteCard): WriteRequest => ({
  method: "DELETE",
  path: `/api/card-favorites/${card.id}`,
});

export function useCardFavorites() {
  const { value: favoriteCards, isLoaded } = useStorageStore(store);

  const { syncWrite, clearAll } = useRemoteSync<
    FavoriteCard,
    CardFavoriteRow
  >({
    resource: "card-favorites",
    apiPath: "/api/card-favorites",
    store,
    isLocalLoaded: isLoaded,
    getId,
    fromApi,
    importLocal: createCardFavoriteRequest,
    deleteRequest,
  });

  const addFavoriteCard = useCallback(
    (card: TcgCardBrief) => {
      const current = store.get();
      if (current.some((favorite) => favorite.id === card.id)) return;
      const favorite = toFavorite(card);
      store.set([...current, favorite]);
      void syncWrite(createCardFavoriteRequest(favorite));
    },
    [syncWrite],
  );

  const removeFavoriteCard = useCallback(
    (id: string) => {
      const current = store.get();
      const favorite = current.find((entry) => entry.id === id);
      if (!favorite) return;
      store.set(current.filter((entry) => entry.id !== id));
      void syncWrite(deleteRequest(favorite));
    },
    [syncWrite],
  );

  const isFavoriteCard = useCallback(
    (id: string) => favoriteCards.some((favorite) => favorite.id === id),
    [favoriteCards],
  );

  const toggleFavoriteCard = useCallback(
    (card: TcgCardBrief) => {
      if (isFavoriteCard(card.id)) {
        removeFavoriteCard(card.id);
      } else {
        addFavoriteCard(card);
      }
    },
    [isFavoriteCard, addFavoriteCard, removeFavoriteCard],
  );

  return {
    favoriteCards,
    isLoaded,
    addFavoriteCard,
    removeFavoriteCard,
    toggleFavoriteCard,
    isFavoriteCard,
    /** Settings' "reset everything" action — see `useRemoteSync`'s `clearAll`. */
    clearFavoriteCards: clearAll,
  };
}
