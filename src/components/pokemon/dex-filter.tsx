"use client";

import {
  ArrowDown,
  ArrowUp,
  ListFilter,
  Minus,
  Plus,
  Search,
  Shuffle,
  X,
} from "lucide-react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import {
  type DexPokemonListItem,
  getDexPokemonList,
  getStatBounds,
  RANGE_STAT_KEYS,
  type RangeStatKey,
  REGULATIONS,
  STAT_LABELS,
  toRegulationMask,
} from "@/lib/dex-pokemon";
import {
  GEN_RANGES,
  getAllAbilities,
  getAllItems,
  getAllMoves,
  getAllTypes,
  getGenerationByPokemonId,
  LATEST_GEN,
  toID,
} from "@/lib/pkmn";
import type { PokemonType } from "@/types/pokemon";

export type DexCategory = "pokemon" | "moves" | "abilities" | "items";

export type DexSortKey = "dex" | "name" | RangeStatKey;
export type DexSortDirection = "asc" | "desc";

/** Boolean traits that can be required (+) or excluded (-). */
export type DexTag =
  | "baby"
  | "legendary"
  | "mythical"
  | "paradox"
  | "ultrabeast"
  | "mega"
  | "fullyevolved"
  | "restricted";

export type DexTagMode = "include" | "exclude";

export const DEX_TAGS: { id: DexTag; label: string }[] = [
  { id: "fullyevolved", label: "Fully Evolved" },
  { id: "baby", label: "Baby" },
  { id: "legendary", label: "Legendary" },
  { id: "mythical", label: "Mythical" },
  { id: "paradox", label: "Paradox" },
  { id: "ultrabeast", label: "Ultra Beast" },
  { id: "mega", label: "Mega" },
  { id: "restricted", label: "Restricted" },
];

const TAG_PREDICATES: Record<DexTag, (p: DexPokemonListItem) => boolean> = {
  baby: (p) => p.isBaby,
  legendary: (p) => p.isLegendary,
  mythical: (p) => p.isMythical,
  paradox: (p) => p.isParadox,
  ultrabeast: (p) => p.isUltraBeast,
  mega: (p) => p.isMega,
  fullyevolved: (p) => p.isFullyEvolved,
  restricted: (p) => p.isRestricted,
};

export const DEX_SORT_OPTIONS: { id: DexSortKey; label: string }[] = [
  { id: "dex", label: "Dex #" },
  { id: "name", label: "Name" },
  ...RANGE_STAT_KEYS.map((key) => ({
    id: key as DexSortKey,
    label: STAT_LABELS[key],
  })),
];

export type StatRanges = Partial<Record<RangeStatKey, [number, number]>>;
export type DexTagState = Partial<Record<DexTag, DexTagMode>>;

export interface DexFilterState {
  search: string;
  types: PokemonType[];
  generations: string[];
  category: DexCategory;
  randomSeed: number | null;
  /** Showdown format ids; a Pokemon matches if legal in any of them */
  regulations: string[];
  sort: DexSortKey;
  sortDirection: DexSortDirection;
  /** Inclusive [min, max] per stat; absent keys are unconstrained */
  stats: StatRanges;
  tags: DexTagState;
}

const RANGE_STAT_KEY_SET = new Set<string>(RANGE_STAT_KEYS);
const DEX_TAG_SET = new Set<string>(DEX_TAGS.map((t) => t.id));
const SORT_KEY_SET = new Set<string>(DEX_SORT_OPTIONS.map((s) => s.id));
const REGULATION_ID_SET = new Set<string>(REGULATIONS.map((r) => r.id));

/** "hp:50-120,spe:0-100" <-> { hp: [50, 120], spe: [0, 100] } */
function parseStatRanges(raw: string): StatRanges {
  const result: StatRanges = {};
  for (const entry of raw.split(",")) {
    const [key, range] = entry.split(":");
    if (!key || !range || !RANGE_STAT_KEY_SET.has(key)) continue;
    const [min, max] = range.split("-").map((n) => Number.parseInt(n, 10));
    if (Number.isNaN(min) || Number.isNaN(max)) continue;
    result[key as RangeStatKey] = [min, max];
  }
  return result;
}

