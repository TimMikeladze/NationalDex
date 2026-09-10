import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";
import { REGION_LABELS } from "@/types/pokemon";

export const gens = new Generations(Dex);
export const currentGen = gens.get(9);

export const toID = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "");

export function getAllSpecies(
  _genNum = 9,
  options?: {
    includeFormes?: boolean;
  },
) {
  const includeFormes = options?.includeFormes ?? false;
  // Use Dex.species.all() to get ALL Pokemon from the National Dex,
  // not just those available in a specific generation's games.
  // This ensures Pokemon like #510 Liepard appear even though they're
  // not in Scarlet/Violet.
  return Dex.species.all().filter((s) => {
    if (s.num <= 0) return false;
    if (!includeFormes && s.forme) return false;
    return true;
  });
}

export function getAllMoves(genNum = 9) {
  return Array.from(gens.get(genNum).moves).filter(
    (m) => m.exists && m.num > 0,
  );
}

export function getAllAbilities(genNum = 9) {
  return Array.from(gens.get(genNum).abilities).filter(
    (a) => a.exists && a.num > 0,
  );
}

export function getAllItems(genNum = 9) {
  return Array.from(gens.get(genNum).items).filter(
    (i) => i.exists && i.num > 0,
  );
}

/**
 * Types a Pokemon or move can have in a generation. `???` (Gen II-IV) and
 * `Stellar` (Gen IX Tera type) are internal entries with no dex presence, so
 * they are left out.
 */
export function getAllTypes(genNum = 9) {
  return Array.from(gens.get(genNum).types).filter(
    (t) => t.exists && t.name !== "???" && t.name !== "Stellar",
  );
}

/**
 * Species present in a generation's games. Unlike {@link getAllSpecies}, which
 * always returns the full National Dex, this drops Pokemon the generation never
 * had — no Tyranitar in Gen I, no Kakuna in Gen IX.
 */
export function getGenSpecies(
  genNum: number,
  options?: {
    includeFormes?: boolean;
  },
) {
  const includeFormes = options?.includeFormes ?? false;
  return Array.from(gens.get(genNum).species).filter((s) => {
    if (!s.exists || s.num <= 0) return false;
    if (!includeFormes && s.forme) return false;
    return true;
  });
}

/**
 * Species for a view: the whole National Dex when no generation is selected,
 * otherwise just the ones that generation's games had.
 */
export function getSpeciesForView(
  genNum: number | null,
  options?: {
    includeFormes?: boolean;
  },
) {
  return genNum === null
    ? getAllSpecies(LATEST_GEN, options)
    : getGenSpecies(genNum, options);
}

export function getAllNatures() {
  return Array.from(currentGen.natures);
}

export function getSpecies(name: string, genNum = 9) {
  // Try generation-scoped lookup first, then fall back to global Dex.
  // Forms like Mega/Gmax may not exist in the target generation's data
  // but are still valid entries in the National Dex.
  const genResult = gens.get(genNum).species.get(name);
  if (genResult) return genResult;
  const dexResult = Dex.species.get(name);
  return dexResult.exists ? dexResult : undefined;
}

/**
 * Species as it existed in a specific generation's games (gen-specific base
 * stats, types and abilities), or undefined when it wasn't in those games.
 */
export function getSpeciesInGen(name: string, genNum: number) {
  return gens.get(genNum).species.get(name);
}

/**
 * Resolve a species from a National Dex number, a name, or a URL slug.
 * Uses the global Dex so every form (Mega, Gmax, regional) resolves, not just
 * the ones present in the latest generation's games.
 */
export function resolveSpecies(nameOrId: string | number) {
  const allSpecies = Dex.species.all();

  if (typeof nameOrId === "number") {
    // Find by dex number - prefer base form, then any form
    return (
      allSpecies.find((s) => s.num === nameOrId && !s.forme) ??
      allSpecies.find((s) => s.num === nameOrId)
    );
  }

  const byName = Dex.species.get(nameOrId);
  if (byName?.exists) return byName;

  const asNum = Number.parseInt(nameOrId, 10);
  if (!Number.isNaN(asNum)) {
    return (
      allSpecies.find((s) => s.num === asNum && !s.forme) ??
      allSpecies.find((s) => s.num === asNum)
    );
  }

  return undefined;
}

const generationsCache = new Map<string, number[]>();

function generationsWhere(
  cacheKey: string,
  existsInGen: (genNum: number) => boolean,
): number[] {
  const cached = generationsCache.get(cacheKey);
  if (cached) return cached;

  const result = GENERATIONS.map((g) => g.num).filter(existsInGen);
  generationsCache.set(cacheKey, result);
  return result;
}

/** Generations whose games had this move / ability / item / type. */
export function getMoveGenerations(name: string): number[] {
  return generationsWhere(`move:${toID(name)}`, (g) =>
    Boolean(getMove(name, g)),
  );
}

