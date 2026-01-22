import type { Learnset } from "@pkmn/data";
import { gens, toID } from "./pkmn";

const cache: Map<string, Learnset> = new Map();
let loaded = false;

export async function preloadLearnsets(genNum = 9) {
  if (loaded) return;
  const gen = gens.get(genNum);

  for (const species of gen.species) {
    if (!species.exists || species.num <= 0) continue;
    const learnset = await gen.learnsets.get(species.name);
    if (learnset) cache.set(species.id, learnset);
  }
  loaded = true;
}

export async function getLearnset(
  speciesName: string,
  genNum = 9,
): Promise<Learnset | undefined> {
  const id = toID(speciesName);
  if (cache.has(id)) {
    return cache.get(id);
  }

  // Try the target generation first, then fall back to earlier generations
  // This handles Pokemon not in Gen 9 games (like Kakuna)
  for (let g = genNum; g >= 1; g--) {
    const gen = gens.get(g);
    const learnset = await gen.learnsets.get(speciesName);
    if (learnset?.learnset && Object.keys(learnset.learnset).length > 0) {
      cache.set(id, learnset);
      return learnset;
    }
  }

  return undefined;
}

export function canLearn(
  learnset: Learnset | undefined,
  moveName: string,
): boolean {
  if (!learnset?.learnset) return false;
  return learnset.learnset[toID(moveName)] !== undefined;
}

export function getLearnableMoves(learnset: Learnset | undefined): string[] {
  if (!learnset?.learnset) return [];
  return Object.keys(learnset.learnset);
}

export type LearnMethod = "level-up" | "machine" | "egg" | "tutor" | "other";

export interface PokemonMove {
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  basePower: number;
  category: string;
  learnMethod: LearnMethod;
  levelLearnedAt: number;
  description: string;
  priority: number;
  target: string;
}

function parseLearnMethod(source: string): {
  method: LearnMethod;
  level: number;
} {
  const _genChar = source[0];
  const methodChar = source[1];
  const rest = source.slice(2);

  switch (methodChar) {
    case "L":
      return { method: "level-up", level: Number.parseInt(rest, 10) || 0 };
    case "M":
      return { method: "machine", level: 0 };
    case "E":
      return { method: "egg", level: 0 };
    case "T":
      return { method: "tutor", level: 0 };
    default:
      return { method: "other", level: 0 };
  }
}

export async function getPokemonMoves(
  speciesName: string,
  genNum = 9,
): Promise<PokemonMove[]> {
  const learnset = await getLearnset(speciesName, genNum);
  if (!learnset?.learnset) return [];

  const moves: PokemonMove[] = [];
  const gen = gens.get(genNum);

  for (const [moveId, sources] of Object.entries(learnset.learnset)) {
    const move = gen.moves.get(moveId);
    if (!move || !move.exists) continue;

    // Try to find sources from the target generation first, then fall back to
    // the most recent generation available. This handles Pokemon not in Gen 9
    // games (like Weedle) by showing their most recent learnset.
    let targetSources = sources.filter((s) => s.startsWith(genNum.toString()));

    // If no sources for target gen, find the most recent generation available
    if (targetSources.length === 0) {
      // Find the highest generation number in the sources
      let maxGen = 0;
      for (const s of sources) {
        const sourceGen = Number.parseInt(s[0], 10);
        if (!Number.isNaN(sourceGen) && sourceGen > maxGen) {
          maxGen = sourceGen;
        }
      }
      if (maxGen > 0) {
        targetSources = sources.filter((s) => s.startsWith(maxGen.toString()));
      }
    }

    if (targetSources.length === 0) continue;

    // Prefer latest source
    const source = targetSources[targetSources.length - 1];
    const { method, level } = parseLearnMethod(source);

    moves.push({
      name: move.name,
      type: move.type,
      power: move.basePower || null,
      accuracy: move.accuracy === true ? null : move.accuracy,
      pp: move.pp,
      basePower: move.basePower,
      category: move.category,
      learnMethod: method,
      levelLearnedAt: level,
      description: move.shortDesc || move.desc || "",
      priority: move.priority,
      target: move.target,
    });
  }

  return moves;
}
