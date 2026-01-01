"use client"

import { useQuery, useInfiniteQuery } from "@tanstack/react-query"
import {
  getPokemon,
  getPokemonList,
  getPokemonSpecies,
  getPokemonIdFromUrl,
  getPokemonMoves,
  getEvolutionChain,
  getMoveList,
  getMoveListItem,
  getFullMoveDetail,
  getFullAbilityDetail,
  getAllTypesWithRelations,
  getFullTypeDetail,
} from "@/lib/pokeapi"
import type {
  Pokemon,
  PokemonSpecies,
  PokemonMove,
  EvolutionChainLink,
  MoveListItem,
  FullMoveDetail,
  FullAbilityDetail,
  TypeDetail,
  FullTypeDetail,
} from "@/types/pokemon"

const PAGE_SIZE = 20

export function usePokemonList() {
  return useInfiniteQuery({
    queryKey: ["pokemon-list"],
    queryFn: ({ pageParam = 0 }) => getPokemonList(pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      const url = new URL(lastPage.next)
      const offset = url.searchParams.get("offset")
      return offset ? Number.parseInt(offset, 10) : undefined
    },
    initialPageParam: 0,
  })
}

export function usePokemon(nameOrId: string | number | null) {
  return useQuery<Pokemon>({
    queryKey: ["pokemon", nameOrId],
    queryFn: () => getPokemon(nameOrId!),
    enabled: nameOrId !== null,
  })
}

export function usePokemonSpecies(nameOrId: string | number | null) {
  return useQuery<PokemonSpecies>({
    queryKey: ["pokemon-species", nameOrId],
    queryFn: () => getPokemonSpecies(nameOrId!),
    enabled: nameOrId !== null,
  })
}

export function usePokemonWithSpecies(nameOrId: string | number | null) {
  const pokemon = usePokemon(nameOrId)
  const species = usePokemonSpecies(nameOrId)

  return {
    pokemon: pokemon.data,
    species: species.data,
    isLoading: pokemon.isLoading || species.isLoading,
    error: pokemon.error || species.error,
  }
}

export function usePokemonMoves(nameOrId: string | number | null) {
  return useQuery<PokemonMove[]>({
    queryKey: ["pokemon-moves", nameOrId],
    queryFn: () => getPokemonMoves(nameOrId!),
    enabled: nameOrId !== null,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useEvolutionChain(evolutionChainUrl: string | null) {
  return useQuery<EvolutionChainLink>({
    queryKey: ["evolution-chain", evolutionChainUrl],
    queryFn: () => getEvolutionChain(evolutionChainUrl!),
    enabled: evolutionChainUrl !== null,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

// ============================================================================
// Move List & Detail (for dedicated pages)
// ============================================================================

const MOVES_PAGE_SIZE = 50

export function useMoveList() {
  return useInfiniteQuery({
    queryKey: ["move-list"],
    queryFn: async ({ pageParam = 0 }) => {
      const listResponse = await getMoveList(pageParam, MOVES_PAGE_SIZE)

      // Fetch details for each move in this page
      const movePromises = listResponse.results.map((m) => getMoveListItem(m.name))
      const moves = await Promise.all(movePromises)

      return {
        count: listResponse.count,
        next: listResponse.next,
        moves: moves.filter((m): m is MoveListItem => m !== null),
      }
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      const url = new URL(lastPage.next)
      const offset = url.searchParams.get("offset")
      return offset ? Number.parseInt(offset, 10) : undefined
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 60, // 1 hour - moves don't change often
  })
}

export function useFullMoveDetail(name: string | null) {
  return useQuery<FullMoveDetail>({
    queryKey: ["move-detail", name],
    queryFn: () => getFullMoveDetail(name!),
    enabled: name !== null,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export function useFullAbilityDetail(name: string | null) {
  return useQuery<FullAbilityDetail>({
    queryKey: ["ability-detail", name],
    queryFn: () => getFullAbilityDetail(name!),
    enabled: name !== null,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

// ============================================================================
// Type Detail (for dedicated pages)
// ============================================================================

export function useAllTypes() {
  return useQuery<TypeDetail[]>({
    queryKey: ["all-types"],
    queryFn: () => getAllTypesWithRelations(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - types don't change
  })
}

export function useFullTypeDetail(name: string | null) {
  return useQuery<FullTypeDetail>({
    queryKey: ["type-detail", name],
    queryFn: () => getFullTypeDetail(name!),
    enabled: name !== null,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

export { getPokemonIdFromUrl }
