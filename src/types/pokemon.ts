import type { LearnMethod } from "@/lib/learnsets";

export type { LearnMethod };

export type PokemonType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Electric"
  | "Grass"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon"
  | "Dark"
  | "Steel"
  | "Fairy";

export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonAbility {
  name: string;
  isHidden: boolean;
}

export interface Pokemon {
  id: number;
  name: string;
  types: PokemonType[];
  sprite: string;
  spriteShiny: string | null;
  height: number;
  weight: number;
  stats: PokemonStat[];
  abilities: PokemonAbility[];
}

export interface PokemonSpecies {
  id: number;
  name: string;
  description: string;
  genus: string;
  evolutionChainUrl: string | null;
  generation: string;
  genderRate: number;
  captureRate: number;
  baseHappiness: number;
  hatchCounter: number;
  growthRate: string;
  eggGroups: string[];
  evYield: { stat: string; value: number }[];
}

export interface PokemonMove {
  name: string;
  type: PokemonType;
  power: number | null;
  accuracy: number | null;
  pp: number;
  damageClass: "Physical" | "Special" | "Status";
  learnMethod: LearnMethod;
  levelLearnedAt: number;
  description: string;
  priority: number;
  target: string;
}

export interface EvolutionChainLink {
  id: number;
  name: string;
  sprite: string;
  evolvesTo: EvolutionChainLink[];
  evolutionDetails: EvolutionDetail[];
}

export interface EvolutionDetail {
  trigger: string;
  minLevel: number | null;
  item: string | null;
  heldItem: string | null;
  timeOfDay: string | null;
  minHappiness: number | null;
  knownMove: string | null;
  location: string | null;
  otherRequirement: string | null;
}

export interface TypeEffectiveness {
  weaknesses: { type: PokemonType; multiplier: number }[];
  resistances: { type: PokemonType; multiplier: number }[];
  immunities: PokemonType[];
}

export interface MoveDetail {
  id: number;
  name: string;
  type: PokemonType;
  damageClass: "Physical" | "Special" | "Status";
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  description: string;
  effectChance: number | null;
  target: string;
  generation: string;
}

export interface AbilityDetail {
  id: number;
  name: string;
  description: string;
  shortDescription: string;
  generation: string;
  isMainSeries: boolean;
}

export interface MoveListItem {
  id: number;
  name: string;
  type: PokemonType;
  damageClass: "Physical" | "Special" | "Status";
  power: number | null;
  accuracy: number | null;
  pp: number;
  generation: string;
}

export interface MovePokemon {
  id: number;
  name: string;
  sprite: string;
  learnMethods: {
    method: LearnMethod;
    levelLearnedAt: number;
  }[];
}

export interface FullMoveDetail extends MoveDetail {
  pokemon: MovePokemon[];
}

export interface AbilityPokemon {
  id: number;
  name: string;
  sprite: string;
  isHidden: boolean;
}

export interface FullAbilityDetail extends AbilityDetail {
  pokemon: AbilityPokemon[];
}

export interface TypeDamageRelations {
  doubleDamageTo: PokemonType[];
  halfDamageTo: PokemonType[];
  noDamageTo: PokemonType[];
  doubleDamageFrom: PokemonType[];
  halfDamageFrom: PokemonType[];
  noDamageFrom: PokemonType[];
}

export interface TypePokemon {
  id: number;
  name: string;
  sprite: string;
  slot: 1 | 2;
}

export interface TypeDetail {
  id: number;
  name: PokemonType;
  damageRelations: TypeDamageRelations;
  generation: string;
}

export interface FullTypeDetail extends TypeDetail {
  pokemon: TypePokemon[];
}

export const TYPE_COLORS: Record<PokemonType, string> = {
  Normal: "#A8A77A",
  Fire: "#EE8130",
  Water: "#6390F0",
  Electric: "#F7D02C",
  Grass: "#7AC74C",
  Ice: "#96D9D6",
  Fighting: "#C22E28",
  Poison: "#A33EA1",
  Ground: "#E2BF65",
  Flying: "#A98FF3",
  Psychic: "#F95587",
  Bug: "#A6B91A",
  Rock: "#B6A136",
  Ghost: "#735797",
  Dragon: "#6F35FC",
  Dark: "#705746",
  Steel: "#B7B7CE",
  Fairy: "#D685AD",
};

