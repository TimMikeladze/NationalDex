"use client";

import { useCallback, useSyncExternalStore } from "react";
import { copiesAllowed, deckSize } from "@/lib/deck";
import type { Deck, DeckCard, DeckEntry, DeckFormatId } from "@/types/deck";
import { DEFAULT_DECK_FORMAT_ID, deckFormat, emptyDeck } from "@/types/deck";
import type { TcgLanguage } from "@/types/tcg";
import { DEFAULT_TCG_LANGUAGE } from "@/types/tcg";

const STORAGE_KEY = "pokedex-decks";

function generateId(): string {
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// Shared store
//
// The builder reads the deck from half a dozen places at once — the binder, the
// counters, the legality panel, every tile in the search results — so they read
// one store rather than each holding a copy that would overwrite its
// neighbour's change on the next save.
// =============================================================================

interface DecksSnapshot {
  decks: Deck[];
  isLoaded: boolean;
}

const EMPTY: Deck[] = [];
const SERVER_SNAPSHOT: DecksSnapshot = { decks: EMPTY, isLoaded: false };

let snapshot: DecksSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

/** A stored deck, re-checked — old saves predate fields the builder now reads. */
function reviveDeck(deck: Deck): Deck | null {
  if (!deck || typeof deck.id !== "string") return null;
  return {
    ...deck,
    name: deck.name || "Untitled deck",
    formatId: deck.formatId ?? DEFAULT_DECK_FORMAT_ID,
    language: deck.language ?? DEFAULT_TCG_LANGUAGE,
    typeFocus: deck.typeFocus ?? null,
    entries: Array.isArray(deck.entries)
      ? deck.entries.filter(
          (entry): entry is DeckEntry =>
            Boolean(entry?.card?.id) && typeof entry.count === "number",
        )
      : [],
    createdAt: deck.createdAt ?? Date.now(),
    updatedAt: deck.updatedAt ?? Date.now(),
  };
}

function readStorage(): Deck[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return EMPTY;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.map(reviveDeck).filter((deck): deck is Deck => deck !== null);
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function hydrate() {
  if (snapshot.isLoaded || typeof window === "undefined") return;
  snapshot = { decks: readStorage(), isLoaded: true };
}

function setDecks(next: Deck[]) {
  snapshot = { decks: next, isLoaded: true };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; the deck still updates on screen.
  }
  emit();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    snapshot = { decks: readStorage(), isLoaded: true };
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

/** Applies a change to one deck and stamps it as the most recently touched. */
function mutateDeck(id: string, mutate: (deck: Deck) => Deck) {
  setDecks(
    snapshot.decks.map((deck) =>
      deck.id === id ? { ...mutate(deck), updatedAt: Date.now() } : deck,
    ),
  );
}

/** What happened when a card was asked for, so the builder can say why not. */
export type AddCardResult =
  | { ok: true; count: number }
  | { ok: false; reason: "limit"; limit: number }
  | { ok: false; reason: "missing-deck" };

export function useDecks() {
  const { decks, isLoaded } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const createDeck = useCallback(
    (
      name: string,
      formatId: DeckFormatId = DEFAULT_DECK_FORMAT_ID,
      language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
    ): Deck => {
      const deck = emptyDeck(generateId(), name, formatId, language);
      setDecks([...snapshot.decks, deck]);
      return deck;
    },
    [],
  );

  const deleteDeck = useCallback((id: string) => {
    setDecks(snapshot.decks.filter((deck) => deck.id !== id));
  }, []);

  const duplicateDeck = useCallback((id: string): Deck | null => {
    const source = snapshot.decks.find((deck) => deck.id === id);
    if (!source) return null;
    const now = Date.now();
    const copy: Deck = {
      ...source,
      id: generateId(),
      name: `${source.name} copy`,
      entries: source.entries.map((entry) => ({ ...entry })),
      createdAt: now,
      updatedAt: now,
    };
    setDecks([...snapshot.decks, copy]);
    return copy;
  }, []);

  const updateDeck = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<Deck, "name" | "formatId" | "language" | "notes" | "typeFocus">
      >,
    ) => {
      mutateDeck(id, (deck) => ({ ...deck, ...updates }));
    },
    [],
  );

  const getDeck = useCallback(
    (id: string): Deck | undefined => decks.find((deck) => deck.id === id),
    [decks],
  );

  /**
   * Adds copies of a card, never past what the format allows: a fifth copy of a
   * name, a second ACE SPEC, a Radiant next to another Radiant. The deck can
   * still run over sixty cards while it is being built — that is the player's
   * to resolve, and the counter says so — but it can never hold a combination
   * that is illegal by construction.
   */
  const addCard = useCallback(
    (deckId: string, card: DeckCard, count = 1): AddCardResult => {
      const deck = snapshot.decks.find((entry) => entry.id === deckId);
      if (!deck) return { ok: false, reason: "missing-deck" };

      const format = deckFormat(deck.formatId);
      const allowed = copiesAllowed(card, deck, format);
      if (allowed <= 0) {
        const existing = deck.entries.find(
          (entry) => entry.card.id === card.id,
        );
        return {
          ok: false,
          reason: "limit",
          limit: existing?.count ?? format.maxCopies,
        };
      }

      const adding = Math.min(count, allowed);
      const existing = deck.entries.find((entry) => entry.card.id === card.id);

      mutateDeck(deckId, (current) => ({
        ...current,
        entries: existing
          ? current.entries.map((entry) =>
              entry.card.id === card.id
                ? { ...entry, count: entry.count + adding, card }
                : entry,
            )
          : [
              ...current.entries,
              { card, count: adding, addedAt: Date.now() } satisfies DeckEntry,
            ],
      }));

      return { ok: true, count: (existing?.count ?? 0) + adding };
    },
    [],
  );

  const setCardCount = useCallback(
    (deckId: string, cardId: string, count: number) => {
      mutateDeck(deckId, (deck) => ({
        ...deck,
        entries:
          count <= 0
            ? deck.entries.filter((entry) => entry.card.id !== cardId)
            : deck.entries.map((entry) =>
                entry.card.id === cardId ? { ...entry, count } : entry,
              ),
      }));
    },
    [],
  );

  const removeCard = useCallback(
    (deckId: string, cardId: string, count = 1) => {
      mutateDeck(deckId, (deck) => ({
        ...deck,
        entries: deck.entries.flatMap((entry) => {
          if (entry.card.id !== cardId) return [entry];
          const next = entry.count - count;
          return next > 0 ? [{ ...entry, count: next }] : [];
        }),
      }));
    },
    [],
  );

  const clearDeck = useCallback((deckId: string) => {
    mutateDeck(deckId, (deck) => ({ ...deck, entries: [] }));
  }, []);

  /** Used by an import, which arrives as a whole list rather than card by card. */
  const replaceEntries = useCallback((deckId: string, entries: DeckEntry[]) => {
    mutateDeck(deckId, (deck) => ({ ...deck, entries }));
  }, []);

  const importDeck = useCallback((deck: Omit<Deck, "id">): Deck => {
    const now = Date.now();
    const imported: Deck = {
      ...deck,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    setDecks([...snapshot.decks, imported]);
    return imported;
  }, []);

  return {
    decks,
    isLoaded,
    createDeck,
    deleteDeck,
    duplicateDeck,
    updateDeck,
    getDeck,
    addCard,
    setCardCount,
    removeCard,
    clearDeck,
    replaceEntries,
    importDeck,
  };
}

/** How full a deck is, for the places that only need the number. */
export function useDeckSize(deck: Deck | undefined): number {
  return deck ? deckSize(deck) : 0;
}
