"use client"

import { useCallback, useMemo, useState } from "react"
import { Search, X, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { NewsFilterState, NewsCategory } from "@/types/news"
import { GENERATION_LIMITS } from "@/types/news"
import { getNewsCategories } from "@/lib/news"
import type { Generation } from "@/types/team"

interface NewsFilterProps {
  filter: NewsFilterState
  onFilterChange: (filter: NewsFilterState) => void
}

const MAX_POKEMON_ID = 1025

export function NewsFilter({ filter, onFilterChange }: NewsFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const categories = getNewsCategories()

  const handleSearchChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filter, search: value })
    },
    [filter, onFilterChange]
  )

  const handleCategoryToggle = useCallback(
    (category: NewsCategory) => {
      const newCategories = filter.categories.includes(category)
        ? filter.categories.filter((c) => c !== category)
        : [...filter.categories, category]
      onFilterChange({ ...filter, categories: newCategories })
    },
    [filter, onFilterChange]
  )

  const handleGenerationToggle = useCallback(
    (generation: Generation) => {
      const newGenerations = filter.generations.includes(generation)
        ? filter.generations.filter((g) => g !== generation)
        : [...filter.generations, generation]
      onFilterChange({ ...filter, generations: newGenerations })
    },
    [filter, onFilterChange]
  )

  const handleLimitChange = useCallback(
    (value: number[]) => {
      const limit = value[0]
      onFilterChange({
        ...filter,
        pokemonLimit: limit === MAX_POKEMON_ID ? undefined : limit,
      })
    },
    [filter, onFilterChange]
  )

  const handleClearFilters = useCallback(() => {
    onFilterChange({
      search: "",
      categories: [],
      generations: [],
      pokemonLimit: undefined,
    })
  }, [onFilterChange])

  const hasActiveFilters =
    filter.search.length > 0 ||
    filter.categories.length > 0 ||
    filter.generations.length > 0 ||
    filter.pokemonLimit !== undefined

  const limitLabel = useMemo(() => {
    if (!filter.pokemonLimit) return null
    const gen = GENERATION_LIMITS.find(
      (g) => g.cumulativeMaxId >= filter.pokemonLimit!
    )
    return gen ? `${gen.name} (${filter.pokemonLimit})` : `#${filter.pokemonLimit}`
  }, [filter.pokemonLimit])

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search news..."
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

        {/* Advanced Filters Popover */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="icon"
              className="shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Pokemon Limit</h4>
                <div className="space-y-2">
                  <Slider
                    value={[filter.pokemonLimit ?? MAX_POKEMON_ID]}
                    onValueChange={handleLimitChange}
                    min={151}
                    max={MAX_POKEMON_ID}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Gen I (151)</span>
                    <span className="font-medium text-foreground">
                      {limitLabel ?? "All Pokemon"}
                    </span>
                    <span>All (1025)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Generations</h4>
                <div className="flex flex-wrap gap-1">
                  {GENERATION_LIMITS.map((gen) => (
                    <button
                      key={gen.generation}
                      onClick={() => handleGenerationToggle(gen.generation)}
                      className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                        filter.generations.includes(gen.generation)
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {gen.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Categories</h4>
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryToggle(cat.id)}
                      className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                        filter.categories.includes(cat.id)
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-2">
          {filter.pokemonLimit && (
            <Badge variant="secondary" className="gap-1">
              Limit: #{filter.pokemonLimit}
              <button
                onClick={() =>
                  onFilterChange({ ...filter, pokemonLimit: undefined })
                }
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filter.generations.map((gen) => {
            const genInfo = GENERATION_LIMITS.find((g) => g.generation === gen)
            return (
              <Badge key={gen} variant="secondary" className="gap-1">
                {genInfo?.name ?? gen}
                <button
                  onClick={() => handleGenerationToggle(gen)}
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          {filter.categories.map((cat) => {
            const catInfo = categories.find((c) => c.id === cat)
            return (
              <Badge key={cat} variant="secondary" className="gap-1">
                {catInfo?.label ?? cat}
                <button
                  onClick={() => handleCategoryToggle(cat)}
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

// Initial filter state
export const DEFAULT_NEWS_FILTER: NewsFilterState = {
  search: "",
  categories: [],
  generations: [],
  pokemonLimit: undefined,
}