export function getAbilityGenerations(name: string): number[] {
  return generationsWhere(`ability:${toID(name)}`, (g) =>
    Boolean(getAbility(name, g)),
  );
}

export function getItemGenerations(name: string): number[] {
  return generationsWhere(`item:${toID(name)}`, (g) =>
    Boolean(getItem(name, g)),
  );
}

export function getTypeGenerations(name: string): number[] {
  return generationsWhere(`type:${toID(name)}`, (g) =>
    getAllTypes(g).some((t) => t.name.toLowerCase() === name.toLowerCase()),
  );
}

const speciesGenerationsCache = new Map<string, number[]>();

/**
 * Generation numbers whose games this species appears in, e.g. Kakuna is
 * `[1..7]` (cut from Sword/Shield onwards) and Great Tusk is `[9]`. Forms that
 * only exist in battle (Gmax) have no games of their own and return `[]`.
 */
export function getSpeciesGenerations(nameOrId: string | number): number[] {
  const species = resolveSpecies(nameOrId);
  if (!species) return [];

  const cached = speciesGenerationsCache.get(species.id);
  if (cached) return cached;

  const result: number[] = [];
  for (const { num } of GENERATIONS) {
    if (getSpeciesInGen(species.name, num)) result.push(num);
  }

  speciesGenerationsCache.set(species.id, result);
  return result;
}

export function getMove(name: string, genNum = 9) {
  return gens.get(genNum).moves.get(name);
}

export function getAbility(name: string, genNum = 9) {
  return gens.get(genNum).abilities.get(name);
}

export function getItem(name: string, genNum = 9) {
  return gens.get(genNum).items.get(name);
}

export function getType(name: string, genNum = 9) {
  return gens.get(genNum).types.get(name);
}

export function getTypeMatchups(types: string[], genNum = 9) {
  const gen = gens.get(genNum);
  const weaknesses: { type: string; multiplier: number }[] = [];
  const resistances: { type: string; multiplier: number }[] = [];
  const immunities: string[] = [];

  for (const type of getAllTypes(genNum)) {
    // biome-ignore lint/suspicious/noExplicitAny: library typing for totalEffectiveness is too strict here
    const eff = gen.types.totalEffectiveness(type.name, types as any);
    if (eff > 1) weaknesses.push({ type: type.name, multiplier: eff });
    else if (eff < 1 && eff > 0)
      resistances.push({ type: type.name, multiplier: eff });
    else if (eff === 0) immunities.push(type.name);
  }

  weaknesses.sort((a, b) => b.multiplier - a.multiplier);
  resistances.sort((a, b) => a.multiplier - b.multiplier);

  return { weaknesses, resistances, immunities };
}

export function getOffensiveTypeMatchups(attackingType: string, genNum = 9) {
  const gen = gens.get(genNum);
  const superEffective: string[] = [];
  const notVeryEffective: string[] = [];
  const noEffect: string[] = [];

  for (const defendingType of getAllTypes(genNum)) {
    // biome-ignore lint/suspicious/noExplicitAny: library typing
    const eff = gen.types.totalEffectiveness(
      attackingType as any,
      [defendingType.name] as any,
    );
    if (eff > 1) superEffective.push(defendingType.name);
    else if (eff < 1 && eff > 0) notVeryEffective.push(defendingType.name);
    else if (eff === 0) noEffect.push(defendingType.name);
  }

  return { superEffective, notVeryEffective, noEffect };
}

export function formatStatName(stat: string): string {
  const map: Record<string, string> = {
    hp: "HP",
    atk: "Attack",
    def: "Defense",
    spa: "Sp. Atk",
    spd: "Sp. Def",
    spe: "Speed",
  };
  return map[stat] ?? stat;
}

export function formatName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const ALL_TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
] as const;

export const DAMAGE_CLASSES = ["Physical", "Special", "Status"] as const;

export const GENERATIONS = [
  { id: "generation-i", num: 1, name: "Gen I", label: "Red/Blue" },
  { id: "generation-ii", num: 2, name: "Gen II", label: "Gold/Silver" },
  { id: "generation-iii", num: 3, name: "Gen III", label: "Ruby/Sapphire" },
  { id: "generation-iv", num: 4, name: "Gen IV", label: "Diamond/Pearl" },
  { id: "generation-v", num: 5, name: "Gen V", label: "Black/White" },
  { id: "generation-vi", num: 6, name: "Gen VI", label: "X/Y" },
  { id: "generation-vii", num: 7, name: "Gen VII", label: "Sun/Moon" },
  { id: "generation-viii", num: 8, name: "Gen VIII", label: "Sword/Shield" },
  { id: "generation-ix", num: 9, name: "Gen IX", label: "Scarlet/Violet" },
] as const;

