import { Dex } from "@pkmn/dex";
import type { Generation, Team, TeamMember } from "@/types/team";
import { GENERATION_INFO, GENERATIONS_LIST } from "@/types/team";
import { pokemonSpriteById } from "./sprites";

/**
 * Pokemon Showdown team format parser and generator.
 * Supports the standard Smogon paste format used by Pokemon Showdown,
 * Smogon, PokePaste, and other competitive Pokemon tools.
 */

// Showdown format example:
// Pikachu @ Light Ball
// Ability: Static
// EVs: 252 SpA / 4 SpD / 252 Spe
// Timid Nature
// - Thunderbolt
// - Grass Knot
// - Hidden Power [Ice]
// - Volt Switch

export interface ShowdownPokemon {
  name: string;
  nickname?: string;
  species: string;
  item?: string;
  ability?: string;
  moves: string[];
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
  nature?: string;
  level?: number;
  shiny?: boolean;
  gender?: "M" | "F";
  teraType?: string;
}

export interface ParsedShowdownTeam {
  pokemon: ShowdownPokemon[];
  errors: string[];
}

/**
 * Parse a Pokemon Showdown/Smogon format team string
 */
export function parseShowdownFormat(text: string): ParsedShowdownTeam {
  const result: ParsedShowdownTeam = {
    pokemon: [],
    errors: [],
  };

  // Split into Pokemon blocks (double newline or === separators)
  const blocks = text
    .split(/\n\s*\n|===/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.length === 0) continue;

    const pokemon: ShowdownPokemon = {
      name: "",
      species: "",
      moves: [],
    };

    // First line: "Nickname (Species) @ Item" or "Species @ Item" or just "Species"
    const firstLine = lines[0];

    // Parse first line for species/nickname/item
    let speciesLine = firstLine;
    if (firstLine.includes("@")) {
      const [pokePart, itemPart] = firstLine.split("@").map((s) => s.trim());
      speciesLine = pokePart;
      pokemon.item = itemPart;
    }

    // Check for nickname (Species) pattern
    const nicknameMatch = speciesLine.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (nicknameMatch) {
      pokemon.nickname = nicknameMatch[1].trim();
      pokemon.species = nicknameMatch[2].trim();
    } else {
      pokemon.species = speciesLine.trim();
    }

    // Handle gender suffix like "Pikachu (F)" without nickname
    const genderOnlyMatch = pokemon.species.match(/^(.+?)\s*\((M|F)\)\s*$/);
    if (genderOnlyMatch) {
      pokemon.species = genderOnlyMatch[1].trim();
      pokemon.gender = genderOnlyMatch[2] as "M" | "F";
    }

    pokemon.name = pokemon.species;

    // Parse remaining lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("Ability:")) {
        pokemon.ability = line.replace("Ability:", "").trim();
      } else if (line.startsWith("Level:")) {
        pokemon.level = parseInt(line.replace("Level:", "").trim(), 10);
      } else if (line.startsWith("Shiny:")) {
        pokemon.shiny =
          line.replace("Shiny:", "").trim().toLowerCase() === "yes";
      } else if (line.startsWith("Tera Type:")) {
        pokemon.teraType = line.replace("Tera Type:", "").trim();
      } else if (line.startsWith("EVs:")) {
        pokemon.evs = parseStats(line.replace("EVs:", "").trim());
      } else if (line.startsWith("IVs:")) {
        pokemon.ivs = parseStats(line.replace("IVs:", "").trim());
      } else if (line.endsWith("Nature")) {
        pokemon.nature = line.replace("Nature", "").trim();
      } else if (line.startsWith("-")) {
        const move = line.replace(/^-\s*/, "").trim();
        if (move) pokemon.moves.push(move);
      }
    }

    // Validate that we got a species
    if (pokemon.species) {
      result.pokemon.push(pokemon);
    }
  }

  return result;
}

/**
 * Parse stat string like "252 HP / 4 Def / 252 Spe"
 */
function parseStats(statString: string): Record<string, number> {
  const stats: Record<string, number> = {};
  const parts = statString.split("/").map((s) => s.trim());

  for (const part of parts) {
    const match = part.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const stat = match[2].trim().toLowerCase();
      // Normalize stat names
      const statMap: Record<string, string> = {
        hp: "hp",
        atk: "atk",
        attack: "atk",
        def: "def",
        defense: "def",
        spa: "spa",
        "sp. atk": "spa",
        spatk: "spa",
        "special attack": "spa",
        spd: "spd",
        "sp. def": "spd",
        spdef: "spd",
        "special defense": "spd",
        spe: "spe",
        speed: "spe",
      };
      const normalizedStat = statMap[stat] || stat;
      stats[normalizedStat] = value;
    }
  }

  return stats;
}

/**
 * Export a team to Pokemon Showdown format
 */
export function exportToShowdown(team: Team): string {
  const lines: string[] = [];

  for (const member of team.members) {
    // Just the Pokemon name for basic export
    lines.push(member.name);
    lines.push(""); // Empty line between Pokemon
  }

  return lines.join("\n").trim();
}

/**
 * Export a team to detailed Pokemon Showdown format with placeholder moves
 */
export function exportToShowdownDetailed(team: Team): string {
  const lines: string[] = [];

  for (let i = 0; i < team.members.length; i++) {
    const member = team.members[i];
    lines.push(member.name);
    lines.push("Ability: ");
    lines.push("- ");
    lines.push("- ");
    lines.push("- ");
    lines.push("- ");
    if (i < team.members.length - 1) {
      lines.push(""); // Empty line between Pokemon
    }
  }

  return lines.join("\n");
}

