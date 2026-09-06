"use client";

import { Dex } from "@pkmn/dex";
import { useCallback } from "react";
import type { WriteRequest } from "@/lib/sync/outbox";
import { SYNCED_STORAGE_KEYS } from "@/lib/sync/storage-keys";
import {
  createStorageStore,
  parseJsonArray,
  useStorageStore,
} from "@/lib/sync/storage-store";
import { useRemoteSync } from "@/lib/sync/use-remote-sync";
import {
  copyToClipboard,
  detectGenerationFromShowdown,
  downloadFile,
  exportTeamsToJSON,
  exportTeamToJSON,
  exportToShowdown,
  importFromShowdown,
  importTeamsFromJSON,
  parseShowdownFormat,
  type ShowdownPokemon,
} from "@/lib/team-export";
import type { Generation, Team, TeamMember } from "@/types/team";

function generateId(): string {
  return `team-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** A stored team, re-checked — also applied to teams restored from a backup. */
export function reviveTeam(item: unknown): Team | null {
  const team = item as Partial<Team> | null;
  if (!team || typeof team.id !== "string") return null;
  return {
    id: team.id,
    name: team.name || "Untitled team",
    generation: team.generation ?? "national-dex",
    members: Array.isArray(team.members) ? team.members : [],
    createdAt: team.createdAt ?? Date.now(),
    updatedAt: team.updatedAt ?? Date.now(),
  };
}

const store = createStorageStore<Team[]>(SYNCED_STORAGE_KEYS.teams, {
  parse: (raw) => parseJsonArray(raw, reviveTeam),
});

const getId = (team: Team) => team.id;
// The API returns full Team rows (members already nested).
const fromApi = (rows: Team[]) => rows;

/** The request that creates (or wholesale replaces) one team — also used by the backup restorer. */
export const createTeamRequest = (team: Team): WriteRequest => ({
  method: "POST",
  path: "/api/teams",
  body: team,
});
const deleteRequest = (team: Team): WriteRequest => ({
  method: "DELETE",
  path: `/api/teams/${team.id}`,
});

/**
 * `importFromShowdown` (team-export.ts) already resolves species/dedupes/caps
 * team size, but it only returns the bare `{id,name,sprite}` — it parses the
 * item/ability/nature/evs/ivs/moves along the way and drops them before
 * returning. Re-parsing here and matching by dex number recovers them without
 * touching team-export.ts (out of scope, its text/code export must stay as
 * is).
 */
function attachShowdownSetConfig(
  text: string,
  members: TeamMember[],
): TeamMember[] {
  const { pokemon: parsedPokemon } = parseShowdownFormat(text);
  const bySpeciesNum = new Map<number, ShowdownPokemon>();
  for (const p of parsedPokemon) {
    const species = Dex.species.get(p.species);
    if (species?.exists && species.num > 0 && !bySpeciesNum.has(species.num)) {
      bySpeciesNum.set(species.num, p);
    }
  }

  return members.map((member) => {
    const parsed = bySpeciesNum.get(member.id);
    if (!parsed) return member;
    return {
      ...member,
      ...(parsed.item !== undefined && { item: parsed.item }),
      ...(parsed.ability !== undefined && { ability: parsed.ability }),
      ...(parsed.nature !== undefined && { nature: parsed.nature }),
      ...(parsed.evs !== undefined && { evs: parsed.evs }),
      ...(parsed.ivs !== undefined && { ivs: parsed.ivs }),
      ...(parsed.moves.length > 0 && { moves: parsed.moves }),
    };
  });
}

/**
 * Applies a change to one team and stamps it as the most recently touched.
 * Returns the updated team, or `undefined` if no team matched `id` (or the
 * change was a no-op and `mutate` returned the team untouched).
 */
function mutateTeam(
  id: string,
  mutate: (team: Team) => Team,
): Team | undefined {
  let updated: Team | undefined;
  store.set(
    store.get().map((team) => {
      if (team.id !== id) return team;
      const next = mutate(team);
      if (next === team) return team;
      updated = { ...next, updatedAt: Date.now() };
      return updated;
    }),
  );
  return updated;
}

export function useTeams() {
  const { value: teams, isLoaded } = useStorageStore(store);

  const { syncWrite, clearAll } = useRemoteSync<Team, Team>({
    resource: "teams",
    apiPath: "/api/teams",
    store,
    isLocalLoaded: isLoaded,
    getId,
    fromApi,
    importLocal: createTeamRequest,
    deleteRequest,
  });

  /** Adds a brand-new team locally and creates it remotely. */
  const addTeam = useCallback(
    (team: Team) => {
      store.set([...store.get(), team]);
      void syncWrite(createTeamRequest(team));
    },
    [syncWrite],
  );

  /**
   * Adds a team that already exists on the server under this user — a clone
   * of a shared team — to the local mirror, without sending anything.
   */
  const receiveTeam = useCallback((team: Team) => {
    const current = store.get();
    if (current.some((entry) => entry.id === team.id)) return;
    store.set([...current, team]);
  }, []);

  /** A team has at most 6 members — replace the whole list rather than diffing, same reasoning as decks. */
  const syncMembers = useCallback(
    (teamId: string, members: TeamMember[]) => {
      void syncWrite({
        method: "PATCH",
        path: `/api/teams/${teamId}/members`,
        body: { members },
      });
    },
    [syncWrite],
  );

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
      addTeam(newTeam);
      return newTeam;
    },
    [addTeam],
  );

  const updateTeam = useCallback(
    (id: string, updates: Partial<Pick<Team, "name" | "members">>) => {
      const updated = mutateTeam(id, (team) => ({ ...team, ...updates }));
      if (!updated) return;
      if (updates.members !== undefined) {
        syncMembers(id, updated.members);
      } else if (updates.name !== undefined) {
        void syncWrite({
          method: "PATCH",
          path: `/api/teams/${id}`,
          body: { name: updated.name },
        });
      }
    },
    [syncMembers, syncWrite],
  );

  const deleteTeam = useCallback(
    (id: string) => {
      store.set(store.get().filter((team) => team.id !== id));
      void syncWrite({ method: "DELETE", path: `/api/teams/${id}` });
    },
    [syncWrite],
  );

  const getTeam = useCallback(
    (id: string): Team | undefined => teams.find((team) => team.id === id),
    [teams],
  );

  const addMember = useCallback(
    (teamId: string, member: TeamMember) => {
      const updated = mutateTeam(teamId, (team) => {
        if (team.members.length >= 6) return team;
        if (team.members.some((m) => m.id === member.id)) return team;
        return { ...team, members: [...team.members, member] };
      });
      if (updated) syncMembers(teamId, updated.members);
    },
    [syncMembers],
  );

  const removeMember = useCallback(
    (teamId: string, pokemonId: number) => {
      const updated = mutateTeam(teamId, (team) => ({
        ...team,
        members: team.members.filter((m) => m.id !== pokemonId),
      }));
      if (updated) syncMembers(teamId, updated.members);
    },
    [syncMembers],
  );

  // Import teams from JSON format
  const importTeamsJSON = useCallback(
    (jsonString: string): { imported: number; errors: string[] } => {
      const { teams: importedTeams, errors } = importTeamsFromJSON(jsonString);
      if (importedTeams.length > 0) {
        store.set([...store.get(), ...importedTeams]);
        for (const team of importedTeams) {
          void syncWrite(createTeamRequest(team));
        }
      }
      return { imported: importedTeams.length, errors };
    },
    [syncWrite],
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

      const enrichedMembers = attachShowdownSetConfig(text, members);

      const now = Date.now();
      const newTeam: Team = {
        id: generateId(),
        name: teamName,
        generation: gen,
        members: enrichedMembers,
        createdAt: now,
        updatedAt: now,
      };

      addTeam(newTeam);
      return { team: newTeam, errors };
    },
    [addTeam],
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
    receiveTeam,
    updateTeam,
    deleteTeam,
    getTeam,
    addMember,
    removeMember,
    /** Settings' "reset everything" action — see `useRemoteSync`'s `clearAll`. */
    clearTeams: clearAll,
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
