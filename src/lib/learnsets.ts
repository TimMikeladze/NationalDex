import type { Learnset } from "@pkmn/data";
import { gens, LATEST_GEN, toID } from "./pkmn";

const cache: Map<string, Learnset | undefined> = new Map();
const preloaded = new Set<number>();

const learnsetKey = (genNum: number, id: string, exact: boolean) =>
  `${exact ? "exact" : "upto"}:${genNum}:${id}`;

function hasMoves(learnset: Learnset | undefined): boolean {
  return Boolean(
    learnset?.learnset && Object.keys(learnset.learnset).length > 0,
  );
}

export async function preloadLearnsets(genNum = LATEST_GEN) {
  if (preloaded.has(genNum)) return;
  const gen = gens.get(genNum);

  for (const species of gen.species) {
    if (!species.exists || species.num <= 0) continue;
    const learnset = await gen.learnsets.get(species.name);
    if (learnset) cache.set(learnsetKey(genNum, species.id, false), learnset);
  }
  preloaded.add(genNum);
}

export interface LearnsetOptions {
  /**
   * Only consider the requested generation's own learnset. Off by default,
   * which walks back through earlier generations so Pokemon missing from the
   * newest games (like Kakuna) still show their most recent moves.
   */
  exact?: boolean;
}

export async function getLearnset(
  speciesName: string,
  genNum = LATEST_GEN,
  options?: LearnsetOptions,
): Promise<Learnset | undefined> {
  const exact = options?.exact ?? false;
  const key = learnsetKey(genNum, toID(speciesName), exact);
  if (cache.has(key)) {
    return cache.get(key);
  }

  let result: Learnset | undefined;

  if (exact) {
    const learnset = await gens.get(genNum).learnsets.get(speciesName);
    if (hasMoves(learnset)) result = learnset;
  } else {
    // Try the target generation first, then fall back to earlier generations
    // This handles Pokemon not in Gen 9 games (like Kakuna)
    for (let g = genNum; g >= 1; g--) {
      const learnset = await gens.get(g).learnsets.get(speciesName);
      if (hasMoves(learnset)) {
        result = learnset;
        break;
      }
    }
  }

  cache.set(key, result);
  return result;
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

export type LearnMethod =
  | "level-up"
  | "machine"
  | "egg"
  | "tutor"
  | "event"
  | "other";

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

/**
 * Learnset sources look like `9L24` (gen 9, level 24) or `2M` (gen 2 TM).
 * See the source list in @pkmn/sim's learnsets data.
 */
function parseLearnMethod(source: string): {
  method: LearnMethod;
  level: number;
} {
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
    case "S":
      return { method: "event", level: 0 };
    default:
      // D (Dream World), R (restricted)
      return { method: "other", level: 0 };
  }
}

function sourceGeneration(source: string): number {
  const gen = Number.parseInt(source[0], 10);
  return Number.isNaN(gen) ? 0 : gen;
}

/** Ways a move is actually taught, as opposed to carried in on a transfer. */
const TAUGHT_METHODS = new Set(["L", "M", "E", "T", "S"]);

/**
 * Virtual Console / Let's Go transfer sources. These describe moves carried in
 * from another game rather than anything learnable in the generation itself,
 * and they duplicate the real source, so they are not shown.
 */
const isTransferSource = (source: string) => source[1] === "V";

/**
 * Generation whose sources should be displayed for a move: the most recent one
 * that taught it, falling back to Dream World / restricted sources when it was
 * never taught outright. Without that preference the real learnset of Pokemon
 * cut from the newer games would be hidden by a stray later source.
 */
function pickDisplayGeneration(sources: string[], genNum: number): number {
  let maxTaughtGen = 0;
  let maxGen = 0;

  for (const source of sources) {
    if (isTransferSource(source)) continue;
    const gen = sourceGeneration(source);
    if (gen > genNum) continue;
    if (gen > maxGen) maxGen = gen;
    if (TAUGHT_METHODS.has(source[1]) && gen > maxTaughtGen) maxTaughtGen = gen;
  }

  return maxTaughtGen || maxGen;
}

export async function getPokemonMoves(
  speciesName: string,
  genNum = LATEST_GEN,
  options?: LearnsetOptions,
): Promise<PokemonMove[]> {
  const exact = options?.exact ?? false;
  const learnset = await getLearnset(speciesName, genNum, options);
  if (!learnset?.learnset) return [];

  const moves: PokemonMove[] = [];
  const gen = gens.get(genNum);

  for (const [moveId, sources] of Object.entries(learnset.learnset)) {
    const move = gen.moves.get(moveId);
    if (!move || !move.exists) continue;

    const displayGen = exact ? genNum : pickDisplayGeneration(sources, genNum);
    if (displayGen === 0) continue;

    // A move can be taught several ways in the same generation (level-up and
    // TM, say); keep each method, at the earliest level it becomes available.
    const levelByMethod = new Map<LearnMethod, number>();
    for (const source of sources) {
      if (isTransferSource(source)) continue;
      if (sourceGeneration(source) !== displayGen) continue;
      const { method, level } = parseLearnMethod(source);
      const existing = levelByMethod.get(method);
      if (existing === undefined || level < existing) {
        levelByMethod.set(method, level);
      }
    }

    for (const [method, level] of levelByMethod) {
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
  }

  return moves;
}
