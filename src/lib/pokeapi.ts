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

// =============================================================================
// Location API Types and Functions
// =============================================================================

interface PokeAPINamedResource {
  name: string;
  url: string;
}

export interface PokeAPILocation {
  id: number;
  name: string;
  region: PokeAPINamedResource | null;
  names: { name: string; language: PokeAPINamedResource }[];
  game_indices: {
    game_index: number;
    generation: PokeAPINamedResource;
  }[];
  areas: PokeAPINamedResource[];
}

export interface PokeAPILocationArea {
  id: number;
  name: string;
  game_index: number;
  encounter_method_rates: {
    encounter_method: PokeAPINamedResource;
    version_details: {
      rate: number;
      version: PokeAPINamedResource;
    }[];
  }[];
  location: PokeAPINamedResource;
  names: { name: string; language: PokeAPINamedResource }[];
  pokemon_encounters: {
    pokemon: PokeAPINamedResource;
    version_details: {
      version: PokeAPINamedResource;
      max_chance: number;
      encounter_details: {
        min_level: number;
        max_level: number;
        chance: number;
        method: PokeAPINamedResource;
        condition_values: PokeAPINamedResource[];
      }[];
    }[];
  }[];
}

interface PokeAPIRegion {
  id: number;
  name: string;
  locations: PokeAPINamedResource[];
  main_generation: PokeAPINamedResource | null;
  names: { name: string; language: PokeAPINamedResource }[];
}

interface PokeAPIPokemonEncounter {
  location_area: PokeAPINamedResource;
  version_details: {
    version: PokeAPINamedResource;
    max_chance: number;
    encounter_details: {
      min_level: number;
      max_level: number;
      chance: number;
      method: PokeAPINamedResource;
      condition_values: PokeAPINamedResource[];
    }[];
  }[];
}

export interface LocationListItem {
  id: number;
  name: string;
  displayName: string;
  region: string | null;
}

export interface RegionWithLocations {
  id: number;
  name: string;
  displayName: string;
  locations: LocationListItem[];
}

/**
 * Fetches all regions with their locations
 */
export async function getAllRegions(): Promise<RegionWithLocations[]> {
  try {
    // Fetch region list
    const listRes = await fetch(`${POKEAPI_BASE}/region?limit=20`, {
      next: { revalidate: 604800 },
    });
    if (!listRes.ok) return [];

    const listData = await listRes.json();
    const regionUrls: string[] = listData.results.map(
      (r: PokeAPINamedResource) => r.url,
    );

    // Fetch all regions in parallel
    const regions = await Promise.all(
      regionUrls.map(async (url) => {
        const res = await fetch(url, { next: { revalidate: 604800 } });
        if (!res.ok) return null;
        return res.json() as Promise<PokeAPIRegion>;
      }),
    );

    return regions
      .filter((r): r is PokeAPIRegion => r !== null)
      .map((region) => {
        const englishName =
          region.names.find((n) => n.language.name === "en")?.name ??
          formatLocationName(region.name);

        return {
          id: region.id,
          name: region.name,
          displayName: englishName,
          locations: region.locations.map((loc) => {
            const id = extractIdFromUrl(loc.url);
            return {
              id,
              name: loc.name,
              displayName: formatLocationName(loc.name),
              region: region.name,
            };
          }),
        };
      })
      .sort((a, b) => a.id - b.id);
  } catch {
    return [];
  }
}

/**
 * Fetches all locations (paginated, combines all)
 */
export async function getAllLocations(): Promise<LocationListItem[]> {
  try {
    // First fetch to get total count
    const initialRes = await fetch(`${POKEAPI_BASE}/location?limit=1`, {
      next: { revalidate: 604800 },
    });
    if (!initialRes.ok) return [];

    const initialData = await initialRes.json();
    const total = initialData.count;

    // Fetch all locations
    const res = await fetch(`${POKEAPI_BASE}/location?limit=${total}`, {
      next: { revalidate: 604800 },
    });
    if (!res.ok) return [];

    const data = await res.json();

    return data.results.map((loc: PokeAPINamedResource) => {
      const id = extractIdFromUrl(loc.url);
      return {
        id,
        name: loc.name,
        displayName: formatLocationName(loc.name),
        region: null, // Will be filled in when fetching details
      };
    });
  } catch {
    return [];
  }
}

/**
 * Fetches a single location's details
 */
