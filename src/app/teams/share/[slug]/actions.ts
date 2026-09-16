"use server";

import { nanoid } from "nanoid";
import { db } from "@/db";
import { team } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { getSharedTeam, replaceTeamMembers } from "@/lib/server/teams";
import type { Team } from "@/types/team";

/**
 * Copies a shared team into the current user's own collection and returns
 * the copy, in the client's shape, so the caller can show it at once.
 * Visibility is re-checked here, not just at page-load time, in case the
 * owner flipped it back to private between the page rendering and the click.
 */
export async function cloneSharedTeam(slug: string): Promise<Team> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const shared = await getSharedTeam(slug);
  if (!shared) {
    throw new Error("Team not found");
  }

  const now = Date.now();
  const copy: Team = {
    ...shared.team,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.insert(team).values({
      id: copy.id,
      userId,
      name: copy.name,
      generation: copy.generation,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      visibility: "private",
    });
    await replaceTeamMembers(tx, copy.id, copy.members);
  });

  return copy;
}
