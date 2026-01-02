import type { PokemonType, ItemPocket } from "./pokemon"

export type SearchResultType = "pokemon" | "move" | "ability" | "type" | "item"

export interface SearchResultBase {
  id: string
  name: string
  type: SearchResultType
  url: string
}

export interface PokemonSearchResult extends SearchResultBase {
  type: "pokemon"
  pokemonId: number
  sprite: string
  types?: PokemonType[]
}

export interface MoveSearchResult extends SearchResultBase {
  type: "move"
  moveType?: PokemonType
  damageClass?: "physical" | "special" | "status"
}

export interface AbilitySearchResult extends SearchResultBase {
  type: "ability"
}

export interface TypeSearchResult extends SearchResultBase {
  type: "type"
  pokemonType: PokemonType
}

export interface ItemSearchResult extends SearchResultBase {
  type: "item"
  sprite?: string | null
  pocket?: ItemPocket
}

export type SearchResult =
  | PokemonSearchResult
  | MoveSearchResult
  | AbilitySearchResult
  | TypeSearchResult
  | ItemSearchResult

export interface SearchIndexState {
  isLoading: boolean
  isReady: boolean
  progress: {
    pokemon: boolean
    moves: boolean
    abilities: boolean
    types: boolean
    items: boolean
  }
  totalItems: number
}
