"use client";

import { useCallback, useEffect, useState } from "react";
import {
  copyToClipboard,
  detectGenerationFromShowdown,
  downloadFile,
  exportTeamsToJSON,
  exportTeamToJSON,
  exportToShowdown,
  importFromShowdown,
  importTeamsFromJSON,
} from "@/lib/team-export";
import type { Generation, Team, TeamMember } from "@/types/team";

const STORAGE_KEY = "pokedex-teams";

function generateId(): string {
  return `team-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTeams(JSON.parse(stored));
      } catch {
        setTeams([]);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    }
  }, [teams, isLoaded]);

  const createTeam = useCallback(
    (name: string, generation: Generation): Team => {
      const now = Date.now();
      const newTeam: Team = {
        id: generateId(),
        name,
        generation,
        members: [],
        createdAt: now,
        updatedAt: now,
      };
      setTeams((prev) => [...prev, newTeam]);
      return newTeam;
    },
    [],
  );

  const updateTeam = useCallback(
    (id: string, updates: Partial<Pick<Team, "name" | "members">>) => {
      setTeams((prev) =>
        prev.map((team) =>
          team.id === id
            ? { ...team, ...updates, updatedAt: Date.now() }
            : team,
        ),
      );
    },
    [],
  );

  const deleteTeam = useCallback((id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id));
  }, []);

  const getTeam = useCallback(
    (id: string): Team | undefined => teams.find((team) => team.id === id),
    [teams],
  );

  const addMember = useCallback((teamId: string, member: TeamMember) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) return team;
        if (team.members.length >= 6) return team;
        if (team.members.some((m) => m.id === member.id)) return team;
        return {
          ...team,
          members: [...team.members, member],
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const removeMember = useCallback((teamId: string, pokemonId: number) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) return team;
        return {
          ...team,
          members: team.members.filter((m) => m.id !== pokemonId),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  // Import teams from JSON format
  const importTeamsJSON = useCallback(
    (jsonString: string): { imported: number; errors: string[] } => {
      const { teams: importedTeams, errors } = importTeamsFromJSON(jsonString);
      if (importedTeams.length > 0) {
        setTeams((prev) => [...prev, ...importedTeams]);
      }
      return { imported: importedTeams.length, errors };
    },
    [],
  );

  // Import a team from Showdown format
  const importTeamShowdown = useCallback(
    (
      text: string,
      teamName: string,
      generation?: Generation,
    ): { team: Team | null; errors: string[] } => {
      // Auto-detect generation if not provided
      const gen =
        generation || detectGenerationFromShowdown(text) || "national-dex";
      const { members, errors } = importFromShowdown(text, gen);

      if (members.length === 0) {
        return { team: null, errors };
      }

      const now = Date.now();
      const newTeam: Team = {
        id: generateId(),
        name: teamName,
        generation: gen,
        members,
        createdAt: now,
        updatedAt: now,
      };

      setTeams((prev) => [...prev, newTeam]);
      return { team: newTeam, errors };
    },
    [],
  );

  // Export all teams to JSON
  const exportAllTeamsJSON = useCallback((): string => {
    return exportTeamsToJSON(teams);
  }, [teams]);

  // Export a single team to JSON
  const exportTeamJSON = useCallback(
    (teamId: string): string | null => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return null;
      return exportTeamToJSON(team);
    },
    [teams],
  );

  // Export a team to Showdown format
  const exportTeamShowdown = useCallback(
    (teamId: string): string | null => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return null;
      return exportToShowdown(team);
    },
    [teams],
  );

  // Download all teams as JSON file
  const downloadAllTeams = useCallback(() => {
    const json = exportTeamsToJSON(teams);
    const date = new Date().toISOString().split("T")[0];
    downloadFile(json, `pokemon-teams-${date}.json`, "application/json");
  }, [teams]);

  // Download a team as JSON file
  const downloadTeam = useCallback(
    (teamId: string) => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;
      const json = exportTeamToJSON(team);
      const safeName = team.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      downloadFile(json, `team-${safeName}.json`, "application/json");
    },
    [teams],
  );

  // Copy team to clipboard in Showdown format
  const copyTeamShowdown = useCallback(
    async (teamId: string): Promise<boolean> => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return false;
      const showdown = exportToShowdown(team);
      return copyToClipboard(showdown);
    },
    [teams],
  );

  return {
    teams,
    isLoaded,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeam,
    addMember,
    removeMember,
    // Import/Export
    importTeamsJSON,
    importTeamShowdown,
    exportAllTeamsJSON,
    exportTeamJSON,
    exportTeamShowdown,
    downloadAllTeams,
    downloadTeam,
    copyTeamShowdown,
  };
}
