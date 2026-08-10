import { type GraphicsGen, Sprites } from "@pkmn/img";
import { toID } from "./pkmn";

/**
 * Every sprite set the app can render. Ids are stable — they are persisted in
 * localStorage preferences, so renaming one breaks existing users' settings.
 */
export type SpriteSetId =
  // Gen 1
  | "gen1rg"
  | "gen1rb"
  | "gen1"
  // Gen 2
  | "gen2g"
  | "gen2s"
  | "gen2"
  // Gen 3
  | "gen3rs"
  | "gen3frlg"
  | "gen3"
  // Gen 4
  | "gen4dp"
  | "gen4"
  | "platinum"
  // Gen 5
  | "gen5"
  | "gen5ani"
  // Gen 6
  | "ani"
  | "xy"
  // Gen 7
  | "dex"
  // Gen 8
  | "sword-shield"
  // Gen 9
  | "scarlet-violet"
  // Renders / artwork
  | "home"
  | "artwork";

/** Legacy alias — the preference used to only allow these three. */
export type SpriteGen = SpriteSetId;

type SpriteSource = "showdown" | "pokemondb" | "pokemondb-artwork";

export type SpriteSetDefinition = {
  id: SpriteSetId;
  label: string;
  /** Heading used to group the set in pickers. */
  group: string;
  /** Generation the graphics come from — used to order and filter sets. */
  gen: number;
  source: SpriteSource;
  /** Showdown graphics key (`source: "showdown"`). */
  showdownGen?: GraphicsGen;
  /** PokemonDB sprite directory (`source: "pokemondb"`). */
  pokemonDbDir?: string;
  animated?: boolean;
  shiny: boolean;
  back: boolean;
  female: boolean;
};

