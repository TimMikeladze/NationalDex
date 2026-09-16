import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deck } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { deckEntriesSchema, replaceDeckEntries } from "@/lib/server/decks";
import { parseJsonBody } from "@/lib/server/request";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Replaces a deck's entire entry list in one go — see `replaceDeckEntries`. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: deckId } = await params;
  const body = await parseJsonBody(request, deckEntriesSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid entries" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.id, deckId), eq(deck.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await replaceDeckEntries(tx, deckId, body.entries);
    await tx
      .update(deck)
      .set({ updatedAt: new Date() })
      .where(eq(deck.id, deckId));
  });

  return NextResponse.json({ ok: true });
}
