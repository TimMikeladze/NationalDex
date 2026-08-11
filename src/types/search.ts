import type { ItemPocket, PokemonType } from "./pokemon";

export type SearchResultType =
  | "pokemon"
  | "move"
  | "ability"
  | "type"
  | "item"
  | "card";

export interface SearchResultBase {
  id: string;
  name: string;
  type: SearchResultType;
  url: string;
}

export interface PokemonSearchResult extends SearchResultBase {
  type: "pokemon";
  pokemonId: number;
  sprite: string;
  types?: PokemonType[];
  /** Ability names, indexed so ability queries match the Pokemon */
  abilities?: string[];
}

export interface MoveSearchResult extends SearchResultBase {
  type: "move";
  moveType?: PokemonType;
  damageClass?: "physical" | "special" | "status";
}

export interface AbilitySearchResult extends SearchResultBase {
  type: "ability";
}

export interface TypeSearchResult extends SearchResultBase {
  type: "type";
  pokemonType: PokemonType;
}

export interface ItemSearchResult extends SearchResultBase {
  type: "item";
  sprite?: string | null;
  pocket?: ItemPocket;
}

/** A trading card. Matches come from the card API rather than the local index. */
export interface CardSearchResult extends SearchResultBase {
  type: "card";
  /** Rendered image URL, or null when the card has no scan. */
  sprite?: string | null;
  /** Card number within its set. */
  localId?: string;
}

export type SearchResult =
  | PokemonSearchResult
  | MoveSearchResult
  | AbilitySearchResult
  | TypeSearchResult
  | ItemSearchResult
  | CardSearchResult;

export interface SearchIndexState {
  isLoading: boolean;
  isReady: boolean;
  progress: {
    pokemon: boolean;
    moves: boolean;
    abilities: boolean;
    types: boolean;
    items: boolean;
    cards: boolean;
  };
  totalItems: number;
}
