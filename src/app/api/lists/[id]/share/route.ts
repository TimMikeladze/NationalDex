import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { list } from "@/db/schema";
import { getSessionUser, getSessionUserId } from "@/lib/api-session";
import { buildShareUpdate, parseShareBody } from "@/lib/sharing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const shareColumns = {
  visibility: list.visibility,
  shareSlug: list.shareSlug,
  sharedAt: list.sharedAt,
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [existing] = await db
    .select(shareColumns)
    .from(list)
    .where(and(eq(list.id, id), eq(list.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(existing);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.isAnonymous) {
    return NextResponse.json(
      { error: "Sign in to share this" },
      { status: 403 },
    );
  }
  const userId = user.id;

  const { id } = await params;
  const body = parseShareBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }

  const [existing] = await db
    .select({ shareSlug: list.shareSlug })
    .from(list)
    .where(and(eq(list.id, id), eq(list.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(list)
    .set(buildShareUpdate(existing, body))
    .where(and(eq(list.id, id), eq(list.userId, userId)))
    .returning(shareColumns);

  return NextResponse.json(updated);
}
