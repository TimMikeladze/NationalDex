import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { team } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { parseJsonBody } from "@/lib/server/request";
import { teamPatchSchema } from "@/lib/server/teams";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await parseJsonBody(request, teamPatchSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: team.id })
    .from(team)
    .where(and(eq(team.id, id), eq(team.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(team)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.generation !== undefined ? { generation: body.generation } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(team.id, id), eq(team.userId, userId)))
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
    .select({ id: team.id })
    .from(team)
    .where(and(eq(team.id, id), eq(team.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascades to team_member.
  await db.delete(team).where(and(eq(team.id, id), eq(team.userId, userId)));

  return NextResponse.json({ ok: true });
}
