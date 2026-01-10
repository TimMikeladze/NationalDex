import type { Generation } from "./team"

// Generation limits define which Pokemon are available in each generation
// This accounts for cross-generational availability (e.g., Gen 1 Pokemon in Gen 4)
export interface GenerationLimit {
  generation: Generation
  name: string
  label: string
  // Maximum Pokemon ID available in this generation's regional dex
  maxPokemonId: number
  // Cumulative - includes all previous generation Pokemon
  cumulativeMaxId: number
  // Some generations have restricted regional dexes before post-game
  regionalDexLimit?: number
  // Description of what's available
  description: string
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  content?: string
  // Which generations this news applies to
  generations?: Generation[]
  // Custom limit for Pokemon shown (e.g., only show first 151 for Kanto news)
  pokemonLimit?: number
  // Optional Pokemon ID range filter
  pokemonRange?: [number, number]
  category: NewsCategory
  publishedAt: number
  imageUrl?: string
  // Optional link to more details
  link?: string
}

export type NewsCategory =
  | "game-release"
  | "regional-dex"
  | "event"
  | "update"
  | "feature"

export interface NewsFilterState {
  search: string
  categories: NewsCategory[]
  generations: Generation[]
  // Custom limit - only show news affecting Pokemon up to this ID
  pokemonLimit?: number
}

export interface NewsListResponse {
  items: NewsItem[]
  total: number
  limit: number
  offset: number
}

// Generation limits with cross-generational availability data
export const GENERATION_LIMITS: GenerationLimit[] = [
  {
    generation: "generation-i",
    name: "Gen I",
    label: "Red/Blue/Yellow",
    maxPokemonId: 151,
    cumulativeMaxId: 151,
    description: "Kanto region - Original 151 Pokemon",
  },
  {
    generation: "generation-ii",
    name: "Gen II",
    label: "Gold/Silver/Crystal",
    maxPokemonId: 251,
    cumulativeMaxId: 251,
    description: "Johto region - Includes all Kanto Pokemon",
  },
  {
    generation: "generation-iii",
    name: "Gen III",
    label: "Ruby/Sapphire/Emerald",
    maxPokemonId: 386,
    cumulativeMaxId: 386,
    regionalDexLimit: 202, // Hoenn dex before National Dex
    description: "Hoenn region - Regional dex limited, full access post-game",
  },
  {
    generation: "generation-iv",
    name: "Gen IV",
    label: "Diamond/Pearl/Platinum",
    maxPokemonId: 493,
    cumulativeMaxId: 493,
    regionalDexLimit: 210, // Sinnoh dex (expanded to 210 in Platinum)
    description: "Sinnoh region - Full National Dex available post-game",
  },
  {
    generation: "generation-v",
    name: "Gen V",
    label: "Black/White",
    maxPokemonId: 649,
    cumulativeMaxId: 649,
    regionalDexLimit: 156, // Unova dex (only new Pokemon until post-game)
    description: "Unova region - Only new Pokemon until post-game",
  },
  {
    generation: "generation-vi",
    name: "Gen VI",
    label: "X/Y",
    maxPokemonId: 721,
    cumulativeMaxId: 721,
    description: "Kalos region - Wide variety of older Pokemon available",
  },
  {
    generation: "generation-vii",
    name: "Gen VII",
    label: "Sun/Moon",
    maxPokemonId: 809,
    cumulativeMaxId: 809,
    regionalDexLimit: 403, // Alola dex
    description: "Alola region - Selected Pokemon from all regions",
  },
  {
    generation: "generation-viii",
    name: "Gen VIII",
    label: "Sword/Shield",
    maxPokemonId: 905,
    cumulativeMaxId: 905,
    regionalDexLimit: 400, // Galar dex (base game)
    description: "Galar region - Limited dex, expanded via DLC",
  },
  {
    generation: "generation-ix",
    name: "Gen IX",
    label: "Scarlet/Violet",
    maxPokemonId: 1025,
    cumulativeMaxId: 1025,
    regionalDexLimit: 400, // Paldea dex (base game)
    description: "Paldea region - Full dex with DLC",
  },
]

// Helper to get limit for a specific generation
export function getGenerationLimit(generation: Generation): GenerationLimit | undefined {
  return GENERATION_LIMITS.find((g) => g.generation === generation)
}

// Get all Pokemon available in a given generation (cumulative)
export function getPokemonLimitForGeneration(generation: Generation): number {
  const limit = getGenerationLimit(generation)
  return limit?.cumulativeMaxId ?? 1025
}

// Get regional dex limit (pre-post-game)
export function getRegionalDexLimit(generation: Generation): number {
  const limit = getGenerationLimit(generation)
  return limit?.regionalDexLimit ?? limit?.cumulativeMaxId ?? 1025
}

// Check if a Pokemon ID is available in a given generation
export function isPokemonAvailableInGeneration(
  pokemonId: number,
  generation: Generation,
  useRegionalDex = false
): boolean {
  const limit = getGenerationLimit(generation)
  if (!limit) return true

  const maxId = useRegionalDex && limit.regionalDexLimit
    ? limit.regionalDexLimit
    : limit.cumulativeMaxId

  return pokemonId <= maxId
}

// Get generations where a Pokemon is available
export function getGenerationsForPokemon(pokemonId: number): Generation[] {
  return GENERATION_LIMITS
    .filter((g) => pokemonId <= g.cumulativeMaxId)
    .map((g) => g.generation)
}
