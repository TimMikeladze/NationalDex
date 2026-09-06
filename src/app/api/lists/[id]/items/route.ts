import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { list, listItem } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { listItemSchema, toListItemRow } from "@/lib/server/lists";
import { parseJsonBody } from "@/lib/server/request";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: listId } = await params;
  const body = await parseJsonBody(request, listItemSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: list.id })
    .from(list)
    .where(and(eq(list.id, listId), eq(list.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // An item already in the list stays as it was — no duplicate row, and the
  // list isn't stamped as changed for a no-op.
  const [inserted] = await db
    .insert(listItem)
    .values(toListItemRow(listId, body))
    .onConflictDoNothing({
      target: [listItem.listId, listItem.type, listItem.refId],
    })
    .returning();

  if (!inserted) {
    return NextResponse.json({ ok: true });
  }

  await db
    .update(list)
    .set({ updatedAt: new Date() })
    .where(eq(list.id, listId));

  return NextResponse.json(inserted, { status: 201 });
}
