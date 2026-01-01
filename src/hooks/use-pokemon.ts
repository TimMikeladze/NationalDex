"use client"

import { useQuery, useInfiniteQuery } from "@tanstack/react-query"
import {
  getPokemon,
  getPokemonList,
  getPokemonSpecies,
  getPokemonIdFromUrl,
  getPokemonMoves,
  getEvolutionChain,
} from "@/lib/pokeapi"
import type { Pokemon, PokemonSpecies, PokemonMove, EvolutionChainLink } from "@/types/pokemon"

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

export { getPokemonIdFromUrl }
