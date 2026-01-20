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
  const gen = gens.get(genNum);
  const learnset = await gen.learnsets.get(speciesName);
  if (learnset) {
    cache.set(id, learnset);
  }
  return learnset;
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
  const targetGenStr = genNum.toString();

  for (const [moveId, sources] of Object.entries(learnset.learnset)) {
    const move = gen.moves.get(moveId);
    if (!move || !move.exists) continue;

    // Filter to sources from the target generation
    const genSources = sources.filter((s) => s.startsWith(targetGenStr));
    if (genSources.length === 0) continue;

    // Prefer latest source in this generation
    const source = genSources[genSources.length - 1];
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
