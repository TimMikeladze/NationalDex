/**
 * Pokedex entry utilities
 * Uses pre-bundled data for instant lookups, with API fallback for missing entries
 */

import pokedexData from "@/data/pokedex-entries.json";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

interface PokeAPIFlavorTextEntry {
  flavor_text: string;
  language: { name: string };
  version: { name: string };
}

interface PokeAPISpecies {
  id: number;
  name: string;
  flavor_text_entries: PokeAPIFlavorTextEntry[];
  genera: { genus: string; language: { name: string } }[];
}

export interface GameEntry {
  version: string;
  flavorText: string;
}

export interface PokedexEntry {
  id: number;
  name: string;
  genus: string;
  entries: GameEntry[];
}

// Type the imported JSON
const bundledEntries = pokedexData as Record<string, PokedexEntry>;

/**
 * Gets a Pokemon's Pokedex entry
 * Uses bundled data for instant lookup, falls back to API for missing entries
 */
export async function getPokedexEntry(
  pokemonId: number | string,
): Promise<PokedexEntry | null> {
  // Normalize ID (handle both number and string, including names like "pikachu")
  const numericId =
    typeof pokemonId === "number" ? pokemonId : Number.parseInt(pokemonId, 10);

  // Try bundled data first (instant, no network)
  if (!Number.isNaN(numericId) && bundledEntries[numericId]) {
    return bundledEntries[numericId];
  }

  // Fallback to API for missing entries (e.g., new Pokemon, forms)
  return fetchFromAPI(pokemonId);
}

// Order versions chronologically for display
const VERSION_ORDER = [
  "red",
  "blue",
  "yellow",
  "gold",
  "silver",
  "crystal",
  "ruby",
  "sapphire",
  "emerald",
  "firered",
  "leafgreen",
  "diamond",
  "pearl",
  "platinum",
  "heartgold",
  "soulsilver",
  "black",
  "white",
  "black-2",
  "white-2",
  "x",
  "y",
  "omega-ruby",
  "alpha-sapphire",
  "sun",
  "moon",
  "ultra-sun",
  "ultra-moon",
  "lets-go-pikachu",
  "lets-go-eevee",
  "sword",
  "shield",
  "brilliant-diamond",
  "shining-pearl",
  "legends-arceus",
  "scarlet",
  "violet",
];

/**
 * Fetches from PokeAPI (used as fallback)
 */
async function fetchFromAPI(
  pokemonId: number | string,
): Promise<PokedexEntry | null> {
  try {
    const res = await fetch(`${POKEAPI_BASE}/pokemon-species/${pokemonId}`, {
      next: { revalidate: 604800 }, // Cache for 1 week
    });

    if (!res.ok) {
      return null;
    }

    const data: PokeAPISpecies = await res.json();

    // Get all English flavor text entries
    const englishEntries = data.flavor_text_entries.filter(
      (e) => e.language.name === "en",
    );

    // Build unique entries per version
    const entriesMap = new Map<string, string>();
    for (const entry of englishEntries) {
      const version = entry.version.name;
      const flavorText = entry.flavor_text
        .replace(/\f|\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!entriesMap.has(version)) {
        entriesMap.set(version, flavorText);
      }
    }

    // Sort by version order (chronological)
    const entries: GameEntry[] = [];
    for (const version of VERSION_ORDER) {
      const text = entriesMap.get(version);
      if (text) {
        entries.push({ version, flavorText: text });
      }
    }

    // Add any remaining versions not in our order list
    for (const [version, text] of entriesMap) {
      if (!VERSION_ORDER.includes(version)) {
        entries.push({ version, flavorText: text });
      }
    }

    const genus =
      data.genera.find((g) => g.language.name === "en")?.genus ?? "";

    return {
      id: data.id,
      name: data.name,
      genus,
      entries,
    };
  } catch {
    return null;
  }
}
