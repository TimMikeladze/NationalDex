import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { list, listItem } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";

interface RouteParams {
  params: Promise<{ id: string; itemType: string; itemId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: listId, itemType, itemId } = await params;

  const [existing] = await db
    .select({ id: list.id })
    .from(list)
    .where(and(eq(list.id, listId), eq(list.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(listItem)
    .where(
      and(
        eq(listItem.listId, listId),
        eq(listItem.type, itemType),
        eq(listItem.refId, itemId),
      ),
    );

  await db
    .update(list)
    .set({ updatedAt: new Date() })
    .where(eq(list.id, listId));

  return NextResponse.json({ ok: true });
}
