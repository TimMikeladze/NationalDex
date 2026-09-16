import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { team, teamMember } from "@/db/schema";
import { generationName } from "@/types/team";

export const metadata: Metadata = {
  title: "Browse shared teams",
  description: "Public Pokémon teams shared by the NationalDex community.",
};

// Rendered per request: a team shared a minute ago must show up now, and the
// build must not need a database.
export const dynamic = "force-dynamic";

async function getPublicTeams() {
  const rows = await db
    .select()
    .from(team)
    .where(and(eq(team.visibility, "public"), isNotNull(team.shareSlug)))
    .orderBy(desc(team.sharedAt));

  if (rows.length === 0) return [];

  const members = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(
      inArray(
        teamMember.teamId,
        rows.map((row) => row.id),
      ),
    );

  const countByTeam = new Map<string, number>();
  for (const member of members) {
    countByTeam.set(member.teamId, (countByTeam.get(member.teamId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    memberCount: countByTeam.get(row.id) ?? 0,
  }));
}

export default async function BrowseTeamsPage() {
  const teams = await getPublicTeams();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-medium">Browse shared teams</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Public teams shared by other trainers
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">no public teams yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((row) => (
            <Link key={row.id} href={`/teams/share/${row.shareSlug}`}>
              <Card className="hover:bg-muted/50 transition-colors h-full">
                <CardHeader>
                  <CardTitle>{row.name}</CardTitle>
                  <CardDescription>
                    {generationName(row.generation)} • {row.memberCount}/6
                    pokemon
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
