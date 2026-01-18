import { Sprites } from "@pkmn/img"
import { toID } from "./pkmn"

export type SpriteGen = "gen5" | "ani"

export function pokemonSprite(
  name: string,
  options?: {
    gen?: SpriteGen
    shiny?: boolean
    female?: boolean
    side?: "front" | "back"
  }
) {
  const sprite = Sprites.getPokemon(name, {
    gen: options?.gen ?? "gen5",
    shiny: options?.shiny,
    gender: options?.female ? "F" : "M",
    side: options?.side === "back" ? "p1" : "p2",
  })
  return sprite.url
}

export function pokemonSpriteById(
  id: number,
  options?: {
    shiny?: boolean
  }
) {
  // Use PokeAPI sprites for ID-based lookups as a fallback
  if (options?.shiny) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function itemSprite(name: string) {
  // Use Pokemon Showdown item sprites
  return `https://play.pokemonshowdown.com/sprites/itemicons/${toID(name)}.png`
}

export function typeIcon(type: string) {
  // Use Pokemon Showdown type icons
  return `https://play.pokemonshowdown.com/sprites/types/${type}.png`
}
