"use client"

import { useState, useMemo, useCallback } from "react"
import { Search, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TypeBadge } from "@/components/pokemon/type-badge"
import { ALL_TYPES, getAllPokemonNames, getAllMoveNames, getAllAbilityNames } from "@/lib/pokeapi"
import type { PokemonType } from "@/types/pokemon"

export type DexCategory = "pokemon" | "moves" | "abilities"

export interface DexFilterState {
  search: string
  types: PokemonType[]
  category: DexCategory
}

interface DexFilterProps {
  onFilterChange: (filter: DexFilterState) => void
  filter: DexFilterState
}

const CATEGORY_LABELS: Record<DexCategory, string> = {
  pokemon: "Pokémon",
  moves: "Moves",
  abilities: "Abilities",
}

const CATEGORY_PLACEHOLDERS: Record<DexCategory, string> = {
  pokemon: "Search Pokémon...",
  moves: "Search Moves...",
  abilities: "Search Abilities...",
}

export function DexFilter({ onFilterChange, filter }: DexFilterProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filter, search: value })
    },
    [filter, onFilterChange]
  )

  const handleCategoryChange = useCallback(
    (category: DexCategory) => {
      onFilterChange({ ...filter, category, search: "", types: [] })
    },
    [filter, onFilterChange]
  )

  const handleTypeToggle = useCallback(
    (type: PokemonType) => {
      const newTypes = filter.types.includes(type)
        ? filter.types.filter((t) => t !== type)
        : [...filter.types, type]
      onFilterChange({ ...filter, types: newTypes })
    },
    [filter, onFilterChange]
  )

  const handleClearFilters = useCallback(() => {
    onFilterChange({ ...filter, search: "", types: [] })
  }, [filter, onFilterChange])

  const hasActiveFilters = filter.search.length > 0 || filter.types.length > 0

  return (
    <div className="space-y-3">
      {/* Category Tabs */}
      <Tabs value={filter.category} onValueChange={(v) => handleCategoryChange(v as DexCategory)}>
        <TabsList className="w-full">
          <TabsTrigger value="pokemon" className="flex-1">
            {CATEGORY_LABELS.pokemon}
          </TabsTrigger>
          <TabsTrigger value="moves" className="flex-1">
            {CATEGORY_LABELS.moves}
          </TabsTrigger>
          <TabsTrigger value="abilities" className="flex-1">
            {CATEGORY_LABELS.abilities}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={CATEGORY_PLACEHOLDERS[filter.category]}
          value={filter.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {filter.search && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type Filters - only show for Pokemon */}
      {filter.category === "pokemon" && (
        <div className="flex flex-wrap gap-1.5">
          {ALL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeToggle(type)}
              className={`transition-opacity ${
                filter.types.length > 0 && !filter.types.includes(type)
                  ? "opacity-40 hover:opacity-70"
                  : "opacity-100"
              }`}
            >
              <TypeBadge type={type} size="sm" />
            </button>
          ))}
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-7 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Clear filters
          </Button>
          {filter.types.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {filter.types.length} type{filter.types.length > 1 ? "s" : ""} selected
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Hook to get filtered Pokemon based on filter state
export function useFilteredPokemon(filter: DexFilterState) {
  const { data: allPokemon, isLoading } = useQuery({
    queryKey: ["all-pokemon-names"],
    queryFn: getAllPokemonNames,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })

  const hasActiveFilters = filter.search.length > 0 || filter.types.length > 0

  const filteredPokemon = useMemo(() => {
    if (!allPokemon || !hasActiveFilters) return null

    const searchLower = filter.search.toLowerCase()

    return allPokemon.filter((pokemon) => {
      // Filter by name
      if (searchLower && !pokemon.name.toLowerCase().includes(searchLower)) {
        return false
      }
      return true
    })
  }, [allPokemon, filter.search, hasActiveFilters])

  return {
    filteredPokemon,
    isLoading,
    hasActiveFilters,
    totalCount: allPokemon?.length ?? 0,
  }
}

// Hook to get filtered Moves based on filter state
export function useFilteredMoves(filter: DexFilterState) {
  const { data: allMoves, isLoading } = useQuery({
    queryKey: ["all-move-names"],
    queryFn: getAllMoveNames,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })

  const hasActiveFilters = filter.search.length > 0

  const filteredMoves = useMemo(() => {
    if (!allMoves) return allMoves

    if (!hasActiveFilters) return allMoves

    const searchLower = filter.search.toLowerCase()

    return allMoves.filter((move) => {
      if (searchLower && !move.name.toLowerCase().includes(searchLower)) {
        return false
      }
      return true
    })
  }, [allMoves, filter.search, hasActiveFilters])

  return {
    filteredMoves,
    isLoading,
    hasActiveFilters,
    totalCount: allMoves?.length ?? 0,
  }
}

// Hook to get filtered Abilities based on filter state
export function useFilteredAbilities(filter: DexFilterState) {
  const { data: allAbilities, isLoading } = useQuery({
    queryKey: ["all-ability-names"],
    queryFn: getAllAbilityNames,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })

  const hasActiveFilters = filter.search.length > 0

  const filteredAbilities = useMemo(() => {
    if (!allAbilities) return allAbilities

    if (!hasActiveFilters) return allAbilities

    const searchLower = filter.search.toLowerCase()

    return allAbilities.filter((ability) => {
      if (searchLower && !ability.name.toLowerCase().includes(searchLower)) {
        return false
      }
      return true
    })
  }, [allAbilities, filter.search, hasActiveFilters])

  return {
    filteredAbilities,
    isLoading,
    hasActiveFilters,
    totalCount: allAbilities?.length ?? 0,
  }
}