export async function getLocation(
  idOrName: number | string,
): Promise<PokeAPILocation | null> {
  try {
    const res = await fetch(`${POKEAPI_BASE}/location/${idOrName}`, {
      next: { revalidate: 604800 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches a location area's details including Pokemon encounters
 */
export async function getLocationArea(
  idOrName: number | string,
): Promise<PokeAPILocationArea | null> {
  try {
    const res = await fetch(`${POKEAPI_BASE}/location-area/${idOrName}`, {
      next: { revalidate: 604800 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches all encounters for a Pokemon
 */
export async function getPokemonEncounters(
  pokemonId: number | string,
): Promise<PokeAPIPokemonEncounter[]> {
  try {
    const res = await fetch(`${POKEAPI_BASE}/pokemon/${pokemonId}/encounters`, {
      next: { revalidate: 604800 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export interface FormattedPokemonEncounter {
  locationAreaName: string;
  locationAreaId: number;
  locationName: string;
  locationId: number;
  versions: {
    name: string;
    maxChance: number;
    details: {
      minLevel: number;
      maxLevel: number;
      method: string;
      chance: number;
      conditions: string[];
    }[];
  }[];
}

/**
 * Fetches and formats all encounters for a Pokemon
 */
export async function getFormattedPokemonEncounters(
  pokemonId: number | string,
): Promise<FormattedPokemonEncounter[]> {
  const encounters = await getPokemonEncounters(pokemonId);

  return encounters.map((enc) => {
    const areaId = extractIdFromUrl(enc.location_area.url);
    // Extract location id from area name (format: "location-name-area-name")
    // or we'll fetch it later
    const locationId = 0;

    return {
      locationAreaName: formatLocationName(enc.location_area.name),
      locationAreaId: areaId,
      locationName: formatLocationName(
        enc.location_area.name.replace(/-area.*$/, ""),
      ),
      locationId,
      versions: enc.version_details.map((vd) => ({
        name: vd.version.name,
        maxChance: vd.max_chance,
        details: vd.encounter_details.map((ed) => ({
          minLevel: ed.min_level,
          maxLevel: ed.max_level,
          method: formatMethodName(ed.method.name),
          chance: ed.chance,
          conditions: ed.condition_values.map((c) =>
            formatConditionName(c.name),
          ),
        })),
      })),
    };
  });
}

// Helper functions

export function extractIdFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function formatLocationName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatMethodName(method: string): string {
  const methodMap: Record<string, string> = {
    walk: "Walking",
    "old-rod": "Old Rod",
    "good-rod": "Good Rod",
    "super-rod": "Super Rod",
    surf: "Surfing",
    "rock-smash": "Rock Smash",
    headbutt: "Headbutt",
    "dark-grass": "Dark Grass",
    "grass-spots": "Shaking Grass",
    "cave-spots": "Dust Clouds",
    "bridge-spots": "Bridge Shadows",
    "super-rod-spots": "Fishing Spots",
    "surf-spots": "Surfing Spots",
    "yellow-flowers": "Yellow Flowers",
    "purple-flowers": "Purple Flowers",
    "red-flowers": "Red Flowers",
    "rough-terrain": "Rough Terrain",
    gift: "Gift",
    "gift-egg": "Gift Egg",
    "only-one": "Only One",
    pokeflute: "Poke Flute",
    "squirt-bottle": "Squirt Bottle",
    "wailmer-pail": "Wailmer Pail",
    seaweed: "Seaweed",
  };
  return methodMap[method] ?? formatLocationName(method);
}

export function formatConditionName(condition: string): string {
  const conditionMap: Record<string, string> = {
    "time-morning": "Morning",
    "time-day": "Day",
    "time-night": "Night",
    "radar-on": "Poke Radar",
    "radar-off": "No Radar",
    "swarm-yes": "Swarm",
    "swarm-no": "No Swarm",
    "slot2-none": "No GBA Game",
    "slot2-ruby": "Ruby in Slot 2",
    "slot2-sapphire": "Sapphire in Slot 2",
    "slot2-emerald": "Emerald in Slot 2",
    "slot2-firered": "FireRed in Slot 2",
    "slot2-leafgreen": "LeafGreen in Slot 2",
    "radio-off": "Radio Off",
    "radio-hoenn": "Hoenn Sound",
    "radio-sinnoh": "Sinnoh Sound",
    "season-spring": "Spring",
    "season-summer": "Summer",
    "season-autumn": "Autumn",
    "season-winter": "Winter",
  };
  return conditionMap[condition] ?? formatLocationName(condition);
}
