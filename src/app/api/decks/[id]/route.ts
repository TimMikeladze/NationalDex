import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deck } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { deckPatchSchema } from "@/lib/server/decks";
import { parseJsonBody } from "@/lib/server/request";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await parseJsonBody(request, deckPatchSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid deck" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.id, id), eq(deck.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(deck)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.formatId !== undefined ? { formatId: body.formatId } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.typeFocus !== undefined ? { typeFocus: body.typeFocus } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(deck.id, id), eq(deck.userId, userId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [existing] = await db
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.id, id), eq(deck.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascades to deck_entry.
  await db.delete(deck).where(and(eq(deck.id, id), eq(deck.userId, userId)));

  return NextResponse.json({ ok: true });
}
