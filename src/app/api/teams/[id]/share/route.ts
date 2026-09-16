import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { team } from "@/db/schema";
import { getSessionUser, getSessionUserId } from "@/lib/api-session";
import { buildShareUpdate, parseShareBody } from "@/lib/sharing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const shareColumns = {
  visibility: team.visibility,
  shareSlug: team.shareSlug,
  sharedAt: team.sharedAt,
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [existing] = await db
    .select(shareColumns)
    .from(team)
    .where(and(eq(team.id, id), eq(team.userId, userId)));

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
    .select({ shareSlug: team.shareSlug })
    .from(team)
    .where(and(eq(team.id, id), eq(team.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(team)
    .set(buildShareUpdate(existing, body))
    .where(and(eq(team.id, id), eq(team.userId, userId)))
    .returning(shareColumns);

  return NextResponse.json(updated);
}
