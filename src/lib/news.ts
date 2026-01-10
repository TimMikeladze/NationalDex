import type {
  NewsItem,
  NewsCategory,
  NewsFilterState,
  NewsListResponse,
  GenerationLimit,
} from "@/types/news"
import {
  GENERATION_LIMITS,
  getPokemonLimitForGeneration,
  getRegionalDexLimit,
} from "@/types/news"
import type { Generation } from "@/types/team"

// Sample news data - in a real app this would come from an API/CMS
const NEWS_DATA: NewsItem[] = [
  {
    id: "gen9-dlc-complete",
    title: "Pokemon Scarlet/Violet DLC Complete",
    summary: "The Indigo Disk DLC brings the total to 1025 Pokemon available.",
    content: "With The Indigo Disk DLC released, all 1025 Pokemon from Generations I-IX are now available in Pokemon Scarlet and Violet.",
    generations: ["generation-ix"],
    pokemonLimit: 1025,
    category: "game-release",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
  },
  {
    id: "lets-go-pikachu",
    title: "Let's Go Pikachu/Eevee - Kanto Reimagined",
    summary: "Experience Kanto with the original 151 Pokemon plus Meltan and Melmetal.",
    content: "Pokemon Let's Go features the original 151 Kanto Pokemon, along with their Alolan forms and the new Mythical Pokemon Meltan and Melmetal.",
    generations: ["generation-i", "generation-vii"],
    pokemonLimit: 153, // 151 + Meltan + Melmetal
    pokemonRange: [1, 151],
    category: "game-release",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 365 * 2, // 2 years ago
  },
  {
    id: "bdsp-sinnoh-dex",
    title: "Brilliant Diamond/Shining Pearl Regional Dex",
    summary: "Sinnoh remakes feature the expanded Platinum regional dex with 210 Pokemon.",
    content: "The Sinnoh remakes include the expanded regional dex from Pokemon Platinum, featuring 210 Pokemon available before the National Dex.",
    generations: ["generation-iv"],
    pokemonLimit: 493,
    pokemonRange: [1, 493],
    category: "regional-dex",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 365, // 1 year ago
  },
  {
    id: "legends-arceus",
    title: "Pokemon Legends: Arceus - Ancient Sinnoh",
    summary: "Explore Hisui with a curated selection of Pokemon from across generations.",
    content: "Pokemon Legends: Arceus features 242 Pokemon available in the Hisui region, including new regional forms and evolutions.",
    generations: ["generation-viii"],
    pokemonLimit: 905,
    category: "game-release",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 365 * 1.5, // 1.5 years ago
  },
  {
    id: "gen5-new-only",
    title: "Black/White - All New Pokemon",
    summary: "Gen V features only new Pokemon until post-game - the first time since Gen I.",
    content: "Pokemon Black and White feature 156 brand new Pokemon in the Unova regional dex. Older generation Pokemon are only available after completing the main story.",
    generations: ["generation-v"],
    pokemonLimit: 649,
    pokemonRange: [494, 649],
    category: "feature",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 365 * 5, // 5 years ago
  },
  {
    id: "home-transfer",
    title: "Pokemon HOME Compatibility",
    summary: "Transfer Pokemon between games with generation-based restrictions.",
    content: "Pokemon HOME allows transferring Pokemon between compatible games, with each game supporting a specific subset of the National Dex.",
    generations: [
      "generation-vi",
      "generation-vii",
      "generation-viii",
      "generation-ix",
    ],
    pokemonLimit: 1025,
    category: "feature",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 60, // 60 days ago
  },
  {
    id: "swsh-galar-dex",
    title: "Sword/Shield Galar Dex",
    summary: "The Galar region features 400 Pokemon in its base regional dex.",
    content: "Pokemon Sword and Shield introduced the first main series game without full National Dex support. The base Galar dex includes 400 Pokemon selected from across all generations.",
    generations: ["generation-viii"],
    pokemonLimit: 400,
    category: "regional-dex",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 365 * 2, // 2 years ago
  },
  {
    id: "swsh-dlc",
    title: "Sword/Shield DLC Expansion",
    summary: "Isle of Armor and Crown Tundra expand the available Pokemon.",
    content: "The DLC expansions for Sword and Shield significantly expanded the available Pokemon, adding over 200 returning species.",
    generations: ["generation-viii"],
    pokemonLimit: 664,
    category: "update",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 365 * 1.8, // 1.8 years ago
  },
  {
    id: "usum-alola-dex",
    title: "Ultra Sun/Ultra Moon Expanded Dex",
    summary: "The Alola dex expands to 403 Pokemon in USUM.",
    content: "Ultra Sun and Ultra Moon feature an expanded Alola Pokedex with 403 Pokemon, including several that weren't available in the original Sun and Moon.",
    generations: ["generation-vii"],
    pokemonLimit: 809,
    category: "regional-dex",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 365 * 3, // 3 years ago
  },
  {
    id: "oras-national-dex",
    title: "ORAS Full National Dex",
    summary: "Omega Ruby and Alpha Sapphire support all 721 Pokemon.",
    content: "The Hoenn remakes feature full National Dex support, allowing all 721 Pokemon from Generations I-VI to be obtained or transferred.",
    generations: ["generation-iii", "generation-vi"],
    pokemonLimit: 721,
    category: "game-release",
    publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 365 * 4, // 4 years ago
  },
]

