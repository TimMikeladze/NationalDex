import { asc, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deck, deckEntry } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { deckSchema, replaceDeckEntries, toDeck } from "@/lib/server/decks";
import { parseJsonBody } from "@/lib/server/request";
import type { Deck } from "@/types/deck";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(deck)
    .where(eq(deck.userId, userId))
    .orderBy(asc(deck.createdAt));
  if (rows.length === 0) {
    return NextResponse.json([]);
  }

  const entries = await db
    .select()
    .from(deckEntry)
    .where(
      inArray(
        deckEntry.deckId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(deckEntry.addedAt));

  const entriesByDeck = new Map<string, typeof entries>();
  for (const entry of entries) {
    const bucket = entriesByDeck.get(entry.deckId);
    if (bucket) {
      bucket.push(entry);
    } else {
      entriesByDeck.set(entry.deckId, [entry]);
    }
  }

  const result: Deck[] = rows.map((row) =>
    toDeck(row, entriesByDeck.get(row.id) ?? []),
  );

  return NextResponse.json(result);
}

/**
 * Creates a deck, or — for an id this user already owns — replaces it and its
 * entries wholesale. The client sends a full deck on creation, on duplicate,
 * on the first local -> remote import, and when restoring a backup. An id
 * that belongs to someone else is left untouched and reported as not found.
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request, deckSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid deck" }, { status: 400 });
  }

  const owned = await db.transaction(async (tx) => {
    const now = Date.now();
    const fields = {
      name: body.name,
      formatId: body.formatId,
      language: body.language,
      typeFocus: body.typeFocus ?? null,
      notes: body.notes ?? null,
      updatedAt: new Date(body.updatedAt ?? now),
    };
    await tx
      .insert(deck)
      .values({
        id: body.id,
        userId,
        createdAt: new Date(body.createdAt ?? now),
        ...fields,
      })
      .onConflictDoUpdate({
        target: deck.id,
        set: fields,
        setWhere: eq(deck.userId, userId),
      });

    const [existing] = await tx
      .select({ userId: deck.userId })
      .from(deck)
      .where(eq(deck.id, body.id));
    if (!existing || existing.userId !== userId) return false;

    await replaceDeckEntries(tx, body.id, body.entries ?? []);
    return true;
  });

  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
