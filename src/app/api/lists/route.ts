import { asc, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { list, listItem } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { listSchema, replaceListItems, toList } from "@/lib/server/lists";
import { parseJsonBody } from "@/lib/server/request";
import type { List } from "@/types/list";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(list)
    .where(eq(list.userId, userId))
    .orderBy(asc(list.createdAt));
  if (rows.length === 0) {
    return NextResponse.json([]);
  }

  const items = await db
    .select()
    .from(listItem)
    .where(
      inArray(
        listItem.listId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(listItem.addedAt));

  const itemsByList = new Map<string, typeof items>();
  for (const item of items) {
    const bucket = itemsByList.get(item.listId);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsByList.set(item.listId, [item]);
    }
  }

  const result: List[] = rows.map((row) =>
    toList(row, itemsByList.get(row.id) ?? []),
  );

  return NextResponse.json(result);
}

/**
 * Creates a list, or — for an id this user already owns — replaces it and its
 * items wholesale. The client sends a full list on creation, on the first
 * local -> remote import, and when restoring a backup. An id that belongs to
 * someone else is left untouched and reported as not found.
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request, listSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid list" }, { status: 400 });
  }

  const owned = await db.transaction(async (tx) => {
    const now = Date.now();
    const fields = {
      name: body.name,
      description: body.description ?? null,
      updatedAt: new Date(body.updatedAt ?? now),
    };
    await tx
      .insert(list)
      .values({
        id: body.id,
        userId,
        createdAt: new Date(body.createdAt ?? now),
        ...fields,
      })
      .onConflictDoUpdate({
        target: list.id,
        set: fields,
        setWhere: eq(list.userId, userId),
      });

    const [existing] = await tx
      .select({ userId: list.userId })
      .from(list)
      .where(eq(list.id, body.id));
    if (!existing || existing.userId !== userId) return false;

    await replaceListItems(tx, body.id, body.items ?? []);
    return true;
  });

  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
