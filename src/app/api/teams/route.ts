import { asc, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { team, teamMember } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { parseJsonBody } from "@/lib/server/request";
import { replaceTeamMembers, teamSchema, toTeam } from "@/lib/server/teams";
import type { Team } from "@/types/team";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(team)
    .where(eq(team.userId, userId))
    .orderBy(asc(team.createdAt));
  if (rows.length === 0) {
    return NextResponse.json([]);
  }

  const members = await db
    .select()
    .from(teamMember)
    .where(
      inArray(
        teamMember.teamId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(teamMember.position));

  const membersByTeam = new Map<string, typeof members>();
  for (const member of members) {
    const bucket = membersByTeam.get(member.teamId);
    if (bucket) {
      bucket.push(member);
    } else {
      membersByTeam.set(member.teamId, [member]);
    }
  }

  const result: Team[] = rows.map((row) =>
    toTeam(row, membersByTeam.get(row.id) ?? []),
  );

  return NextResponse.json(result);
}

/**
 * Creates a team, or — for an id this user already owns — replaces it and its
 * members wholesale. The client sends a full team on creation, on import, on
 * the first local -> remote sync, and when restoring a backup. An id that
 * belongs to someone else is left untouched and reported as not found.
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request, teamSchema);
  if (!body) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const owned = await db.transaction(async (tx) => {
    const now = Date.now();
    const fields = {
      name: body.name,
      generation: body.generation,
      updatedAt: new Date(body.updatedAt ?? now),
    };
    await tx
      .insert(team)
      .values({
        id: body.id,
        userId,
        createdAt: new Date(body.createdAt ?? now),
        ...fields,
      })
      .onConflictDoUpdate({
        target: team.id,
        set: fields,
        setWhere: eq(team.userId, userId),
      });

    const [existing] = await tx
      .select({ userId: team.userId })
      .from(team)
      .where(eq(team.id, body.id));
    if (!existing || existing.userId !== userId) return false;

    await replaceTeamMembers(tx, body.id, body.members ?? []);
    return true;
  });

  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