export const TYPE_TEXT_COLORS: Record<PokemonType, string> = {
  Normal: "#6D6C54",
  Fire: "#B85F1C",
  Water: "#3A6BC7",
  Electric: "#9A7D00",
  Grass: "#4A8A2C",
  Ice: "#4A8A8A",
  Fighting: "#C22E28",
  Poison: "#A33EA1",
  Ground: "#9A7830",
  Flying: "#6A5AB0",
  Psychic: "#C13A68",
  Bug: "#6A7A10",
  Rock: "#7A6A20",
  Ghost: "#735797",
  Dragon: "#6F35FC",
  Dark: "#705746",
  Steel: "#6A6A8A",
  Fairy: "#A8558A",
};

export type ItemPocket =
  | "misc"
  | "medicine"
  | "pokeballs"
  | "machines"
  | "berries"
  | "mail"
  | "battle"
  | "key";

export interface ItemListItem {
  id: number;
  name: string;
  sprite: string | null;
  category: string;
  pocket: ItemPocket;
  cost: number;
}

export interface ItemFlingEffect {
  name: string;
  description: string;
}

export interface ItemHeldByPokemon {
  id: number;
  name: string;
  sprite: string;
  rarity: number;
}

export interface FullItemDetail {
  id: number;
  name: string;
  sprite: string | null;
  category: string;
  pocket: ItemPocket;
  cost: number;
  flingPower: number | null;
  flingEffect: ItemFlingEffect | null;
  description: string;
  shortDescription: string;
  attributes: string[];
  heldByPokemon: ItemHeldByPokemon[];
  gameIndices: { game: string; generation: string }[];
}

export const ITEM_POCKET_COLORS: Record<ItemPocket, string> = {
  misc: "#9CA3AF",
  medicine: "#EC4899",
  pokeballs: "#EF4444",
  machines: "#8B5CF6",
  berries: "#22C55E",
  mail: "#F59E0B",
  battle: "#3B82F6",
  key: "#F97316",
};

export const ITEM_POCKET_LABELS: Record<ItemPocket, string> = {
  misc: "Misc",
  medicine: "Medicine",
  pokeballs: "Poke Balls",
  machines: "TMs & HMs",
  berries: "Berries",
  mail: "Mail",
  battle: "Battle Items",
  key: "Key Items",
};

// =============================================================================
// Location Types
// =============================================================================

export type Region =
  | "kanto"
  | "johto"
  | "hoenn"
  | "sinnoh"
  | "unova"
  | "kalos"
  | "alola"
  | "galar"
  | "hisui"
  | "paldea";

export interface LocationListItem {
  id: number;
  name: string;
  region: Region | null;
  areaCount: number;
}

export interface LocationArea {
  id: number;
  name: string;
  encounterMethodRates: {
    method: string;
    rate: number;
  }[];
}

export interface LocationDetail {
  id: number;
  name: string;
  region: Region | null;
  areas: LocationArea[];
  gameIndices: { game: string; generation: string }[];
}

export interface PokemonEncounter {
  locationName: string;
  locationId: number;
  areaName: string;
  versionDetails: {
    version: string;
    maxChance: number;
    encounterDetails: {
      minLevel: number;
      maxLevel: number;
      method: string;
      chance: number;
      conditions: string[];
    }[];
  }[];
}

export interface LocationPokemonEncounter {
  pokemonId: number;
  pokemonName: string;
  sprite: string;
  versionDetails: {
    version: string;
    maxChance: number;
    encounterDetails: {
      minLevel: number;
      maxLevel: number;
      method: string;
      chance: number;
      conditions: string[];
    }[];
  }[];
}

export const REGION_COLORS: Record<Region, string> = {
  kanto: "#EF4444",
  johto: "#F59E0B",
  hoenn: "#22C55E",
  sinnoh: "#3B82F6",
  unova: "#8B5CF6",
  kalos: "#EC4899",
  alola: "#F97316",
  galar: "#14B8A6",
  hisui: "#6366F1",
  paldea: "#A855F7",
};

export const REGION_LABELS: Record<Region, string> = {
  kanto: "Kanto",
  johto: "Johto",
  hoenn: "Hoenn",
  sinnoh: "Sinnoh",
  unova: "Unova",
  kalos: "Kalos",
  alola: "Alola",
  galar: "Galar",
  hisui: "Hisui",
  paldea: "Paldea",
};
