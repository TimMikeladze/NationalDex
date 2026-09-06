import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, type Tx } from "@/db";
import { deck, deckEntry } from "@/db/schema";
import type { Deck, DeckCard, DeckFormatId } from "@/types/deck";
import type { TcgLanguage } from "@/types/tcg";

type DeckRow = typeof deck.$inferSelect;
type DeckEntryRow = typeof deckEntry.$inferSelect;

/**
 * One entry as the client sends it. The card is the client's own `DeckCard`
 * snapshot, stored as-is in jsonb; only the id it is keyed by is checked.
 */
export const deckEntrySchema = z.object({
  card: z.looseObject({ id: z.string().min(1) }),
  count: z.number().int().min(1),
  addedAt: z.number().optional(),
});

/** What `replaceDeckEntries` needs of an entry — a `DeckEntry` qualifies. */
export interface DeckEntryInput {
  card: unknown;
  count: number;
  addedAt?: number;
}

/** A whole deck, as `POST /api/decks` receives it. */
export const deckSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  formatId: z.string().min(1),
  language: z.string().min(1),
  typeFocus: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  entries: z.array(deckEntrySchema).optional(),
});

/** `PATCH /api/decks/[id]` — `notes`/`typeFocus: null` clear them. */
export const deckPatchSchema = z.object({
  name: z.string().min(1).optional(),
  formatId: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  typeFocus: z.string().nullable().optional(),
});

/** `PATCH /api/decks/[id]/entries` — the whole entry list. */
export const deckEntriesSchema = z.object({
  entries: z.array(deckEntrySchema),
});

/** A deck row plus its entries, in the shape the client keeps. */
export function toDeck(row: DeckRow, entries: DeckEntryRow[]): Deck {
  return {
    id: row.id,
    name: row.name,
    formatId: row.formatId as DeckFormatId,
    language: row.language as TcgLanguage,
    typeFocus: row.typeFocus,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    entries: entries.map((entry) => ({
      card: entry.card as DeckCard,
      count: entry.count,
      addedAt: entry.addedAt.getTime(),
    })),
  };
}

/**
 * Replaces a deck's entire entry list. Mutators in `useDecks` funnel through
 * this rather than diffing individual card changes — a deck's entry list is
 * never large enough for that coarseness to matter. Runs inside the caller's
 * transaction so a bad row can't leave the deck half-written.
 */
export async function replaceDeckEntries(
  tx: Tx,
  deckId: string,
  entries: DeckEntryInput[],
) {
  await tx.delete(deckEntry).where(eq(deckEntry.deckId, deckId));
  if (entries.length === 0) return;
  await tx.insert(deckEntry).values(
    entries.map((entry) => ({
      id: nanoid(),
      deckId,
      card: entry.card,
      count: entry.count,
      addedAt: new Date(entry.addedAt ?? Date.now()),
    })),
  );
}

/**
 * The deck behind a share link, or `null` when there is none or it has gone
 * back to private. Shared by the share page, its OG image and the clone
 * action, so all three agree on what "shared" means.
 */
export async function getSharedDeck(
  slug: string,
): Promise<{ deck: Deck; ownerId: string } | null> {
  const [row] = await db.select().from(deck).where(eq(deck.shareSlug, slug));
  if (!row || row.visibility === "private") return null;

  const entries = await db
    .select()
    .from(deckEntry)
    .where(eq(deckEntry.deckId, row.id))
    .orderBy(asc(deckEntry.addedAt));

  return { deck: toDeck(row, entries), ownerId: row.userId };
}
