import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { cardFavorite } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { parseJsonBody } from "@/lib/server/request";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(cardFavorite)
    .where(eq(cardFavorite.userId, userId))
    .orderBy(asc(cardFavorite.addedAt));

  return NextResponse.json(rows);
}

const bodySchema = z.object({
  cardId: z.string().min(1),
  name: z.string(),
  localId: z.string(),
  image: z.string().nullish(),
});

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request, bodySchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid card" }, { status: 400 });
  }

  const [row] = await db
    .insert(cardFavorite)
    .values({
      id: nanoid(),
      userId,
      cardId: body.cardId,
      name: body.name,
      localId: body.localId,
      image: body.image ?? null,
    })
    .onConflictDoNothing({
      target: [cardFavorite.userId, cardFavorite.cardId],
    })
    .returning();

  return NextResponse.json(row ?? { ok: true }, { status: 201 });
}
