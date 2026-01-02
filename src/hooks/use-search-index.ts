"use client"

import { useQuery } from "@tanstack/react-query"
import Fuse, { type IFuseOptions } from "fuse.js"
import { useMemo } from "react"
import {
  getAllPokemonNames,
  getAllMoveNames,
  getAllAbilityNames,
  getAllItemNames,
  ALL_TYPES,
} from "@/lib/pokeapi"
import type {
  SearchResult,
  PokemonSearchResult,
  MoveSearchResult,
  AbilitySearchResult,
  TypeSearchResult,
  ItemSearchResult,
} from "@/types/search"
import type { PokemonType } from "@/types/pokemon"

// Fuse.js configuration for optimal fuzzy matching
const FUSE_OPTIONS: IFuseOptions<SearchResult> = {
  keys: [
    { name: "name", weight: 1 },
  ],
  threshold: 0.3, // Lower = stricter matching
  distance: 100,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 1,
}

export function useSearchIndex() {
  // Fetch all data in parallel
  const pokemonQuery = useQuery({
    queryKey: ["search-index-pokemon"],
    queryFn: getAllPokemonNames,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })

  const movesQuery = useQuery({
    queryKey: ["search-index-moves"],
    queryFn: getAllMoveNames,
    staleTime: 1000 * 60 * 60 * 24,
  })

  const abilitiesQuery = useQuery({
    queryKey: ["search-index-abilities"],
    queryFn: getAllAbilityNames,
    staleTime: 1000 * 60 * 60 * 24,
  })

  const itemsQuery = useQuery({
    queryKey: ["search-index-items"],
    queryFn: getAllItemNames,
    staleTime: 1000 * 60 * 60 * 24,
  })

  // Build the search index
  const { index, allItems } = useMemo(() => {
    const items: SearchResult[] = []

    // Add Pokemon
    if (pokemonQuery.data) {
      for (const p of pokemonQuery.data) {
        items.push({
          id: `pokemon-${p.id}`,
          name: p.name,
          type: "pokemon",
          url: `/pokemon/${p.id}`,
          pokemonId: p.id,
          sprite: p.sprite,
        } as PokemonSearchResult)
      }
    }

    // Add Moves
    if (movesQuery.data) {
      for (const m of movesQuery.data) {
        items.push({
          id: `move-${m.id}`,
          name: m.name,
          type: "move",
          url: `/moves/${m.name.toLowerCase().replace(/\s+/g, "-")}`,
        } as MoveSearchResult)
      }
    }

    // Add Abilities
    if (abilitiesQuery.data) {
      for (const a of abilitiesQuery.data) {
        items.push({
          id: `ability-${a.id}`,
          name: a.name,
          type: "ability",
          url: `/abilities/${a.name.toLowerCase().replace(/\s+/g, "-")}`,
        } as AbilitySearchResult)
      }
    }

    // Add Types (static list)
    for (const t of ALL_TYPES) {
      const formatted = t.charAt(0).toUpperCase() + t.slice(1)
      items.push({
        id: `type-${t}`,
        name: formatted,
        type: "type",
        url: `/types/${t}`,
        pokemonType: t as PokemonType,
      } as TypeSearchResult)
    }

    // Add Items
    if (itemsQuery.data) {
      for (const i of itemsQuery.data) {
        items.push({
          id: `item-${i.id}`,
          name: i.name,
          type: "item",
          url: `/items/${i.name.toLowerCase().replace(/\s+/g, "-")}`,
          sprite: i.sprite,
        } as ItemSearchResult)
      }
    }

    return {
      index: new Fuse(items, FUSE_OPTIONS),
      allItems: items,
    }
  }, [pokemonQuery.data, movesQuery.data, abilitiesQuery.data, itemsQuery.data])

  const isLoading =
    pokemonQuery.isLoading ||
    movesQuery.isLoading ||
    abilitiesQuery.isLoading ||
    itemsQuery.isLoading

  const isReady =
    pokemonQuery.isSuccess &&
    movesQuery.isSuccess &&
    abilitiesQuery.isSuccess &&
    itemsQuery.isSuccess

  const search = (query: string, limit = 20): SearchResult[] => {
    if (!query.trim()) {
      // Return recent/popular items when no query
      return allItems.slice(0, limit)
    }

    const results = index.search(query, { limit })
    return results.map((r) => r.item)
  }

  return {
    search,
    isLoading,
    isReady,
    progress: {
      pokemon: pokemonQuery.isSuccess,
      moves: movesQuery.isSuccess,
      abilities: abilitiesQuery.isSuccess,
      types: true, // Always ready (static)
      items: itemsQuery.isSuccess,
    },
    totalItems: allItems.length,
  }
}
