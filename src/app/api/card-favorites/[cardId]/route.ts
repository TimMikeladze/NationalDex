import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cardFavorite } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;

  await db
    .delete(cardFavorite)
    .where(
      and(eq(cardFavorite.userId, userId), eq(cardFavorite.cardId, cardId)),
    );

  return NextResponse.json({ ok: true });
}