export const SPRITE_SETS: SpriteSetDefinition[] = [
  // Gen 1 — no shiny sprites existed yet.
  {
    id: "gen1rg",
    label: "Red / Green (JP)",
    group: "Gen 1",
    gen: 1,
    source: "showdown",
    showdownGen: "gen1rg",
    shiny: false,
    back: true,
    female: false,
  },
  {
    id: "gen1rb",
    label: "Red / Blue",
    group: "Gen 1",
    gen: 1,
    source: "showdown",
    showdownGen: "gen1rb",
    shiny: false,
    back: true,
    female: false,
  },
  {
    id: "gen1",
    label: "Yellow",
    group: "Gen 1",
    gen: 1,
    source: "showdown",
    showdownGen: "gen1",
    shiny: false,
    back: true,
    female: false,
  },
  // Gen 2
  {
    id: "gen2g",
    label: "Gold",
    group: "Gen 2",
    gen: 2,
    source: "showdown",
    showdownGen: "gen2g",
    shiny: false,
    back: true,
    female: false,
  },
  {
    id: "gen2s",
    label: "Silver",
    group: "Gen 2",
    gen: 2,
    source: "showdown",
    showdownGen: "gen2s",
    shiny: false,
    back: true,
    female: false,
  },
  {
    id: "gen2",
    label: "Crystal",
    group: "Gen 2",
    gen: 2,
    source: "showdown",
    showdownGen: "gen2",
    shiny: true,
    back: true,
    female: false,
  },
  // Gen 3
  {
    id: "gen3rs",
    label: "Ruby / Sapphire",
    group: "Gen 3",
    gen: 3,
    source: "showdown",
    showdownGen: "gen3rs",
    shiny: true,
    back: true,
    female: false,
  },
  {
    id: "gen3frlg",
    label: "FireRed / LeafGreen",
    group: "Gen 3",
    gen: 3,
    source: "showdown",
    showdownGen: "gen3frlg",
    shiny: true,
    back: true,
    female: false,
  },
  {
    id: "gen3",
    label: "Emerald",
    group: "Gen 3",
    gen: 3,
    source: "showdown",
    showdownGen: "gen3",
    shiny: true,
    back: true,
    female: false,
  },
  // Gen 4
  {
    id: "gen4dp",
    label: "Diamond / Pearl",
    group: "Gen 4",
    gen: 4,
    source: "showdown",
    showdownGen: "gen4dp",
    shiny: true,
    back: true,
    female: true,
  },
  {
    id: "platinum",
    label: "Platinum",
    group: "Gen 4",
    gen: 4,
    source: "pokemondb",
    pokemonDbDir: "platinum",
    shiny: true,
    back: true,
    female: false,
  },
  {
    id: "gen4",
    label: "HeartGold / SoulSilver",
    group: "Gen 4",
    gen: 4,
    source: "showdown",
    showdownGen: "gen4",
    shiny: true,
    back: true,
    female: true,
  },
  // Gen 5
  {
    id: "gen5",
    label: "Black / White (static)",
    group: "Gen 5",
    gen: 5,
    source: "showdown",
    showdownGen: "gen5",
    shiny: true,
    back: true,
    female: true,
  },
  {
    id: "gen5ani",
    label: "Black / White (animated)",
    group: "Gen 5",
    gen: 5,
    source: "showdown",
    showdownGen: "gen5ani",
    animated: true,
    shiny: true,
    back: true,
    female: true,
  },
  // Gen 6
  {
    id: "ani",
    label: "X / Y (animated)",
    group: "Gen 6",
    gen: 6,
    source: "showdown",
    showdownGen: "ani",
    animated: true,
    shiny: true,
    back: true,
    female: true,
  },
  {
    id: "xy",
    label: "X / Y (static)",
    group: "Gen 6",
    gen: 6,
    source: "pokemondb",
    pokemonDbDir: "x-y",
    shiny: true,
    back: false,
    female: false,
  },
  // Gen 7
  {
    id: "dex",
    label: "Sun / Moon (dex art)",
    group: "Gen 7",
    gen: 7,
    source: "showdown",
    shiny: true,
    back: false,
    female: false,
  },
  // Gen 8
  {
    id: "sword-shield",
    label: "Sword / Shield",
    group: "Gen 8",
    gen: 8,
    source: "pokemondb",
    pokemonDbDir: "sword-shield",
    shiny: false,
    back: false,
    female: false,
  },
  // Gen 9
  {
    id: "scarlet-violet",
    label: "Scarlet / Violet",
    group: "Gen 9",
    gen: 9,
    source: "pokemondb",
    pokemonDbDir: "scarlet-violet",
    shiny: false,
    back: false,
    female: false,
  },
  // Renders
  {
    id: "home",
    label: "Pokemon HOME",
    group: "Renders",
    gen: 9,
    source: "pokemondb",
    pokemonDbDir: "home",
    shiny: true,
    back: false,
    female: false,
  },
  {
    id: "artwork",
    label: "Official artwork",
    group: "Renders",
    gen: 9,
    source: "pokemondb-artwork",
    shiny: false,
    back: false,
    female: false,
  },
];

const SPRITE_SETS_BY_ID = new Map(SPRITE_SETS.map((set) => [set.id, set]));

/** Default for the user preference. */
export const DEFAULT_SPRITE_SET: SpriteSetId = "ani";

/** Used when a caller asks for a sprite without naming a set — best form coverage. */
const UNSPECIFIED_SPRITE_SET: SpriteSetId = "home";

export function isSpriteSetId(value: unknown): value is SpriteSetId {
  return (
    typeof value === "string" && SPRITE_SETS_BY_ID.has(value as SpriteSetId)
  );
}

export function getSpriteSet(id: SpriteSetId | undefined): SpriteSetDefinition {
  return (
    (id && SPRITE_SETS_BY_ID.get(id)) ??
    (SPRITE_SETS_BY_ID.get(UNSPECIFIED_SPRITE_SET) as SpriteSetDefinition)
  );
}

