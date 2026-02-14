"use client";

import { ListFilter, Search, Shuffle, X } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getDexPokemonList } from "@/lib/dex-pokemon";
import {
  ALL_TYPES,
  GEN_RANGES,
  getAllAbilities,
  getAllItems,
  getAllMoves,
  getGenerationByPokemonId,
  toID,
} from "@/lib/pkmn";
import type { PokemonType } from "@/types/pokemon";

export type DexCategory = "pokemon" | "moves" | "abilities" | "items";

export interface DexFilterState {
  search: string;
  types: PokemonType[];
  generations: string[];
  category: DexCategory;
  randomSeed: number | null;
}

const dexFilterParsers = {
  search: parseAsString.withDefault(""),
  types: parseAsArrayOf(parseAsString).withDefault([]),
  generations: parseAsArrayOf(parseAsString).withDefault([]),
  category: parseAsString.withDefault("pokemon"),
  randomSeed: parseAsInteger,
};

const dexFilterUrlKeys = {
  search: "q",
  types: "t",
  generations: "g",
  category: "c",
  randomSeed: "r",
};

export function useDexFilter() {
  const [queryState, setQueryState] = useQueryStates(dexFilterParsers, {
    urlKeys: dexFilterUrlKeys,
    shallow: false,
  });

  const filter: DexFilterState = useMemo(
    () => ({
      search: queryState.search,
      types: queryState.types as PokemonType[],
      generations: queryState.generations,
      category: queryState.category as DexCategory,
      randomSeed: queryState.randomSeed,
    }),
    [queryState],
  );

  const setFilter = useCallback(
    (newFilter: DexFilterState) => {
      setQueryState({
        search: newFilter.search || null,
        types: newFilter.types.length > 0 ? newFilter.types : null,
        generations:
          newFilter.generations.length > 0 ? newFilter.generations : null,
        category: newFilter.category === "pokemon" ? null : newFilter.category,
        randomSeed: newFilter.randomSeed,
      });
    },
    [setQueryState],
  );

  return [filter, setFilter] as const;
}

interface DexFilterProps {
  onFilterChange: (filter: DexFilterState) => void;
  filter: DexFilterState;
  collapsed?: boolean;
}

const CATEGORY_LABELS: Record<DexCategory, string> = {
  pokemon: "Pokemon",
  moves: "Moves",
  abilities: "Abilities",
  items: "Items",
};

const CATEGORY_PLACEHOLDERS: Record<DexCategory, string> = {
  pokemon: "Filter Pokemon...",
  moves: "Filter Moves...",
  abilities: "Filter Abilities...",
  items: "Filter Items...",
};

