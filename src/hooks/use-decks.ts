"use client";

import { useCallback } from "react";
import { copiesAllowed, deckSize } from "@/lib/deck";
import type { WriteRequest } from "@/lib/sync/outbox";
import { SYNCED_STORAGE_KEYS } from "@/lib/sync/storage-keys";
import {
  createStorageStore,
  parseJsonArray,
  useStorageStore,
} from "@/lib/sync/storage-store";
import { useRemoteSync } from "@/lib/sync/use-remote-sync";
import type { Deck, DeckCard, DeckEntry, DeckFormatId } from "@/types/deck";
import { DEFAULT_DECK_FORMAT_ID, deckFormat, emptyDeck } from "@/types/deck";
import type { TcgLanguage } from "@/types/tcg";
import { DEFAULT_TCG_LANGUAGE } from "@/types/tcg";

function generateId(): string {
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** A stored deck, re-checked — old saves predate fields the builder now reads. */
export function reviveDeck(item: unknown): Deck | null {
  const deck = item as Partial<Deck> | null;
  if (!deck || typeof deck.id !== "string") return null;
  return {
    ...deck,
    id: deck.id,
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

// The builder reads the deck from half a dozen places at once — the binder,
// the counters, the legality panel, every tile in the search results — so they
// all read one store (see storage-store).
const store = createStorageStore<Deck[]>(SYNCED_STORAGE_KEYS.decks, {
  parse: (raw) => parseJsonArray(raw, reviveDeck),
});

const getId = (deck: Deck) => deck.id;
const fromApi = (rows: Deck[]) => rows;

/** The request that creates (or wholesale replaces) one deck — also used by the backup restorer. */
export const createDeckRequest = (deck: Deck): WriteRequest => ({
  method: "POST",
  path: "/api/decks",
  body: deck,
});
const deleteRequest = (deck: Deck): WriteRequest => ({
  method: "DELETE",
  path: `/api/decks/${deck.id}`,
});

/**
 * Applies a change to one deck and stamps it as the most recently touched.
 * Returns the updated deck (or `undefined` if no deck matched `id`) so
 * callers can sync the result up without re-deriving it.
 */
function mutateDeck(
  id: string,
  mutate: (deck: Deck) => Deck,
): Deck | undefined {
  let updated: Deck | undefined;
  store.set(
    store.get().map((deck) => {
      if (deck.id !== id) return deck;
      updated = { ...mutate(deck), updatedAt: Date.now() };
      return updated;
    }),
  );
  return updated;
}

/** What happened when a card was asked for, so the builder can say why not. */
export type AddCardResult =
  | { ok: true; count: number }
  | { ok: false; reason: "limit"; limit: number }
  | { ok: false; reason: "missing-deck" };

export function useDecks() {
  const { value: decks, isLoaded } = useStorageStore(store);

  const { syncWrite, clearAll } = useRemoteSync<Deck, Deck>({
    resource: "decks",
    apiPath: "/api/decks",
    store,
    isLocalLoaded: isLoaded,
    getId,
    fromApi,
    importLocal: createDeckRequest,
    deleteRequest,
  });

  /** After any mutator that changes a deck's entry list, push the whole list. */
  const syncEntries = useCallback(
    (deckId: string, entries: DeckEntry[]) => {
      void syncWrite({
        method: "PATCH",
        path: `/api/decks/${deckId}/entries`,
        body: { entries },
      });
    },
    [syncWrite],
  );

  /** Adds a brand-new deck locally and creates it remotely. */
  const addDeck = useCallback(
    (deck: Deck) => {
      store.set([...store.get(), deck]);
      void syncWrite(createDeckRequest(deck));
    },
    [syncWrite],
  );

  /**
   * Adds a deck that already exists on the server under this user — a clone
   * of a shared deck — to the local mirror, without sending anything.
   */
  const receiveDeck = useCallback((deck: Deck) => {
    const current = store.get();
    if (current.some((entry) => entry.id === deck.id)) return;
    store.set([...current, deck]);
  }, []);

  const createDeck = useCallback(
    (
      name: string,
      formatId: DeckFormatId = DEFAULT_DECK_FORMAT_ID,
      language: TcgLanguage = DEFAULT_TCG_LANGUAGE,
    ): Deck => {
      const deck = emptyDeck(generateId(), name, formatId, language);
      addDeck(deck);
      return deck;
    },
    [addDeck],
  );

  const deleteDeck = useCallback(
    (id: string) => {
      store.set(store.get().filter((deck) => deck.id !== id));
      void syncWrite({ method: "DELETE", path: `/api/decks/${id}` });
    },
    [syncWrite],
  );

  const duplicateDeck = useCallback(
    (id: string): Deck | null => {
      const source = store.get().find((deck) => deck.id === id);
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
      addDeck(copy);
      return copy;
    },
    [addDeck],
  );

  const updateDeck = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<Deck, "name" | "formatId" | "language" | "notes" | "typeFocus">
      >,
    ) => {
      const updated = mutateDeck(id, (deck) => ({ ...deck, ...updates }));
      if (updated) {
        void syncWrite({
          method: "PATCH",
          path: `/api/decks/${id}`,
          body: updates,
        });
      }
    },
    [syncWrite],
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
      const deck = store.get().find((entry) => entry.id === deckId);
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

      const updated = mutateDeck(deckId, (current) => ({
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
      if (updated) syncEntries(deckId, updated.entries);

      return { ok: true, count: (existing?.count ?? 0) + adding };
    },
    [syncEntries],
  );

  const setCardCount = useCallback(
    (deckId: string, cardId: string, count: number) => {
      const updated = mutateDeck(deckId, (deck) => ({
        ...deck,
        entries:
          count <= 0
            ? deck.entries.filter((entry) => entry.card.id !== cardId)
            : deck.entries.map((entry) =>
                entry.card.id === cardId ? { ...entry, count } : entry,
              ),
      }));
      if (updated) syncEntries(deckId, updated.entries);
    },
    [syncEntries],
  );

  const removeCard = useCallback(
    (deckId: string, cardId: string, count = 1) => {
      const updated = mutateDeck(deckId, (deck) => ({
        ...deck,
        entries: deck.entries.flatMap((entry) => {
          if (entry.card.id !== cardId) return [entry];
          const next = entry.count - count;
          return next > 0 ? [{ ...entry, count: next }] : [];
        }),
      }));
      if (updated) syncEntries(deckId, updated.entries);
    },
    [syncEntries],
  );

  const clearDeck = useCallback(
    (deckId: string) => {
      const updated = mutateDeck(deckId, (deck) => ({ ...deck, entries: [] }));
      if (updated) syncEntries(deckId, updated.entries);
    },
    [syncEntries],
  );

  /** Used by an import, which arrives as a whole list rather than card by card. */
  const replaceEntries = useCallback(
    (deckId: string, entries: DeckEntry[]) => {
      const updated = mutateDeck(deckId, (deck) => ({ ...deck, entries }));
      if (updated) syncEntries(deckId, updated.entries);
    },
    [syncEntries],
  );

  const importDeck = useCallback(
    (deck: Omit<Deck, "id">): Deck => {
      const now = Date.now();
      const imported: Deck = {
        ...deck,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      addDeck(imported);
      return imported;
    },
    [addDeck],
  );

  return {
    decks,
    isLoaded,
    createDeck,
    receiveDeck,
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
    /** Settings' "reset everything" action — see `useRemoteSync`'s `clearAll`. */
    clearDecks: clearAll,
  };
}

/** How full a deck is, for the places that only need the number. */
export function useDeckSize(deck: Deck | undefined): number {
  return deck ? deckSize(deck) : 0;
}
