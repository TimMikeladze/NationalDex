"use client";

import { Filter, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import {
  DAMAGE_CLASSES,
  GENERATIONS,
  getAllMoves,
  getAllTypes,
  getGenerationName,
  LATEST_GEN,
  toID,
} from "@/lib/pkmn";
import { cn } from "@/lib/utils";
import type { MoveListItem, PokemonType } from "@/types/pokemon";
import { TYPE_COLORS } from "@/types/pokemon";

type DamageClass = "Physical" | "Special" | "Status";

interface Filters {
  search: string;
  types: PokemonType[];
  damageClasses: DamageClass[];
  generations: string[];
  powerMin: number | null;
  powerMax: number | null;
  priorityOnly: boolean;
  contactOnly: boolean;
}

const ITEMS_PER_PAGE = 100;

const POWER_PRESETS = [
  { label: "Any", min: null, max: null },
  { label: "1-60", min: 1, max: 60 },
  { label: "61-90", min: 61, max: 90 },
  { label: "91-120", min: 91, max: 120 },
  { label: "121+", min: 121, max: null },
];

export function MovesPageClient() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    types: [],
    damageClasses: [],
    generations: [],
    powerMin: null,
    powerMax: null,
    priorityOnly: false,
    contactOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { preferredGeneration } = useGenerationPreference();

  const availableTypes = useMemo(
    () =>
      getAllTypes(preferredGeneration ?? LATEST_GEN).map(
        (t) => t.name as PokemonType,
      ),
    [preferredGeneration],
  );

  // Moves as they exist in the generation being viewed
  const allMoves = useMemo(() => {
    return getAllMoves(preferredGeneration ?? LATEST_GEN).map((m) => ({
      id: m.num,
      name: m.name,
      type: m.type as PokemonType,
      damageClass: m.category as DamageClass,
      power: m.basePower || null,
      accuracy: m.accuracy === true ? null : m.accuracy,
      pp: m.pp,
      generation: getGenerationName(m.gen),
      priority: m.priority ?? 0,
      contact: m.flags?.contact ?? false,
    }));
  }, [preferredGeneration]);

  // Apply filters client-side
  const filteredMoves = useMemo(() => {
    return allMoves.filter((move) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!move.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(move.type)) {
        return false;
      }

      // Damage class filter
      if (
        filters.damageClasses.length > 0 &&
        !filters.damageClasses.includes(move.damageClass)
      ) {
        return false;
      }

      // Generation filter
      if (filters.generations.length > 0) {
        const romanNumeral = move.generation.split(" ")[1]?.toLowerCase();
        const moveGenId = romanNumeral ? `generation-${romanNumeral}` : "";
        if (!filters.generations.includes(moveGenId)) {
          return false;
        }
      }

      // Power range filter
      if (filters.powerMin !== null || filters.powerMax !== null) {
        if (move.power === null) return false;
        if (filters.powerMin !== null && move.power < filters.powerMin)
          return false;
        if (filters.powerMax !== null && move.power > filters.powerMax)
          return false;
      }

      // Priority filter
      if (filters.priorityOnly && move.priority <= 0) {
        return false;
      }

      // Contact filter
      if (filters.contactOnly && !move.contact) {
        return false;
      }

      return true;
    });
  }, [
    allMoves,
    filters.damageClasses,
    filters.generations,
    filters.search,
    filters.types,
    filters.powerMin,
    filters.powerMax,
    filters.priorityOnly,
    filters.contactOnly,
  ]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && displayCount < filteredMoves.length) {
        setDisplayCount((prev) =>
          Math.min(prev + ITEMS_PER_PAGE, filteredMoves.length),
        );
      }
    },
    [displayCount, filteredMoves.length],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0,
      rootMargin: "200px",
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  const filtersKey = useMemo(() => {
    return [
      filters.search,
      filters.types.join(","),
      filters.damageClasses.join(","),
      filters.generations.join(","),
      filters.powerMin,
      filters.powerMax,
      filters.priorityOnly,
      filters.contactOnly,
    ].join("|");
  }, [
    filters.damageClasses,
    filters.generations,
    filters.search,
    filters.types,
    filters.powerMin,
    filters.powerMax,
    filters.priorityOnly,
    filters.contactOnly,
  ]);

  // Reset display count when filters change
  useEffect(() => {
    void filtersKey;
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filtersKey]);

  const activeFilterCount =
    filters.types.length +
    filters.damageClasses.length +
    filters.generations.length +
    (filters.powerMin !== null || filters.powerMax !== null ? 1 : 0) +
    (filters.priorityOnly ? 1 : 0) +
    (filters.contactOnly ? 1 : 0);

  const toggleType = (type: PokemonType) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  const toggleDamageClass = (dc: DamageClass) => {
    setFilters((prev) => ({
      ...prev,
      damageClasses: prev.damageClasses.includes(dc)
        ? prev.damageClasses.filter((d) => d !== dc)
        : [...prev.damageClasses, dc],
    }));
  };

  const toggleGeneration = (gen: string) => {
    setFilters((prev) => ({
      ...prev,
      generations: prev.generations.includes(gen)
        ? prev.generations.filter((g) => g !== gen)
        : [...prev.generations, gen],
    }));
  };

  const setPowerRange = (min: number | null, max: number | null) => {
    setFilters((prev) => ({
      ...prev,
      powerMin: min,
      powerMax: max,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      types: [],
      damageClasses: [],
      generations: [],
      powerMin: null,
      powerMax: null,
      priorityOnly: false,
      contactOnly: false,
    });
  };

  return (
    <div className="p-4 md:p-6">
      {/* Search & Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search moves..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors",
              showFilters && "bg-muted",
            )}
          >
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 border rounded-lg space-y-4">
            {/* Types */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Type</Label>
                {filters.types.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, types: [] }))
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {availableTypes.map((type) => (
                  <TypeFilterButton
                    key={type}
                    type={type}
                    selected={filters.types.includes(type)}
                    onClick={() => toggleType(type)}
                  />
                ))}
              </div>
            </div>

            {/* Damage Class */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Category</Label>
                {filters.damageClasses.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, damageClasses: [] }))
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {DAMAGE_CLASSES.map((dc) => (
                  <button
                    key={dc}
                    type="button"
                    onClick={() => toggleDamageClass(dc)}
                    className={cn(
                      "px-3 py-1 text-xs border rounded-full capitalize transition-colors",
                      filters.damageClasses.includes(dc)
                        ? "bg-foreground text-background border-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {dc}
                  </button>
                ))}
              </div>
            </div>

            {/* Generation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Generation</Label>
                {filters.generations.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, generations: [] }))
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {GENERATIONS.filter(
                  (gen) => gen.num <= (preferredGeneration ?? LATEST_GEN),
                ).map((gen) => (
                  <button
                    key={gen.id}
                    type="button"
                    onClick={() => toggleGeneration(gen.id)}
                    className={cn(
                      "px-3 py-1 text-xs border rounded-full transition-colors",
                      filters.generations.includes(gen.id)
                        ? "bg-foreground text-background border-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {gen.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Power Range */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Power</Label>
                {(filters.powerMin !== null || filters.powerMax !== null) && (
                  <button
                    type="button"
                    onClick={() => setPowerRange(null, null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {POWER_PRESETS.map((preset) => {
                  const isActive =
                    filters.powerMin === preset.min &&
                    filters.powerMax === preset.max;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPowerRange(preset.min, preset.max)}
                      className={cn(
                        "px-3 py-1 text-xs border rounded-full transition-colors",
                        isActive
                          ? "bg-foreground text-background border-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Filters */}
            <div className="space-y-2">
              <Label>Special</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      priorityOnly: !prev.priorityOnly,
                    }))
                  }
                  className={cn(
                    "px-3 py-1 text-xs border rounded-full transition-colors",
                    filters.priorityOnly
                      ? "bg-foreground text-background border-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  Priority moves
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      contactOnly: !prev.contactOnly,
                    }))
                  }
                  className={cn(
                    "px-3 py-1 text-xs border rounded-full transition-colors",
                    filters.contactOnly
                      ? "bg-foreground text-background border-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  Contact moves
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">
          Showing {Math.min(displayCount, filteredMoves.length)} of{" "}
          {filteredMoves.length} moves
        </p>
      </div>

      {/* Moves List */}
      <div>
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr,80px,70px,70px,50px,100px] gap-2 px-4 py-2 bg-muted text-xs text-muted-foreground font-medium">
            <span>Name</span>
            <span>Type</span>
            <span className="text-right">Power</span>
            <span className="text-right">Acc</span>
            <span className="text-right">PP</span>
            <span className="text-center">Category</span>
          </div>

          {/* Rows */}
          {filteredMoves.slice(0, displayCount).map((move) => (
            <MoveRow key={move.id} move={move} />
          ))}

          {filteredMoves.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No moves found matching your filters
            </div>
          )}
        </div>

        {/* Infinite scroll trigger */}
        {displayCount < filteredMoves.length && (
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            <span className="text-xs text-muted-foreground">
              Loading more...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

function TypeFilterButton({
  type,
  selected,
  onClick,
}: {
  type: PokemonType;
  selected: boolean;
  onClick: () => void;
}) {
  const color = TYPE_COLORS[type];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[10px] px-2 py-0.5 uppercase tracking-wider rounded transition-all",
        selected
          ? "ring-2 ring-offset-1 ring-offset-background"
          : "opacity-60 hover:opacity-100",
      )}
      style={{
        backgroundColor: `${color}20`,
        color,
        // @ts-expect-error - CSS custom property for Tailwind ring color
        "--tw-ring-color": color,
      }}
    >
      {type}
    </button>
  );
}

function MoveRow({ move }: { move: MoveListItem }) {
  const color = TYPE_COLORS[move.type];
  const slug = toID(move.name);

  return (
    <Link
      href={`/moves/${slug}`}
      className="grid grid-cols-[1fr,80px,70px,70px,50px,100px] gap-2 px-4 py-2 text-sm border-t hover:bg-muted/50 transition-colors"
    >
      <span className="font-medium truncate">{move.name}</span>
      <span
        className="text-[10px] px-1.5 py-0.5 uppercase tracking-wider rounded self-center w-fit"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {move.type}
      </span>
      <span className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
        {move.power ?? "—"}
      </span>
      <span className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
        {move.accuracy ? `${move.accuracy}%` : "—"}
      </span>
      <span className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
        {move.pp}
      </span>
      <span className="text-center text-xs text-muted-foreground capitalize whitespace-nowrap">
        {move.damageClass}
      </span>
    </Link>
  );
}
