import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, type Tx } from "@/db";
import { team, teamMember } from "@/db/schema";
import type { Generation, Team, TeamMember } from "@/types/team";

type TeamRow = typeof team.$inferSelect;
type TeamMemberRow = typeof teamMember.$inferSelect;

/** One member as the client sends it — the Showdown set fields are optional. */
export const teamMemberSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  sprite: z.string(),
  item: z.string().nullish(),
  ability: z.string().nullish(),
  nature: z.string().nullish(),
  evs: z.record(z.string(), z.number()).nullish(),
  ivs: z.record(z.string(), z.number()).nullish(),
  moves: z.array(z.string()).nullish(),
});
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

/** A whole team, as `POST /api/teams` receives it. */
export const teamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  generation: z.string().min(1),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  members: z.array(teamMemberSchema).max(6).optional(),
});

/** `PATCH /api/teams/[id]`. */
export const teamPatchSchema = z.object({
  name: z.string().min(1).optional(),
  generation: z.string().min(1).optional(),
});

/** `PATCH /api/teams/[id]/members` — the whole member list, at most six. */
export const teamMembersSchema = z.object({
  members: z.array(teamMemberSchema).max(6),
});

export function toTeamMember(row: TeamMemberRow): TeamMember {
  const member: TeamMember = {
    id: row.pokemonId,
    name: row.name,
    sprite: row.sprite,
  };
  if (row.item != null) member.item = row.item;
  if (row.ability != null) member.ability = row.ability;
  if (row.nature != null) member.nature = row.nature;
  if (row.evs != null) member.evs = row.evs as Record<string, number>;
  if (row.ivs != null) member.ivs = row.ivs as Record<string, number>;
  if (row.moves != null) member.moves = row.moves as string[];
  return member;
}

/** The `team_member` row for a member at `position` in its team. */
export function toTeamMemberRow(
  teamId: string,
  member: TeamMemberInput,
  position: number,
): typeof teamMember.$inferInsert {
  return {
    id: nanoid(),
    teamId,
    pokemonId: member.id,
    name: member.name,
    sprite: member.sprite,
    position,
    item: member.item ?? null,
    ability: member.ability ?? null,
    nature: member.nature ?? null,
    evs: member.evs ?? null,
    ivs: member.ivs ?? null,
    moves: member.moves ?? null,
  };
}

/** A team row plus its members (already in position order), in the client's shape. */
export function toTeam(row: TeamRow, members: TeamMemberRow[]): Team {
  return {
    id: row.id,
    name: row.name,
    generation: row.generation as Generation,
    members: members.map(toTeamMember),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

/**
 * Replaces a team's entire member list. Mutators in `useTeams` funnel through
 * this rather than diffing individual member changes — a team has at most 6
 * members, so that coarseness doesn't matter. Runs inside the caller's
 * transaction so a bad row can't leave the team half-written.
 */
export async function replaceTeamMembers(
  tx: Tx,
  teamId: string,
  members: TeamMemberInput[],
) {
  await tx.delete(teamMember).where(eq(teamMember.teamId, teamId));
  if (members.length === 0) return;
  await tx
    .insert(teamMember)
    .values(
      members.map((member, index) => toTeamMemberRow(teamId, member, index)),
    );
}

/**
 * The team behind a share link, or `null` when there is none or it has gone
 * back to private. Shared by the share page, its OG image and the clone
 * action, so all three agree on what "shared" means.
 */
export async function getSharedTeam(
  slug: string,
): Promise<{ team: Team; ownerId: string } | null> {
  const [row] = await db.select().from(team).where(eq(team.shareSlug, slug));
  if (!row || row.visibility === "private") return null;

  const members = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.teamId, row.id))
    .orderBy(asc(teamMember.position));

  return { team: toTeam(row, members), ownerId: row.userId };
}
