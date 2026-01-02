"use client"

import { useState, useMemo, useCallback } from "react"
import { Search, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TypeBadge } from "@/components/pokemon/type-badge"
import { ALL_TYPES, getAllPokemonNames } from "@/lib/pokeapi"
import type { PokemonType } from "@/types/pokemon"

export interface DexFilterState {
  search: string
  types: PokemonType[]
}

interface DexFilterProps {
  onFilterChange: (filter: DexFilterState) => void
  filter: DexFilterState
}

export function DexFilter({ onFilterChange, filter }: DexFilterProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filter, search: value })
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
    onFilterChange({ search: "", types: [] })
  }, [onFilterChange])

  const hasActiveFilters = filter.search.length > 0 || filter.types.length > 0

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search Pokemon..."
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

      {/* Type Filters */}
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