/** Sets in picker order, grouped by the generation their graphics come from. */
export function getSpriteSetGroups(): {
  group: string;
  sets: SpriteSetDefinition[];
}[] {
  const groups: { group: string; sets: SpriteSetDefinition[] }[] = [];
  for (const set of SPRITE_SETS) {
    const existing = groups.find((g) => g.group === set.group);
    if (existing) existing.sets.push(set);
    else groups.push({ group: set.group, sets: [set] });
  }
  return groups;
}

const REGION_ADJECTIVES: Record<string, string> = {
  alola: "alolan",
  galar: "galarian",
  hisui: "hisuian",
  paldea: "paldean",
};

/**
 * Convert a @pkmn/dex species name to a PokemonDB-compatible slug.
 * Handles regional form suffixes (Alola→Alolan, Galar→Galarian, etc.).
 */
export function pokemonDbSlug(name: string): string {
  let slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
  for (const [region, adjective] of Object.entries(REGION_ADJECTIVES)) {
    slug = slug.replace(new RegExp(`-${region}($|-)`), `-${adjective}$1`);
  }
  return slug;
}

type SpriteOptions = {
  /** Sprite set to render. Legacy callers pass the old `gen` values. */
  set?: SpriteSetId;
  gen?: SpriteSetId;
  shiny?: boolean;
  female?: boolean;
  side?: "front" | "back";
};

function pokemonDbUrl(
  set: SpriteSetDefinition,
  slug: string,
  options: SpriteOptions,
): string {
  const back = options.side === "back" && set.back;
  const shiny = Boolean(options.shiny) && set.shiny;
  const variant = `${back ? "back-" : ""}${shiny ? "shiny" : "normal"}`;
  return `https://img.pokemondb.net/sprites/${set.pokemonDbDir}/${variant}/${slug}.png`;
}

function showdownUrl(
  set: SpriteSetDefinition,
  name: string,
  options: SpriteOptions,
): string {
  // The `dex` graphics are static, genderless front sprites only.
  if (set.id === "dex") {
    return Sprites.getDexPokemon(name, {
      gen: "dex",
      shiny: options.shiny,
    }).url;
  }

  return Sprites.getPokemon(name, {
    gen: set.showdownGen,
    shiny: options.shiny && set.shiny,
    gender: options.female && set.female ? "F" : "M",
    side: options.side === "back" && set.back ? "p1" : "p2",
  }).url;
}

/**
 * Get a Pokemon sprite URL for a given sprite set.
 * Unavailable variants (shiny/back/female) silently fall back to the plain
 * front sprite of the same set, and a missing sprite is handled downstream by
 * `PokemonImage`'s fallback chain.
 */
export function pokemonSprite(name: string, options?: SpriteOptions): string {
  const set = getSpriteSet(options?.set ?? options?.gen);
  const resolved: SpriteOptions = options ?? {};

  if (set.source === "pokemondb-artwork") {
    return `https://img.pokemondb.net/artwork/large/${pokemonDbSlug(name)}.jpg`;
  }

  if (set.source === "pokemondb") {
    return pokemonDbUrl(set, pokemonDbSlug(name), resolved);
  }

  return showdownUrl(set, name, resolved);
}

export function pokemonSpriteById(
  id: number,
  options?: {
    shiny?: boolean;
  },
) {
  // Use PokeAPI sprites for ID-based lookups as a fallback
  if (options?.shiny) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/**
 * Ordered list of sprite URLs to try when the preferred sprite 404s.
 * Ordered from best form coverage to guaranteed-to-exist.
 */
export function spriteFallbackUrls(name: string, id: number): string[] {
  const slug = pokemonDbSlug(name);

  return [
    `https://img.pokemondb.net/sprites/home/normal/${slug}.png`,
    `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`,
    `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    pokemonSpriteById(id),
  ];
}

export function itemSprite(name: string) {
  // Use Pokemon Showdown item sprites
  return `https://play.pokemonshowdown.com/sprites/itemicons/${toID(name)}.png`;
}

export function typeIcon(type: string) {
  // Use Pokemon Showdown type icons
  return `https://play.pokemonshowdown.com/sprites/types/${type}.png`;
}
