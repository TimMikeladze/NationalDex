"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { TcgCardBrief } from "@/types/tcg";

const STORAGE_KEY = "pokedex-card-favorites";

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

function toFavorite(card: TcgCardBrief): FavoriteCard {
  return {
    id: card.id,
    name: card.name,
    localId: card.localId,
    image: card.image,
    addedAt: Date.now(),
  };
}

// =============================================================================
// Shared store
//
// A heart sits on every card in a grid, so dozens of components read and write
// these favourites at once. They share one store rather than each holding their
// own copy — otherwise a stale copy would overwrite a neighbour's change on its
// next save.
// =============================================================================

interface FavoriteCardsSnapshot {
  cards: FavoriteCard[];
  isLoaded: boolean;
}

const EMPTY: FavoriteCard[] = [];
const SERVER_SNAPSHOT: FavoriteCardsSnapshot = {
  cards: EMPTY,
  isLoaded: false,
};

let snapshot: FavoriteCardsSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function readStorage(): FavoriteCard[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return EMPTY;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.map((favorite: FavoriteCard) => ({
      ...favorite,
      // Imported backups may predate the stored card number, which is the
      // trailing segment of the card id.
      localId: favorite.localId ?? favorite.id?.split("-").pop() ?? "",
    }));
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/** Loads from storage on the first subscriber, after hydration. */
function hydrate() {
  if (snapshot.isLoaded || typeof window === "undefined") return;
  snapshot = { cards: readStorage(), isLoaded: true };
}

function setCards(next: FavoriteCard[]) {
  snapshot = { cards: next, isLoaded: true };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; the in-memory state still updates.
  }
  emit();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);

  // Keep other tabs in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    snapshot = { cards: readStorage(), isLoaded: true };
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function useCardFavorites() {
  const { cards: favoriteCards, isLoaded } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const addFavoriteCard = useCallback((card: TcgCardBrief) => {
    if (snapshot.cards.some((favorite) => favorite.id === card.id)) return;
    setCards([...snapshot.cards, toFavorite(card)]);
  }, []);

  const removeFavoriteCard = useCallback((id: string) => {
    setCards(snapshot.cards.filter((favorite) => favorite.id !== id));
  }, []);

  const toggleFavoriteCard = useCallback((card: TcgCardBrief) => {
    if (snapshot.cards.some((favorite) => favorite.id === card.id)) {
      setCards(snapshot.cards.filter((favorite) => favorite.id !== card.id));
      return;
    }
    setCards([...snapshot.cards, toFavorite(card)]);
  }, []);

  const isFavoriteCard = useCallback(
    (id: string) => favoriteCards.some((favorite) => favorite.id === id),
    [favoriteCards],
  );

  const clearFavoriteCards = useCallback(() => {
    setCards([]);
  }, []);

  return {
    favoriteCards,
    isLoaded,
    addFavoriteCard,
    removeFavoriteCard,
    toggleFavoriteCard,
    isFavoriteCard,
    clearFavoriteCards,
  };
}
