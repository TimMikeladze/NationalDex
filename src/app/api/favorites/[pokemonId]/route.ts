import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { favorite } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

interface RouteParams {
  params: Promise<{ pokemonId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pokemonId } = await params;

  await db
    .delete(favorite)
    .where(
      and(
        eq(favorite.userId, userId),
        eq(favorite.pokemonId, Number(pokemonId)),
      ),
    );

  return NextResponse.json({ ok: true });
}
