"use client";

import Fuse, { type IFuseOptions } from "fuse.js";
import { useMemo } from "react";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { getDexPokemonList } from "@/lib/dex-pokemon";
import {
  getAllAbilities,
  getAllItems,
  getAllMoves,
  getAllTypes,
  LATEST_GEN,
  toID,
} from "@/lib/pkmn";
import { pokemonSprite, pokemonSpriteById } from "@/lib/sprites";
import type { PokemonType } from "@/types/pokemon";
import type {
  AbilitySearchResult,
  ItemSearchResult,
  MoveSearchResult,
  PokemonSearchResult,
  SearchResult,
  TypeSearchResult,
} from "@/types/search";

const FUSE_OPTIONS: IFuseOptions<SearchResult> = {
  // Abilities are weighted low so a Pokemon's own name always wins, but
  // searching an ability ("blaze") still surfaces the Pokemon that have it.
  keys: [
    { name: "name", weight: 1 },
    { name: "abilities", weight: 0.2 },
  ],
  threshold: 0.3,
  distance: 100,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 1,
};

export function useSearchIndex() {
  const { preferredGeneration } = useGenerationPreference();
  const { speciesCutoffGeneration } = useSpritePreferences();

  const { index, allItems } = useMemo(() => {
    const items: SearchResult[] = [];
    // Search only offers what the selected generation's games had.
    const gen = preferredGeneration ?? LATEST_GEN;

    // Add Pokemon
    for (const p of getDexPokemonList(preferredGeneration, {
      forms: "distinct-sprites",
      speciesCutoffGeneration,
    })) {
      items.push({
        id: `pokemon-${p.slug}`,
        name: p.name,
        type: "pokemon",
        url: `/pokemon/${p.slug}`,
        pokemonId: p.id,
        sprite: pokemonSprite(p.name) || pokemonSpriteById(p.id),
        abilities: p.abilities,
      } as PokemonSearchResult);
    }

    // Add Moves
    for (const m of getAllMoves(gen)) {
      items.push({
        id: `move-${toID(m.name)}`,
        name: m.name,
        type: "move",
        url: `/moves/${toID(m.name)}`,
      } as MoveSearchResult);
    }

    // Add Abilities
    for (const a of getAllAbilities(gen)) {
      items.push({
        id: `ability-${toID(a.name)}`,
        name: a.name,
        type: "ability",
        url: `/abilities/${toID(a.name)}`,
      } as AbilitySearchResult);
    }

    // Add Types
    for (const { name: t } of getAllTypes(gen)) {
      items.push({
        id: `type-${t.toLowerCase()}`,
        name: t,
        type: "type",
        url: `/types/${t.toLowerCase()}`,
        pokemonType: t as PokemonType,
      } as TypeSearchResult);
    }

    // Add Items
    for (const i of getAllItems(gen)) {
      items.push({
        id: `item-${toID(i.name)}`,
        name: i.name,
        type: "item",
        url: `/items/${toID(i.name)}`,
        sprite: `https://play.pokemonshowdown.com/sprites/itemicons/${toID(i.name)}.png`,
      } as ItemSearchResult);
    }

    return {
      index: new Fuse(items, FUSE_OPTIONS),
      allItems: items,
    };
  }, [preferredGeneration, speciesCutoffGeneration]);

  const search = (query: string, limit = 20): SearchResult[] => {
    if (!query.trim()) {
      return allItems.slice(0, limit);
    }

    const results = index.search(query, { limit });
    return results.map((r) => r.item);
  };

  return {
    search,
    isLoading: false,
    isReady: true,
    progress: {
      pokemon: true,
      moves: true,
      abilities: true,
      types: true,
      items: true,
    },
    totalItems: allItems.length,
  };
}
