export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy"

export interface PokemonListItem {
  name: string
  url: string
}

export interface PokemonListResponse {
  count: number
  next: string | null
  previous: string | null
  results: PokemonListItem[]
}

export interface PokemonStat {
  name: string
  value: number
}

export interface PokemonAbility {
  name: string
  isHidden: boolean
}

export interface Pokemon {
  id: number
  name: string
  types: PokemonType[]
  sprite: string
  spriteShiny: string | null
  height: number // in decimeters
  weight: number // in hectograms
  stats: PokemonStat[]
  abilities: PokemonAbility[]
}

export interface PokemonSpecies {
  id: number
  name: string
  description: string
  genus: string
  evolutionChainUrl: string | null
  generation: string
  // Extended data
  genderRate: number // -1 = genderless, 0-8 = female eighths
  captureRate: number
  baseHappiness: number
  hatchCounter: number
  growthRate: string
  eggGroups: string[]
  evYield: { stat: string; value: number }[]
}

export interface PokemonMove {
  name: string
  type: PokemonType
  power: number | null
  accuracy: number | null
  pp: number
  damageClass: "physical" | "special" | "status"
  learnMethod: "level-up" | "machine" | "egg" | "tutor" | "other"
  levelLearnedAt: number
}

export interface EvolutionChainLink {
  id: number
  name: string
  sprite: string
  evolvesTo: EvolutionChainLink[]
  evolutionDetails: EvolutionDetail[]
}

export interface EvolutionDetail {
  trigger: string
  minLevel: number | null
  item: string | null
  heldItem: string | null
  timeOfDay: string | null
  minHappiness: number | null
  knownMove: string | null
  location: string | null
  otherRequirement: string | null
}

export interface TypeEffectiveness {
  weaknesses: { type: PokemonType; multiplier: number }[]
  resistances: { type: PokemonType; multiplier: number }[]
  immunities: PokemonType[]
}

export interface MoveDetail {
  id: number
  name: string
  type: PokemonType
  damageClass: "physical" | "special" | "status"
  power: number | null
  accuracy: number | null
  pp: number
  priority: number
  description: string
  effectChance: number | null
  target: string
  generation: string
}

export interface AbilityDetail {
  id: number
  name: string
  description: string
  shortDescription: string
  generation: string
  isMainSeries: boolean
}

export const TYPE_COLORS: Record<PokemonType, string> = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
}