/**
 * Import Pokemon from Showdown format into a team
 * Returns array of TeamMembers that could be resolved
 */
export function importFromShowdown(
  text: string,
  generation: Generation,
): { members: TeamMember[]; errors: string[] } {
  const parsed = parseShowdownFormat(text);
  const members: TeamMember[] = [];
  const errors: string[] = [];
  const genInfo = GENERATION_INFO[generation];
  const [minId, maxId] = genInfo.pokemonRange;

  for (const pokemon of parsed.pokemon) {
    // Try to find the species in the dex
    const species = Dex.species.get(pokemon.species);

    if (!species || !species.exists || species.num <= 0) {
      errors.push(`Could not find Pokemon: ${pokemon.species}`);
      continue;
    }

    // Check if Pokemon is in the generation range
    if (species.num < minId || species.num > maxId) {
      errors.push(
        `${species.name} (#${species.num}) is not available in ${genInfo.name}`,
      );
      continue;
    }

    // Check for duplicates
    if (members.some((m) => m.id === species.num)) {
      errors.push(`Duplicate Pokemon skipped: ${species.name}`);
      continue;
    }

    // Check team size limit
    if (members.length >= 6) {
      errors.push(`Team is full, skipping: ${species.name}`);
      continue;
    }

    members.push({
      id: species.num,
      name: species.name,
      sprite: pokemonSpriteById(species.num),
    });
  }

  return { members, errors };
}

/**
 * Try to detect generation from Pokemon in import text.
 * If Pokemon span multiple generations, returns "national-dex".
 */
export function detectGenerationFromShowdown(text: string): Generation | null {
  const parsed = parseShowdownFormat(text);
  const pokemonNums: number[] = [];

  for (const pokemon of parsed.pokemon) {
    const species = Dex.species.get(pokemon.species);
    if (species?.exists && species.num > 0) {
      pokemonNums.push(species.num);
    }
  }

  if (pokemonNums.length === 0) return null;

  // Find each Pokemon's generation
  const pokemonGens = new Set<Generation>();
  for (const num of pokemonNums) {
    for (const gen of GENERATIONS_LIST) {
      if (gen === "national-dex") continue;
      const [minId, maxId] = GENERATION_INFO[gen].pokemonRange;
      if (num >= minId && num <= maxId) {
        pokemonGens.add(gen);
        break;
      }
    }
  }

  // If Pokemon span multiple generations, return national-dex
  if (pokemonGens.size > 1) {
    return "national-dex";
  }

  // If all Pokemon are from the same generation, return that
  if (pokemonGens.size === 1) {
    return [...pokemonGens][0];
  }

  return "national-dex"; // Default to national dex
}

// JSON Export/Import types
export interface TeamExportData {
  version: number;
  exportDate: string;
  teams: Team[];
}

/**
 * Export all teams to JSON format
 */
export function exportTeamsToJSON(teams: Team[]): string {
  const data: TeamExportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    teams,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Export a single team to JSON format
 */
export function exportTeamToJSON(team: Team): string {
  const data: TeamExportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    teams: [team],
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import teams from JSON format
 */
export function importTeamsFromJSON(jsonString: string): {
  teams: Team[];
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const data = JSON.parse(jsonString);

    // Handle raw array format (just teams array)
    if (Array.isArray(data)) {
      return validateAndFixTeams(data, errors);
    }

    // Handle wrapped format with version
    if (data.teams && Array.isArray(data.teams)) {
      return validateAndFixTeams(data.teams, errors);
    }

    errors.push("Invalid JSON format: expected teams array");
    return { teams: [], errors };
  } catch {
    errors.push("Failed to parse JSON");
    return { teams: [], errors };
  }
}

/**
 * Validate and fix imported teams
 */
function validateAndFixTeams(
  teams: unknown[],
  errors: string[],
): { teams: Team[]; errors: string[] } {
  const validTeams: Team[] = [];

  for (const team of teams) {
    if (!team || typeof team !== "object") {
      errors.push("Invalid team object");
      continue;
    }

    const t = team as Record<string, unknown>;

    // Validate required fields
    if (!t.name || typeof t.name !== "string") {
      errors.push("Team missing name");
      continue;
    }

    if (
      !t.generation ||
      !GENERATIONS_LIST.includes(t.generation as Generation)
    ) {
      errors.push(`Invalid generation for team "${t.name}"`);
      continue;
    }

    // Validate members
    const members: TeamMember[] = [];
    if (Array.isArray(t.members)) {
      for (const m of t.members) {
        if (
          m &&
          typeof m === "object" &&
          typeof (m as Record<string, unknown>).id === "number" &&
          typeof (m as Record<string, unknown>).name === "string"
        ) {
          const member = m as TeamMember;
          members.push({
            id: member.id,
            name: member.name,
            sprite: member.sprite || pokemonSpriteById(member.id),
          });
        }
      }
    }

    // Create new team with fresh ID
    const now = Date.now();
    validTeams.push({
      id: `team-${now}-${Math.random().toString(36).slice(2, 9)}`,
      name: t.name as string,
      generation: t.generation as Generation,
      members: members.slice(0, 6), // Max 6 members
      createdAt: now,
      updatedAt: now,
    });
  }

  return { teams: validTeams, errors };
}

/**
 * Download text as a file
 */
export function downloadFile(
  content: string,
  filename: string,
  type = "text/plain",
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
