import { Dex } from "@pkmn/dex";
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
  | "gen2ani"
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

type SpriteSource = "showdown" | "pokemondb" | "pokemondb-artwork" | "pokeapi";

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
  /** PokeAPI sprite directory below `sprites/pokemon` (`source: "pokeapi"`). */
  pokeApiDir?: string;
  /** File extension PokeAPI stores the set as (`source: "pokeapi"`). */
  pokeApiExtension?: "png" | "gif";
  /** Highest dex number the directory holds (`source: "pokeapi"`). */
  pokeApiMaxDexNumber?: number;
  /**
   * Name-keyed set to draw species a dex-number-keyed source cannot address —
   * alternate formes have no dex number of their own, and species past the
   * directory's last entry are simply absent (`source: "pokeapi"`).
   */
  staticFallbackSet?: SpriteSetId;
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
    label: "Crystal (static)",
    group: "Gen 2",
    gen: 2,
    source: "showdown",
    showdownGen: "gen2",
    shiny: true,
    back: true,
    female: false,
  },
  {
    // Crystal was the first game to animate battle sprites. Showdown only ships
    // the still frames, so the animations come from PokeAPI instead — front
    // only, since Crystal never animated the back sprite.
    id: "gen2ani",
    label: "Crystal (animated)",
    group: "Gen 2",
    gen: 2,
    source: "pokeapi",
    pokeApiDir: "versions/generation-ii/crystal/animated",
    pokeApiExtension: "gif",
    pokeApiMaxDexNumber: 251,
    staticFallbackSet: "gen2",
    animated: true,
    shiny: true,
    back: false,
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

/**
 * The set whose graphics belong to each generation's headline games, so the
 * sprites can follow the generation the dex is being viewed as. Several sets
 * share a generation — this picks the one the generation is named after
 * (Gen III is "Ruby/Sapphire" in the picker, so it gets the RS sheet), except
 * in Gen II where Crystal is the only Gold/Silver-era sheet with shinies, and
 * where the animated sheet is preferred for the same reason Gen V gets
 * `gen5ani`: the games animated their sprites, so the dex should too.
 */
const SPRITE_SET_BY_GENERATION: Record<number, SpriteSetId> = {
  1: "gen1rb",
  2: "gen2ani",
  3: "gen3rs",
  4: "gen4dp",
  5: "gen5ani",
  6: "ani",
  7: "dex",
  8: "sword-shield",
  9: "scarlet-violet",
};

/** Sprite set matching a viewed generation; the default for the National Dex. */
export function spriteSetForGeneration(
  generation: number | null | undefined,
): SpriteSetId {
  if (generation == null) return DEFAULT_SPRITE_SET;
  return SPRITE_SET_BY_GENERATION[generation] ?? DEFAULT_SPRITE_SET;
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

const POKEAPI_SPRITES_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/**
 * National Dex number to draw a species with, or null when the name is not a
 * plain base form. PokeAPI keys its sprite directories by dex number, which no
 * alternate forme has of its own — without this guard Charizard-Mega-X would
 * quietly render as plain Charizard.
 */
function baseSpeciesNumber(
  name: string,
  set: SpriteSetDefinition,
): number | null {
  const species = Dex.species.get(name);
  if (!species?.exists || species.forme || species.num <= 0) return null;
  const max = set.pokeApiMaxDexNumber;
  if (max !== undefined && species.num > max) return null;
  return species.num;
}

function pokeApiUrl(
  set: SpriteSetDefinition,
  num: number,
  options: SpriteOptions,
): string {
  const shiny = Boolean(options.shiny) && set.shiny;
  const dir = `${set.pokeApiDir}${shiny ? "/shiny" : ""}`;
  return `${POKEAPI_SPRITES_BASE}/${dir}/${num}.${set.pokeApiExtension ?? "png"}`;
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

  if (set.source === "pokeapi") {
    const num = baseSpeciesNumber(name, set);
    if (num !== null) return pokeApiUrl(set, num, resolved);
    // Formes and later-generation species fall back to the name-keyed still
    // sheet, so they degrade exactly as they do on the set's static twin.
    return pokemonSprite(name, {
      ...resolved,
      gen: undefined,
      set: set.staticFallbackSet,
    });
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
