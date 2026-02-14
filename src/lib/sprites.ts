import { Sprites } from "@pkmn/img";
import { toID } from "./pkmn";

export type SpriteGen = "gen5" | "ani" | "home";

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
    slug = slug.replace(
      new RegExp(`-${region}($|-)`),
      `-${adjective}$1`,
    );
  }
  return slug;
}

/**
 * Get the primary Pokemon sprite URL.
 * Uses PokemonDB Home sprites by default which have excellent form coverage.
 * Falls back to Pokemon Showdown for female/back sprites.
 */
export function pokemonSprite(
  name: string,
  options?: {
    gen?: SpriteGen;
    shiny?: boolean;
    female?: boolean;
    side?: "front" | "back";
  },
) {
  const slug = pokemonDbSlug(name);

  // For female or back sprites, use Pokemon Showdown (PokemonDB doesn't have these)
  if (options?.female || options?.side === "back") {
    const sprite = Sprites.getPokemon(name, {
      gen: options?.gen === "home" ? "ani" : (options?.gen ?? "ani"),
      shiny: options?.shiny,
      gender: options?.female ? "F" : "M",
      side: options?.side === "back" ? "p1" : "p2",
    });
    return sprite.url;
  }

  if (options?.gen === "ani") {
    const shinyPrefix = options?.shiny ? "-shiny" : "";
    return `https://play.pokemonshowdown.com/sprites/ani${shinyPrefix}/${slug}.gif`;
  }

  if (options?.gen === "gen5") {
    const shinyPrefix = options?.shiny ? "-shiny" : "";
    return `https://play.pokemonshowdown.com/sprites/gen5${shinyPrefix}/${slug}.png`;
  }

  // Default: PokemonDB Home sprites (best form coverage)
  const shinyPath = options?.shiny ? "shiny" : "normal";
  return `https://img.pokemondb.net/sprites/home/${shinyPath}/${slug}.png`;
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

export function itemSprite(name: string) {
  // Use Pokemon Showdown item sprites
  return `https://play.pokemonshowdown.com/sprites/itemicons/${toID(name)}.png`;
}

export function typeIcon(type: string) {
  // Use Pokemon Showdown type icons
  return `https://play.pokemonshowdown.com/sprites/types/${type}.png`;
}
