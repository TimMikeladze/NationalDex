"use client";

import { CloneButton } from "@/components/sharing/clone-button";
import { useTeams } from "@/hooks/use-teams";
import { cloneSharedTeam } from "./actions";

export function CloneTeamButton({ slug }: { slug: string }) {
  const { receiveTeam } = useTeams();
  return (
    <CloneButton
      resource="teams"
      noun="team"
      clone={() => cloneSharedTeam(slug)}
      receive={receiveTeam}
    />
  );
}
