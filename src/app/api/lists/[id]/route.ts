import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { list } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { listPatchSchema } from "@/lib/server/lists";
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
  const body = await parseJsonBody(request, listPatchSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid list" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: list.id })
    .from(list)
    .where(and(eq(list.id, id), eq(list.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(list)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      // `null` clears the description; a body without the key leaves it.
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(list.id, id), eq(list.userId, userId)))
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
    .select({ id: list.id })
    .from(list)
    .where(and(eq(list.id, id), eq(list.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascades to list_item.
  await db.delete(list).where(and(eq(list.id, id), eq(list.userId, userId)));

  return NextResponse.json({ ok: true });
}