export function DexFilter({
  onFilterChange,
  filter,
  collapsed = false,
}: DexFilterProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filter, search: value });
    },
    [filter, onFilterChange],
  );

  const handleCategoryChange = useCallback(
    (category: DexCategory) => {
      onFilterChange({
        ...filter,
        category,
        search: "",
        types: [],
        generations: [],
        randomSeed: null,
      });
    },
    [filter, onFilterChange],
  );

  const handleTypeToggle = useCallback(
    (type: PokemonType) => {
      const newTypes = filter.types.includes(type)
        ? filter.types.filter((t) => t !== type)
        : [...filter.types, type];
      onFilterChange({ ...filter, types: newTypes });
    },
    [filter, onFilterChange],
  );

  const handleGenerationToggle = useCallback(
    (genId: string) => {
      const newGenerations = filter.generations.includes(genId)
        ? filter.generations.filter((g) => g !== genId)
        : [...filter.generations, genId];
      onFilterChange({ ...filter, generations: newGenerations });
    },
    [filter, onFilterChange],
  );

  const handleClearFilters = useCallback(() => {
    onFilterChange({
      ...filter,
      search: "",
      types: [],
      generations: [],
      randomSeed: null,
    });
  }, [filter, onFilterChange]);

  const handleRandomSort = useCallback(() => {
    onFilterChange({ ...filter, randomSeed: Date.now() });
  }, [filter, onFilterChange]);

  const handleClearRandomSort = useCallback(() => {
    onFilterChange({ ...filter, randomSeed: null });
  }, [filter, onFilterChange]);

  const hasActiveFilters =
    filter.search.length > 0 ||
    filter.types.length > 0 ||
    filter.generations.length > 0;

  const [genPopoverOpen, setGenPopoverOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Category Tabs + Search Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        {/* Category Tabs - collapsible */}
        <div
          className={`grid transition-all duration-200 ease-in-out sm:flex sm:items-center sm:gap-1 sm:shrink-0 ${
            collapsed
              ? "grid-rows-[0fr] opacity-0 sm:grid-rows-[1fr] sm:opacity-100"
              : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex gap-1">
              {(["pokemon", "moves", "abilities", "items"] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border ${
                      filter.category === cat
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={CATEGORY_PLACEHOLDERS[filter.category]}
            value={filter.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`pl-8 h-8 text-xs ${filter.category === "pokemon" || filter.category === "moves" ? "pr-20" : "pr-14"}`}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {filter.search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {filter.category === "pokemon" && (
              <Popover open={genPopoverOpen} onOpenChange={setGenPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`relative p-1 transition-colors ${
                      filter.generations.length > 0
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ListFilter className="h-3.5 w-3.5" />
                    {filter.generations.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center bg-foreground text-[7px] font-medium text-background">
                        {filter.generations.length}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-1">
                    {GEN_RANGES.map((gen) => (
                      <label
                        key={gen.id}
                        htmlFor={`gen-filter-${gen.id}`}
                        className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          id={`gen-filter-${gen.id}`}
                          checked={filter.generations.includes(gen.id)}
                          onCheckedChange={() => handleGenerationToggle(gen.id)}
                        />
                        <span>
                          {gen.name}{" "}
                          <span className="text-muted-foreground">
                            ({gen.label})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {filter.generations.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 w-full text-xs"
                      onClick={() =>
                        onFilterChange({ ...filter, generations: [] })
                      }
                    >
                      Clear generations
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            )}
            <button
              type="button"
              onClick={
                filter.randomSeed ? handleClearRandomSort : handleRandomSort
              }
              className={`p-1 transition-colors ${
                filter.randomSeed
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Type Filters - show for Pokemon and Moves, collapsible */}
      {(filter.category === "pokemon" || filter.category === "moves") && (
        <div
          className={`grid transition-all duration-200 ease-in-out ${
            collapsed
              ? "grid-rows-[0fr] opacity-0"
              : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeToggle(type as PokemonType)}
                  className={`transition-opacity ${
                    filter.types.length > 0 &&
                    !filter.types.includes(type as PokemonType)
                      ? "opacity-30 hover:opacity-60"
                      : "opacity-100"
                  }`}
                >
                  <TypeBadge type={type as PokemonType} size="sm" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div
          className={`grid transition-all duration-200 ease-in-out ${
            collapsed
              ? "grid-rows-[0fr] opacity-0"
              : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
              {filter.types.length > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {filter.types.length} type{filter.types.length > 1 ? "s" : ""}
                </span>
              )}
              {filter.generations.length > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {filter.generations.length} gen
                  {filter.generations.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Seeded random shuffle function using Fisher-Yates algorithm
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed;

  // Simple seeded random number generator (mulberry32)
  const random = () => {
    currentSeed |= 0;
    currentSeed = (currentSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(currentSeed ^ (currentSeed >>> 15), 1 | currentSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Hook to get filtered Pokemon based on filter state
export function useFilteredPokemon(filter: DexFilterState) {
  const allPokemon = useMemo(
    () =>
      getDexPokemonList(9, { forms: "distinct-sprites" }).map((p) => ({
        name: p.name,
        id: p.id,
        types: p.types,
        baseId: p.baseId,
      })),
    [],
  );

  const hasActiveFilters =
    filter.search.length > 0 ||
    filter.types.length > 0 ||
    filter.generations.length > 0;

  const filteredPokemon = useMemo(() => {
    if (!hasActiveFilters && !filter.randomSeed) return null;

    let result = allPokemon;

    // Apply filters if any
    if (hasActiveFilters) {
      const searchLower = filter.search.toLowerCase();
      result = allPokemon.filter((pokemon) => {
        if (searchLower && !pokemon.name.toLowerCase().includes(searchLower)) {
          return false;
        }
        if (filter.types.length > 0) {
          const hasType = filter.types.some((t) => pokemon.types.includes(t));
          if (!hasType) return false;
        }
        if (filter.generations.length > 0) {
          const pokemonGen = getGenerationByPokemonId(pokemon.baseId);
          if (!pokemonGen || !filter.generations.includes(pokemonGen)) {
            return false;
          }
        }
        return true;
      });
    }

    // Apply random shuffle if seed is set
    if (filter.randomSeed) {
      result = seededShuffle(result, filter.randomSeed);
    }

    return result;
  }, [
    allPokemon,
    filter.search,
    filter.types,
    filter.generations,
    filter.randomSeed,
    hasActiveFilters,
  ]);

  return {
    filteredPokemon,
    isLoading: false,
    hasActiveFilters: hasActiveFilters || filter.randomSeed !== null,
    totalCount: allPokemon.length,
  };
}

// Hook to get filtered Moves based on filter state
export function useFilteredMoves(filter: DexFilterState) {
  const allMoves = useMemo(
    () =>
      getAllMoves().map((m) => ({
        name: m.name,
        id: m.num,
        type: m.type as string,
        category: m.category as "Physical" | "Special" | "Status",
        power: m.basePower,
        accuracy: m.accuracy,
        pp: m.pp,
      })),
    [],
  );

  const hasActiveFilters = filter.search.length > 0 || filter.types.length > 0;

  const filteredMoves = useMemo(() => {
    if (!hasActiveFilters && !filter.randomSeed) return allMoves;

    let result = allMoves;

    if (hasActiveFilters) {
      const searchLower = filter.search.toLowerCase();

      result = allMoves.filter((move) => {
        if (searchLower && !move.name.toLowerCase().includes(searchLower)) {
          return false;
        }
        if (filter.types.length > 0) {
          if (!filter.types.includes(move.type as PokemonType)) {
            return false;
          }
        }
        return true;
      });
    }

    if (filter.randomSeed) {
      result = seededShuffle(result, filter.randomSeed);
    }

    return result;
  }, [
    allMoves,
    filter.search,
    filter.types,
    filter.randomSeed,
    hasActiveFilters,
  ]);

  return {
    filteredMoves,
    isLoading: false,
    hasActiveFilters: hasActiveFilters || filter.randomSeed !== null,
    totalCount: allMoves.length,
  };
}

// Hook to get filtered Abilities based on filter state
export function useFilteredAbilities(filter: DexFilterState) {
  const allAbilities = useMemo(
    () =>
      getAllAbilities().map((a) => ({
        name: a.name,
        id: a.num,
        shortDesc: a.shortDesc || a.desc || "",
      })),
    [],
  );

  const hasActiveFilters = filter.search.length > 0;

  const filteredAbilities = useMemo(() => {
    if (!hasActiveFilters && !filter.randomSeed) return allAbilities;

    let result = allAbilities;

    if (hasActiveFilters) {
      const searchLower = filter.search.toLowerCase();

      result = allAbilities.filter((ability) => {
        if (searchLower && !ability.name.toLowerCase().includes(searchLower)) {
          return false;
        }
        return true;
      });
    }

    if (filter.randomSeed) {
      result = seededShuffle(result, filter.randomSeed);
    }

    return result;
  }, [allAbilities, filter.search, filter.randomSeed, hasActiveFilters]);

  return {
    filteredAbilities,
    isLoading: false,
    hasActiveFilters: hasActiveFilters || filter.randomSeed !== null,
    totalCount: allAbilities.length,
  };
}

// Hook to get filtered Items based on filter state
export function useFilteredItems(filter: DexFilterState) {
  const allItems = useMemo(
    () =>
      getAllItems().map((i) => ({
        name: i.name,
        id: i.num,
        sprite: `https://play.pokemonshowdown.com/sprites/itemicons/${toID(i.name)}.png`,
      })),
    [],
  );

  const hasActiveFilters = filter.search.length > 0;

  const filteredItems = useMemo(() => {
    if (!hasActiveFilters && !filter.randomSeed) return allItems;

    let result = allItems;

    if (hasActiveFilters) {
      const searchLower = filter.search.toLowerCase();

      result = allItems.filter((item) => {
        if (searchLower && !item.name.toLowerCase().includes(searchLower)) {
          return false;
        }
        return true;
      });
    }

    if (filter.randomSeed) {
      result = seededShuffle(result, filter.randomSeed);
    }

    return result;
  }, [allItems, filter.search, filter.randomSeed, hasActiveFilters]);

  return {
    filteredItems,
    isLoading: false,
    hasActiveFilters: hasActiveFilters || filter.randomSeed !== null,
    totalCount: allItems.length,
  };
}
