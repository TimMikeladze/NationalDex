import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { team } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { parseJsonBody } from "@/lib/server/request";
import { replaceTeamMembers, teamMembersSchema } from "@/lib/server/teams";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Replaces a team's entire member list in one go — see `replaceTeamMembers`. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;
  const body = await parseJsonBody(request, teamMembersSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid members" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: team.id })
    .from(team)
    .where(and(eq(team.id, teamId), eq(team.userId, userId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await replaceTeamMembers(tx, teamId, body.members);
    await tx
      .update(team)
      .set({ updatedAt: new Date() })
      .where(eq(team.id, teamId));
  });

  return NextResponse.json({ ok: true });
}