// Default items per page
export const NEWS_PER_PAGE = 10

// Get news list with filtering and pagination
export function getNewsList(
  filter: Partial<NewsFilterState> = {},
  offset = 0,
  limit = NEWS_PER_PAGE
): NewsListResponse {
  let items = [...NEWS_DATA]

  // Filter by search term
  if (filter.search) {
    const searchLower = filter.search.toLowerCase()
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.summary.toLowerCase().includes(searchLower) ||
        item.content?.toLowerCase().includes(searchLower)
    )
  }

  // Filter by categories
  if (filter.categories && filter.categories.length > 0) {
    items = items.filter((item) => filter.categories!.includes(item.category))
  }

  // Filter by generations
  if (filter.generations && filter.generations.length > 0) {
    items = items.filter(
      (item) =>
        item.generations?.some((g) => filter.generations!.includes(g)) ?? false
    )
  }

  // Filter by Pokemon limit - show news that applies to Pokemon within this limit
  if (filter.pokemonLimit) {
    items = items.filter((item) => {
      // If news has a specific range, check if it overlaps with the limit
      if (item.pokemonRange) {
        return item.pokemonRange[0] <= filter.pokemonLimit!
      }
      // If news has a limit, check if any Pokemon within that limit are within filter
      if (item.pokemonLimit) {
        return item.pokemonLimit >= 1 // At least some Pokemon overlap
      }
      return true // No limit specified, include by default
    })
  }

  // Sort by date (newest first)
  items.sort((a, b) => b.publishedAt - a.publishedAt)

  const total = items.length
  const paginatedItems = items.slice(offset, offset + limit)

  return {
    items: paginatedItems,
    total,
    limit,
    offset,
  }
}

// Get a single news item by ID
export function getNewsItem(id: string): NewsItem | undefined {
  return NEWS_DATA.find((item) => item.id === id)
}

// Get news for a specific generation
export function getNewsForGeneration(
  generation: Generation,
  limit = NEWS_PER_PAGE
): NewsItem[] {
  return getNewsList({ generations: [generation] }, 0, limit).items
}

// Get news by category
export function getNewsByCategory(
  category: NewsCategory,
  limit = NEWS_PER_PAGE
): NewsItem[] {
  return getNewsList({ categories: [category] }, 0, limit).items
}

// Get news that applies to Pokemon within a specific ID range
export function getNewsForPokemonRange(
  minId: number,
  maxId: number,
  limit = NEWS_PER_PAGE
): NewsItem[] {
  const items = NEWS_DATA.filter((item) => {
    if (item.pokemonRange) {
      // Check if ranges overlap
      return item.pokemonRange[0] <= maxId && item.pokemonRange[1] >= minId
    }
    if (item.pokemonLimit) {
      // Check if any Pokemon in range are within the news's limit
      return minId <= item.pokemonLimit
    }
    return true
  })

  return items.slice(0, limit)
}

// Get all available news categories
export function getNewsCategories(): { id: NewsCategory; label: string }[] {
  return [
    { id: "game-release", label: "Game Releases" },
    { id: "regional-dex", label: "Regional Dex" },
    { id: "event", label: "Events" },
    { id: "update", label: "Updates" },
    { id: "feature", label: "Features" },
  ]
}

// Export generation limits for convenience
export { GENERATION_LIMITS, getPokemonLimitForGeneration, getRegionalDexLimit }
export type { GenerationLimit }
