import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { preferences } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

// Only these four columns are writable — `userId` in the body is dropped, so
// a request can't move its write (or the ON CONFLICT target) onto another
// user's row.
const patchSchema = z.object({
  spriteSetOverride: z.string().nullable().optional(),
  preferredGeneration: z.number().int().nullable().optional(),
  preferredGameVersion: z.string().nullable().optional(),
  contentWidth: z.enum(["contained", "full"]).optional(),
});

export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }
  const body = parsed.data;

  const [row] = await db
    .insert(preferences)
    .values({ userId, ...body, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: preferences.userId,
      set: { ...body, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json(row);
}
