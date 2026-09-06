import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { favorite } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { parseJsonBody } from "@/lib/server/request";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(favorite)
    .where(eq(favorite.userId, userId))
    .orderBy(asc(favorite.createdAt));

  return NextResponse.json(rows);
}

const bodySchema = z.object({ pokemonId: z.number().int() });

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request, bodySchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid favorite" }, { status: 400 });
  }

  const [row] = await db
    .insert(favorite)
    .values({ id: nanoid(), userId, pokemonId: body.pokemonId })
    .onConflictDoNothing({
      target: [favorite.userId, favorite.pokemonId],
    })
    .returning();

  return NextResponse.json(row ?? { ok: true }, { status: 201 });
}
