"use server";

import { nanoid } from "nanoid";
import { db } from "@/db";
import { deck } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { getSharedDeck, replaceDeckEntries } from "@/lib/server/decks";
import type { Deck } from "@/types/deck";

/**
 * Copies a shared deck into the current user's own collection and returns
 * the copy, in the client's shape, so the caller can show it at once.
 * Visibility is re-checked here, not just at page-load time, in case the
 * owner flipped it back to private between the page rendering and the click.
 */
export async function cloneSharedDeck(slug: string): Promise<Deck> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const shared = await getSharedDeck(slug);
  if (!shared) {
    throw new Error("Deck not found");
  }

  const now = Date.now();
  const copy: Deck = {
    ...shared.deck,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.insert(deck).values({
      id: copy.id,
      userId,
      name: copy.name,
      formatId: copy.formatId,
      language: copy.language,
      typeFocus: copy.typeFocus ?? null,
      notes: copy.notes ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      visibility: "private",
    });
    await replaceDeckEntries(tx, copy.id, copy.entries);
  });

  return copy;
}
