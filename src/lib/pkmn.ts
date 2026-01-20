import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";

export const gens = new Generations(Dex);
export const currentGen = gens.get(9);

export const toID = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "");

export function getAllSpecies(
  genNum = 9,
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

export function getAllTypes(genNum = 9) {
  return Array.from(gens.get(genNum).types).filter((t) => t.exists);
}

export function getAllNatures() {
  return Array.from(currentGen.natures);
}

export function getSpecies(name: string, genNum = 9) {
  return gens.get(genNum).species.get(name);
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

  for (const type of gen.types) {
    if (!type.exists) continue;
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

  for (const defendingType of gen.types) {
    if (!defendingType.exists) continue;
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
  { id: "gen-1", name: "Gen I", min: 1, max: 151 },
  { id: "gen-2", name: "Gen II", min: 152, max: 251 },
  { id: "gen-3", name: "Gen III", min: 252, max: 386 },
  { id: "gen-4", name: "Gen IV", min: 387, max: 493 },
  { id: "gen-5", name: "Gen V", min: 494, max: 649 },
  { id: "gen-6", name: "Gen VI", min: 650, max: 721 },
  { id: "gen-7", name: "Gen VII", min: 722, max: 809 },
  { id: "gen-8", name: "Gen VIII", min: 810, max: 905 },
  { id: "gen-9", name: "Gen IX", min: 906, max: 1025 },
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