function serializeStatRanges(stats: StatRanges): string | null {
  const entries = RANGE_STAT_KEYS.filter((key) => stats[key]).map((key) => {
    const [min, max] = stats[key] as [number, number];
    return `${key}:${min}-${max}`;
  });
  return entries.length > 0 ? entries.join(",") : null;
}

/** ["+mega", "-baby"] <-> { mega: "include", baby: "exclude" } */
function parseTags(raw: string[]): DexTagState {
  const result: DexTagState = {};
  for (const entry of raw) {
    const mode = entry.startsWith("-") ? "exclude" : "include";
    const id = entry.replace(/^[+-]/, "");
    if (!DEX_TAG_SET.has(id)) continue;
    result[id as DexTag] = mode;
  }
  return result;
}

function serializeTags(tags: DexTagState): string[] | null {
  const entries = DEX_TAGS.filter((t) => tags[t.id]).map(
    (t) => `${tags[t.id] === "exclude" ? "-" : "+"}${t.id}`,
  );
  return entries.length > 0 ? entries : null;
}

const dexFilterParsers = {
  search: parseAsString.withDefault(""),
  types: parseAsArrayOf(parseAsString).withDefault([]),
  generations: parseAsArrayOf(parseAsString).withDefault([]),
  category: parseAsString.withDefault("pokemon"),
  randomSeed: parseAsInteger,
  regulations: parseAsArrayOf(parseAsString).withDefault([]),
  sort: parseAsString.withDefault("dex"),
  sortDirection: parseAsString.withDefault("asc"),
  stats: parseAsString.withDefault(""),
  tags: parseAsArrayOf(parseAsString).withDefault([]),
};

const dexFilterUrlKeys = {
  search: "q",
  types: "t",
  generations: "g",
  category: "c",
  randomSeed: "r",
  regulations: "reg",
  sort: "s",
  sortDirection: "d",
  stats: "st",
  tags: "tg",
};

/** Also listed in use-data-export's STORAGE_KEYS so backup/clear cover it. */
const FILTER_STORAGE_KEY = "pokedex-dex-filter";

/**
 * The parts of the filter worth remembering between visits: the filter panel
 * and the sort. Search text, the active category tab and the random seed are
 * per-visit intent, so they stay out.
 */
type PersistedDexFilter = Pick<
  DexFilterState,
  | "types"
  | "generations"
  | "regulations"
  | "sort"
  | "sortDirection"
  | "stats"
  | "tags"
>;