export const GEN_RANGES = [
  {
    id: "gen-1",
    name: "Gen I",
    label: "Red/Blue",
    region: "kanto",
    min: 1,
    max: 151,
  },
  {
    id: "gen-2",
    name: "Gen II",
    label: "Gold/Silver",
    region: "johto",
    min: 152,
    max: 251,
  },
  {
    id: "gen-3",
    name: "Gen III",
    label: "Ruby/Sapphire",
    region: "hoenn",
    min: 252,
    max: 386,
  },
  {
    id: "gen-4",
    name: "Gen IV",
    label: "Diamond/Pearl",
    region: "sinnoh",
    min: 387,
    max: 493,
  },
  {
    id: "gen-5",
    name: "Gen V",
    label: "Black/White",
    region: "unova",
    min: 494,
    max: 649,
  },
  {
    id: "gen-6",
    name: "Gen VI",
    label: "X/Y",
    region: "kalos",
    min: 650,
    max: 721,
  },
  {
    id: "gen-7",
    name: "Gen VII",
    label: "Sun/Moon",
    region: "alola",
    min: 722,
    max: 809,
  },
  {
    id: "gen-8",
    name: "Gen VIII",
    label: "Sword/Shield",
    region: "galar",
    min: 810,
    max: 905,
  },
  {
    id: "gen-9",
    name: "Gen IX",
    label: "Scarlet/Violet",
    region: "paldea",
    min: 906,
    max: 1025,
  },
] as const;

export function getGenerationByPokemonId(pokemonId: number): string | null {
  for (const gen of GEN_RANGES) {
    if (pokemonId >= gen.min && pokemonId <= gen.max) {
      return gen.id;
    }
  }
  return null;
}

export function getGenerationName(genNum: number): string {
  return GENERATIONS.find((g) => g.num === genNum)?.name ?? `Gen ${genNum}`;
}

export const VARIANT_SUFFIXES = [
  "Gmax",
  "Mega",
  "Mega-X",
  "Mega-Y",
  "Mega-Z",
  "Alola",
  "Galar",
  "Hisui",
  "Paldea",
];

export const VARIANT_DISPLAY_NAMES: Record<string, string> = {
  Gmax: "Gigantamax",
  Mega: "Mega",
  "Mega-X": "Mega X",
  "Mega-Y": "Mega Y",
  "Mega-Z": "Mega Z",
  Alola: "Alolan",
  Galar: "Galarian",
  Hisui: "Hisuian",
  Paldea: "Paldean",
};

/**
 * Extract the variant suffix from a Pokemon name.
 * e.g., "Pikachu-Gmax" -> "Gmax", "Raichu-Alola" -> "Alola"
 */
export function getVariantFromName(name: string): string | null {
  for (const suffix of VARIANT_SUFFIXES) {
    if (name.endsWith(`-${suffix}`)) {
      return suffix;
    }
  }
  return null;
}

/**
 * Get the base name without the variant suffix.
 * e.g., "Pikachu-Gmax" -> "Pikachu", "Raichu-Alola" -> "Raichu"
 */
export function getBaseName(name: string): string {
  const variant = getVariantFromName(name);
  if (variant) {
    return name.slice(0, -(variant.length + 1)); // Remove "-Variant"
  }
  return name;
}

/**
 * Display name of the region a Pokemon debuted in, from its dex number:
 * the region of the generation that introduced it.
 */
export function getRegionFromDexNumber(dexNumber: number): string | null {
  const gen = GEN_RANGES.find((g) => dexNumber >= g.min && dexNumber <= g.max);
  return gen ? REGION_LABELS[gen.region] : null;
}

/** Bar color for a stat, thresholded on its percentage of the max stat value. */
export function getStatColor(percentage: number): string {
  if (percentage > 75) return "#22c55e";
  if (percentage > 50) return "#eab308";
  return "#ef4444";
}

/** Games a generation covers, e.g. "Gold/Silver" for gen 2. */
export function getGenerationGames(genNum: number): string {
  return GENERATIONS.find((g) => g.num === genNum)?.label ?? "";
}

/** The most recent generation this app has data for. */
export const LATEST_GEN = 9;

/** Abilities were introduced in Gen III. */
export const FIRST_ABILITY_GEN = 3;

/** Breeding, eggs and genders arrived in Gen II. */
export const FIRST_BREEDING_GEN = 2;

/** Gen I used a single Special stat instead of Sp. Atk / Sp. Def. */
export const COMBINED_SPECIAL_GEN = 1;

export const ALL_ITEM_POCKETS = [
  "medicine",
  "pokeballs",
  "machines",
  "berries",
  "battle",
  "key",
  "mail",
  "misc",
] as const;
