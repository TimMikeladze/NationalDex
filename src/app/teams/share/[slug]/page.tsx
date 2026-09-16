import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSessionUserId } from "@/lib/api-session";
import { getSharedTeam } from "@/lib/server/teams";
import { generationName } from "@/types/team";
import { CloneTeamButton } from "./clone-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const shared = await getSharedTeam(slug);
  if (!shared) {
    return { title: "Team not found" };
  }
  return {
    title: shared.team.name,
    description: `A ${generationName(shared.team.generation)} team with ${shared.team.members.length} Pokémon, shared on NationalDex.`,
  };
}

export default async function SharedTeamPage({ params }: PageProps) {
  const { slug } = await params;
  const [shared, viewerId] = await Promise.all([
    getSharedTeam(slug),
    getSessionUserId(),
  ]);
  if (!shared) {
    notFound();
  }

  const { team: sharedTeam, ownerId } = shared;
  const { members, generation } = sharedTeam;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">{sharedTeam.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {generationName(generation)} • {members.length}/6 pokemon •
            shared team
          </p>
        </div>
        {/* The owner following their own link gets sent home, not a duplicate. */}
        {viewerId === ownerId ? (
          <Button asChild variant="outline">
            <Link href={`/teams/${sharedTeam.id}`}>
              Open in your collection
            </Link>
          </Button>
        ) : (
          <CloneTeamButton slug={slug} />
        )}
      </div>

      {members.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            this team has no pokemon yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {members.map((member, index) => {
            const moves = member.moves ?? [];
            return (
              <Card key={`${member.id}-${index}`} className="p-4">
                <div className="flex flex-col items-center text-center">
                  {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
                  <img
                    src={member.sprite}
                    alt={member.name}
                    className="size-20 pixelated"
                  />
                  <span className="text-sm font-medium mt-1">
                    {member.name}
                  </span>
                  {member.item && (
                    <span className="text-xs text-muted-foreground mt-1">
                      @ {member.item}
                    </span>
                  )}
                  {member.ability && (
                    <span className="text-xs text-muted-foreground">
                      {member.ability}
                    </span>
                  )}
                  {member.nature && (
                    <span className="text-xs text-muted-foreground">
                      {member.nature} Nature
                    </span>
                  )}
                  {moves.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {moves.map((move) => (
                        <li key={move}>- {move}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