function isPersistedFilterEmpty(filter: PersistedDexFilter): boolean {
  return (
    filter.types.length === 0 &&
    filter.generations.length === 0 &&
    filter.regulations.length === 0 &&
    filter.sort === "dex" &&
    filter.sortDirection === "asc" &&
    Object.keys(filter.stats).length === 0 &&
    Object.keys(filter.tags).length === 0
  );
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

/**
 * Rebuild a filter from whatever is in storage, dropping anything that no
 * longer exists (a retired regulation, a stat key we stopped supporting).
 */
function parsePersistedFilter(raw: string | null): PersistedDexFilter | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedDexFilter>;
    if (!parsed || typeof parsed !== "object") return null;

    const stats: StatRanges = {};
    for (const [key, range] of Object.entries(parsed.stats ?? {})) {
      if (!RANGE_STAT_KEY_SET.has(key)) continue;
      if (!Array.isArray(range) || range.length !== 2) continue;
      const [min, max] = range;
      if (typeof min !== "number" || typeof max !== "number") continue;
      stats[key as RangeStatKey] = [min, max];
    }

    const tags: DexTagState = {};
    for (const [key, mode] of Object.entries(parsed.tags ?? {})) {
      if (!DEX_TAG_SET.has(key)) continue;
      if (mode !== "include" && mode !== "exclude") continue;
      tags[key as DexTag] = mode;
    }

    return {
      types: toStringArray(parsed.types) as PokemonType[],
      generations: toStringArray(parsed.generations),
      regulations: toStringArray(parsed.regulations).filter((id) =>
        REGULATION_ID_SET.has(id),
      ),
      sort:
        typeof parsed.sort === "string" && SORT_KEY_SET.has(parsed.sort)
          ? (parsed.sort as DexSortKey)
          : "dex",
      sortDirection: parsed.sortDirection === "desc" ? "desc" : "asc",
      stats,
      tags,
    };
  } catch {
    return null;
  }
}

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
      regulations: queryState.regulations.filter((id) =>
        REGULATION_ID_SET.has(id),
      ),
      sort: SORT_KEY_SET.has(queryState.sort)
        ? (queryState.sort as DexSortKey)
        : "dex",
      sortDirection: queryState.sortDirection === "desc" ? "desc" : "asc",
      stats: parseStatRanges(queryState.stats),
      tags: parseTags(queryState.tags),
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
        regulations:
          newFilter.regulations.length > 0 ? newFilter.regulations : null,
        sort: newFilter.sort === "dex" ? null : newFilter.sort,
        sortDirection: newFilter.sortDirection === "asc" ? null : "desc",
        stats: serializeStatRanges(newFilter.stats),
        tags: serializeTags(newFilter.tags),
      });
    },
    [setQueryState],
  );

  // Restore the last-used panel + sort on the first visit of a session, but
  // only when the URL carries no filter of its own — a shared link always wins.
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const current: PersistedDexFilter = {
      types: filter.types,
      generations: filter.generations,
      regulations: filter.regulations,
      sort: filter.sort,
      sortDirection: filter.sortDirection,
      stats: filter.stats,
      tags: filter.tags,
    };
    if (!isPersistedFilterEmpty(current)) return;

    const stored = parsePersistedFilter(
      localStorage.getItem(FILTER_STORAGE_KEY),
    );
    if (!stored || isPersistedFilterEmpty(stored)) return;

    setFilter({ ...filter, ...stored });
  }, [filter, setFilter]);

  // Skips the mount pass so a fresh page load can't overwrite the stored
  // filter with the empty one it starts from.
  const isFirstPersist = useRef(true);
  useEffect(() => {
    if (isFirstPersist.current) {
      isFirstPersist.current = false;
      return;
    }

    const toPersist: PersistedDexFilter = {
      types: filter.types,
      generations: filter.generations,
      regulations: filter.regulations,
      sort: filter.sort,
      sortDirection: filter.sortDirection,
      stats: filter.stats,
      tags: filter.tags,
    };

    if (isPersistedFilterEmpty(toPersist)) {
      localStorage.removeItem(FILTER_STORAGE_KEY);
      return;
    }
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(toPersist));
  }, [filter]);

  return [filter, setFilter] as const;
}

/** Cycles a trait chip: off -> include -> exclude -> off. */
function nextTagMode(current: DexTagMode | undefined): DexTagMode | undefined {
  if (!current) return "include";
  if (current === "include") return "exclude";
  return undefined;
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
  pokemon: "Search Pokemon or ability...",
  moves: "Search Moves...",
  abilities: "Search Abilities...",
  items: "Search Items...",
};

