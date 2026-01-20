/**
 * Script to fetch all Pokedex entries from PokeAPI and bundle as JSON
 * Run with: bun run scripts/fetch-pokedex-entries.ts
 */

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const MAX_POKEMON_ID = 1025;
const BATCH_SIZE = 50; // Fetch in batches to avoid rate limiting

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

interface GameEntry {
  version: string;
  flavorText: string;
}

interface PokedexEntry {
  id: number;
  name: string;
  genus: string;
  entries: GameEntry[];
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

async function fetchSpecies(id: number): Promise<PokedexEntry | null> {
  try {
    const res = await fetch(`${POKEAPI_BASE}/pokemon-species/${id}`);
    if (!res.ok) return null;

    const data: PokeAPISpecies = await res.json();

    // Get all English flavor text entries
    const englishEntries = data.flavor_text_entries.filter(
      (e) => e.language.name === "en",
    );

    // Build unique entries per version (some versions have duplicates)
    const entriesMap = new Map<string, string>();
    for (const entry of englishEntries) {
      const version = entry.version.name;
      const flavorText = entry.flavor_text
        .replace(/\f|\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Keep the first occurrence per version
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

async function fetchBatch(
  startId: number,
  endId: number,
): Promise<PokedexEntry[]> {
  const promises: Promise<PokedexEntry | null>[] = [];
  for (let id = startId; id <= endId; id++) {
    promises.push(fetchSpecies(id));
  }
  const results = await Promise.all(promises);
  return results.filter((r): r is PokedexEntry => r !== null);
}

async function main() {
  console.log(`Fetching Pokedex entries for Pokemon 1-${MAX_POKEMON_ID}...`);

  const allEntries: PokedexEntry[] = [];

  for (let start = 1; start <= MAX_POKEMON_ID; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, MAX_POKEMON_ID);
    console.log(`Fetching ${start}-${end}...`);

    const batch = await fetchBatch(start, end);
    allEntries.push(...batch);

    // Small delay between batches to be nice to the API
    if (end < MAX_POKEMON_ID) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Create a map keyed by ID for O(1) lookups
  const entriesMap: Record<number, PokedexEntry> = {};
  for (const entry of allEntries) {
    entriesMap[entry.id] = entry;
  }

  const outputPath = new URL(
    "../src/data/pokedex-entries.json",
    import.meta.url,
  );
  await Bun.write(outputPath, JSON.stringify(entriesMap, null, 2));

  console.log(`\nDone! Fetched ${allEntries.length} entries.`);
  console.log(`Saved to src/data/pokedex-entries.json`);
}

main();