export function DexFilter({
  onFilterChange,
  filter,
  collapsed = false,
}: DexFilterProps) {
  const { preferredGeneration } = useGenerationPreference();
  const { speciesCutoffGeneration } = useSpritePreferences();
  const statBounds = useMemo(
    () => getStatBounds(preferredGeneration, speciesCutoffGeneration),
    [preferredGeneration, speciesCutoffGeneration],
  );
  // Only offer the types that existed in the generation being viewed.
  const availableTypes = useMemo(
    () =>
      getAllTypes(preferredGeneration ?? LATEST_GEN).map(
        (t) => t.name as PokemonType,
      ),
    [preferredGeneration],
  );

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
        regulations: [],
        sort: "dex",
        sortDirection: "asc",
        stats: {},
        tags: {},
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

  const handleRegulationToggle = useCallback(
    (regulationId: string) => {
      const newRegulations = filter.regulations.includes(regulationId)
        ? filter.regulations.filter((r) => r !== regulationId)
        : [...filter.regulations, regulationId];
      onFilterChange({ ...filter, regulations: newRegulations });
    },
    [filter, onFilterChange],
  );

  const handleTagCycle = useCallback(
    (tag: DexTag) => {
      const newTags = { ...filter.tags };
      const next = nextTagMode(newTags[tag]);
      if (next) newTags[tag] = next;
      else delete newTags[tag];
      onFilterChange({ ...filter, tags: newTags });
    },
    [filter, onFilterChange],
  );

  const handleStatRangeChange = useCallback(
    (stat: RangeStatKey, range: [number, number]) => {
      const [boundMin, boundMax] = statBounds[stat];
      const newStats = { ...filter.stats };
      if (range[0] <= boundMin && range[1] >= boundMax) delete newStats[stat];
      else newStats[stat] = range;
      onFilterChange({ ...filter, stats: newStats });
    },
    [filter, onFilterChange, statBounds],
  );

  const handleSortChange = useCallback(
    (sort: DexSortKey) => {
      // Re-picking the active key flips direction instead of doing nothing.
      if (sort === filter.sort) {
        onFilterChange({
          ...filter,
          sortDirection: filter.sortDirection === "asc" ? "desc" : "asc",
        });
        return;
      }
      onFilterChange({
        ...filter,
        sort,
        // Stats read best highest-first; dex number and name read best A→Z.
        sortDirection: sort === "dex" || sort === "name" ? "asc" : "desc",
      });
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
      regulations: [],
      sort: "dex",
      sortDirection: "asc",
      stats: {},
      tags: {},
    });
  }, [filter, onFilterChange]);

  const handleRandomSort = useCallback(() => {
    onFilterChange({ ...filter, randomSeed: Date.now() });
  }, [filter, onFilterChange]);

  const handleClearRandomSort = useCallback(() => {
    onFilterChange({ ...filter, randomSeed: null });
  }, [filter, onFilterChange]);

  const statFilterCount = Object.keys(filter.stats).length;
  const tagFilterCount = Object.keys(filter.tags).length;

  const hasActiveFilters =
    filter.search.length > 0 ||
    filter.types.length > 0 ||
    filter.generations.length > 0 ||
    filter.regulations.length > 0 ||
    statFilterCount > 0 ||
    tagFilterCount > 0 ||
    filter.sort !== "dex";

  const advancedFilterCount =
    filter.generations.length +
    filter.regulations.length +
    statFilterCount +
    tagFilterCount +
    (filter.sort === "dex" ? 0 : 1);

  const [genPopoverOpen, setGenPopoverOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Category Chips - collapsible */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          collapsed
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-wrap gap-2 pb-3">
            {(["pokemon", "moves", "abilities", "items"] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    filter.category === cat
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Search Input with embedded filter buttons */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={CATEGORY_PLACEHOLDERS[filter.category]}
          value={filter.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={`pl-9 ${filter.category === "pokemon" || filter.category === "moves" ? "pr-20" : "pr-14"}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {filter.search && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {filter.category === "pokemon" && (
            <Popover open={genPopoverOpen} onOpenChange={setGenPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`relative p-1 transition-colors ${
                    advancedFilterCount > 0
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListFilter className="h-4 w-4" />
                  {advancedFilterCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-foreground text-[8px] font-medium text-background">
                      {advancedFilterCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-72 max-h-[70vh] overflow-y-auto p-3"
                align="end"
              >
                <div className="space-y-4">
                  <section className="space-y-1">
                    <h4 className="px-1 text-xs font-medium text-muted-foreground">
                      Sort by
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {DEX_SORT_OPTIONS.map((option) => {
                        const active = filter.sort === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSortChange(option.id)}
                            className={`flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                              active
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {option.label}
                            {active &&
                              (filter.sortDirection === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              ))}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-1">
                    <h4 className="px-1 text-xs font-medium text-muted-foreground">
                      Traits{" "}
                      <span className="font-normal">
                        (tap to require, again to exclude)
                      </span>
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {DEX_TAGS.map((tag) => {
                        const mode = filter.tags[tag.id];
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagCycle(tag.id)}
                            className={`flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                              mode === "include"
                                ? "bg-emerald-600 text-white"
                                : mode === "exclude"
                                  ? "bg-red-600 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {mode === "include" && <Plus className="h-3 w-3" />}
                            {mode === "exclude" && (
                              <Minus className="h-3 w-3" />
                            )}
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="px-1 text-xs font-medium text-muted-foreground">
                      Base stats
                    </h4>
                    {RANGE_STAT_KEYS.map((stat) => {
                      const [boundMin, boundMax] = statBounds[stat];
                      const [min, max] = filter.stats[stat] ?? [
                        boundMin,
                        boundMax,
                      ];
                      return (
                        <div key={stat} className="px-1">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={
                                filter.stats[stat]
                                  ? "font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {STAT_LABELS[stat]}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {min} – {max}
                            </span>
                          </div>
                          <Slider
                            className="mt-1.5"
                            min={boundMin}
                            max={boundMax}
                            step={1}
                            value={[min, max]}
                            onValueChange={(value) =>
                              handleStatRangeChange(stat, [
                                value[0],
                                value[1] ?? boundMax,
                              ])
                            }
                          />
                        </div>
                      );
                    })}
                  </section>

                  <section className="space-y-1">
                    <h4 className="px-1 text-xs font-medium text-muted-foreground">
                      Regulation
                    </h4>
                    {REGULATIONS.map((regulation) => (
                      <label
                        key={regulation.id}
                        htmlFor={`reg-filter-${regulation.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          id={`reg-filter-${regulation.id}`}
                          checked={filter.regulations.includes(regulation.id)}
                          onCheckedChange={() =>
                            handleRegulationToggle(regulation.id)
                          }
                        />
                        <span>{regulation.name}</span>
                      </label>
                    ))}
                  </section>

                  <section className="space-y-1">
                    <h4 className="px-1 text-xs font-medium text-muted-foreground">
                      Generation
                    </h4>
                    {GEN_RANGES.map((gen) => (
                      <label
                        key={gen.id}
                        htmlFor={`gen-filter-${gen.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
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
                  </section>
                </div>

                {advancedFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 w-full text-xs"
                    onClick={() =>
                      onFilterChange({
                        ...filter,
                        generations: [],
                        regulations: [],
                        stats: {},
                        tags: {},
                        sort: "dex",
                        sortDirection: "asc",
                      })
                    }
                  >
                    Reset filters
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
            <Shuffle className="h-4 w-4" />
          </button>
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
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-wrap gap-1.5">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeToggle(type as PokemonType)}
                  className={`transition-opacity ${
                    filter.types.length > 0 &&
                    !filter.types.includes(type as PokemonType)
                      ? "opacity-40 hover:opacity-70"
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

      {/* Clear Filters - collapsible */}
      {hasActiveFilters && (
        <div
          className={`grid transition-all duration-200 ease-in-out ${
            collapsed
              ? "grid-rows-[0fr] opacity-0"
              : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
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
                  {filter.types.length} type{filter.types.length > 1 ? "s" : ""}{" "}
                  selected
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

function matchesSearch(pokemon: DexPokemonListItem, searchLower: string) {
  if (pokemon.name.toLowerCase().includes(searchLower)) return true;
  // Ability names are searchable too, so "blaze" surfaces every Blaze user.
  return pokemon.abilities.some((a) => a.toLowerCase().includes(searchLower));
}

function comparePokemon(
  a: DexPokemonListItem,
  b: DexPokemonListItem,
  sort: DexSortKey,
) {
  if (sort === "name") return a.name.localeCompare(b.name);
  if (sort === "dex") return a.id - b.id || a.name.localeCompare(b.name);
  // Ties on a stat fall back to dex order so the grid stays stable.
  return a.stats[sort] - b.stats[sort] || a.id - b.id;
}

// Hook to get filtered Pokemon based on filter state
export function useFilteredPokemon(filter: DexFilterState) {
  const { preferredGeneration } = useGenerationPreference();
  const { speciesCutoffGeneration } = useSpritePreferences();
  const allPokemon = useMemo(
    () =>
      getDexPokemonList(preferredGeneration, {
        forms: "distinct-sprites",
        speciesCutoffGeneration,
      }),
    [preferredGeneration, speciesCutoffGeneration],
  );

  const activeTags = useMemo(
    () =>
      DEX_TAGS.filter((t) => filter.tags[t.id]).map((t) => ({
        predicate: TAG_PREDICATES[t.id],
        wanted: filter.tags[t.id] === "include",
      })),
    [filter.tags],
  );

  const activeStats = useMemo(
    () =>
      RANGE_STAT_KEYS.filter((key) => filter.stats[key]).map((key) => ({
        key,
        range: filter.stats[key] as [number, number],
      })),
    [filter.stats],
  );

  const regulationMask = useMemo(
    () => toRegulationMask(filter.regulations),
    [filter.regulations],
  );

  const hasActiveFilters =
    filter.search.length > 0 ||
    filter.types.length > 0 ||
    filter.generations.length > 0 ||
    regulationMask !== 0 ||
    activeTags.length > 0 ||
    activeStats.length > 0 ||
    filter.sort !== "dex";

  const filteredPokemon = useMemo(() => {
    if (!hasActiveFilters && !filter.randomSeed) return null;

    const searchLower = filter.search.toLowerCase();

    let result = allPokemon.filter((pokemon) => {
      if (searchLower && !matchesSearch(pokemon, searchLower)) return false;

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

      // Legal in at least one of the selected regulations.
      if (
        regulationMask !== 0 &&
        (pokemon.regulationMask & regulationMask) === 0
      ) {
        return false;
      }

      for (const { predicate, wanted } of activeTags) {
        if (predicate(pokemon) !== wanted) return false;
      }

      for (const { key, range } of activeStats) {
        const value = pokemon.stats[key];
        if (value < range[0] || value > range[1]) return false;
      }

      return true;
    });

    // A random shuffle deliberately overrides any chosen sort order.
    if (filter.randomSeed) {
      result = seededShuffle(result, filter.randomSeed);
    } else if (filter.sort !== "dex" || filter.sortDirection !== "asc") {
      const direction = filter.sortDirection === "desc" ? -1 : 1;
      result = [...result].sort(
        (a, b) => comparePokemon(a, b, filter.sort) * direction,
      );
    }

    return result.map((p) => ({ name: p.name, id: p.id }));
  }, [
    allPokemon,
    filter.search,
    filter.types,
    filter.generations,
    filter.randomSeed,
    filter.sort,
    filter.sortDirection,
    regulationMask,
    activeTags,
    activeStats,
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
  const { preferredGeneration } = useGenerationPreference();
  const allMoves = useMemo(
    () =>
      getAllMoves(preferredGeneration ?? LATEST_GEN).map((m) => ({
        name: m.name,
        id: m.num,
        type: m.type as string,
        category: m.category as "Physical" | "Special" | "Status",
        power: m.basePower,
        accuracy: m.accuracy,
        pp: m.pp,
      })),
    [preferredGeneration],
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
  const { preferredGeneration } = useGenerationPreference();
  const allAbilities = useMemo(
    () =>
      getAllAbilities(preferredGeneration ?? LATEST_GEN).map((a) => ({
        name: a.name,
        id: a.num,
        shortDesc: a.shortDesc || a.desc || "",
      })),
    [preferredGeneration],
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
  const { preferredGeneration } = useGenerationPreference();
  const allItems = useMemo(
    () =>
      getAllItems(preferredGeneration ?? LATEST_GEN).map((i) => ({
        name: i.name,
        id: i.num,
        sprite: `https://play.pokemonshowdown.com/sprites/itemicons/${toID(i.name)}.png`,
      })),
    [preferredGeneration],
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
