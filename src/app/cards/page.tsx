"use client";

import { ChevronsUpDown, Filter, Layers, Search, X } from "lucide-react";
import Link from "next/link";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TcgCardGrid } from "@/components/tcg";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CARDS_PER_PAGE,
  usePocketSetIds,
  useTcgCardSearch,
  useTcgRarities,
  useTcgSets,
  useTcgStages,
} from "@/hooks/use-tcg";
import { resolveSpecies } from "@/lib/pkmn";
import type { TcgSortField, TcgSortOrder } from "@/lib/tcg";
import { cn } from "@/lib/utils";
import type { TcgGame } from "@/types/tcg";
import {
  gameForSetId,
  TCG_CATEGORIES,
  TCG_ENERGY_COLORS,
  TCG_ENERGY_TYPES,
  TCG_GAME_FULL_LABELS,
} from "@/types/tcg";

type GameFilter = "all" | TcgGame;

const GAME_OPTIONS: { id: GameFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tcg", label: TCG_GAME_FULL_LABELS.tcg },
  { id: "pocket", label: TCG_GAME_FULL_LABELS.pocket },
];

const HP_PRESETS = [
  { label: "Any", min: null, max: null },
  { label: "≤ 60", min: null, max: 60 },
  { label: "70-120", min: 70, max: 120 },
  { label: "130-200", min: 130, max: 200 },
  { label: "210+", min: 210, max: null },
];

const SORT_OPTIONS: {
  value: string;
  label: string;
  field: TcgSortField | null;
  order: TcgSortOrder;
}[] = [
  { value: "default", label: "Set order", field: null, order: "ASC" },
  { value: "name-asc", label: "Name A-Z", field: "name", order: "ASC" },
  { value: "name-desc", label: "Name Z-A", field: "name", order: "DESC" },
  { value: "hp-desc", label: "HP high to low", field: "hp", order: "DESC" },
  { value: "hp-asc", label: "HP low to high", field: "hp", order: "ASC" },
  { value: "id-asc", label: "Card ID", field: "id", order: "ASC" },
];

export default function CardsPage() {
  return (
    <Suspense fallback={<CardsPageSkeleton />}>
      <CardsBrowser />
    </Suspense>
  );
}

function CardsPageSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mb-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-7 w-64" />
      </div>
      <TcgCardGrid cards={[]} isLoading skeletonCount={CARDS_PER_PAGE} />
    </div>
  );
}

/** Filters live in the URL, so a card search can be shared or bookmarked. */
function CardsBrowser() {
  const [filters, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      game: parseAsString.withDefault("all"),
      set: parseAsString.withDefault(""),
      types: parseAsArrayOf(parseAsString).withDefault([]),
      rarities: parseAsArrayOf(parseAsString).withDefault([]),
      category: parseAsString.withDefault(""),
      stage: parseAsString.withDefault(""),
      illustrator: parseAsString.withDefault(""),
      hpMin: parseAsInteger,
      hpMax: parseAsInteger,
      dexId: parseAsInteger,
      sort: parseAsString.withDefault("default"),
    },
    { history: "replace", clearOnDefault: true },
  );

  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.q);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const pocketSetIds = usePocketSetIds();
  const { data: sets } = useTcgSets();
  const { data: rarities } = useTcgRarities();
  const { data: stages } = useTcgStages();

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== filters.q) {
        void setFilters({ q: searchInput || null });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, filters.q, setFilters]);

  const sortOption =
    SORT_OPTIONS.find((option) => option.value === filters.sort) ??
    SORT_OPTIONS[0];

  const game: GameFilter = (["all", "tcg", "pocket"] as const).includes(
    filters.game as GameFilter,
  )
    ? (filters.game as GameFilter)
    : "all";

  const searchFilters = useMemo(
    () => ({
      name: filters.q || undefined,
      game: game === "all" ? null : game,
      setIds: filters.set ? [filters.set] : undefined,
      types: filters.types.length > 0 ? filters.types : undefined,
      rarities: filters.rarities.length > 0 ? filters.rarities : undefined,
      category: filters.category || null,
      stage: filters.stage || null,
      illustrator: filters.illustrator || null,
      dexId: filters.dexId,
      hpMin: filters.hpMin,
      hpMax: filters.hpMax,
      sortField: sortOption.field,
      sortOrder: sortOption.order,
    }),
    [
      filters.q,
      filters.set,
      filters.types,
      filters.rarities,
      filters.category,
      filters.stage,
      filters.illustrator,
      filters.dexId,
      filters.hpMin,
      filters.hpMax,
      game,
      sortOption,
    ],
  );

  const {
    cards,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = useTcgCardSearch(searchFilters);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0,
      rootMargin: "400px",
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  const selectedSet = useMemo(
    () => sets?.find((set) => set.id === filters.set) ?? null,
    [sets, filters.set],
  );

  // Sets narrow to the chosen game so the picker matches the rest of the page.
  const availableSets = useMemo(() => {
    if (!sets) return [];
    if (game === "all") return sets;
    return sets.filter((set) => gameForSetId(set.id, pocketSetIds) === game);
  }, [sets, game, pocketSetIds]);

  const crossReferencedPokemon = useMemo(() => {
    if (filters.dexId === null) return null;
    const species = resolveSpecies(filters.dexId);
    return species ? { name: species.name, id: species.num } : null;
  }, [filters.dexId]);

  const activeFilterCount =
    (filters.set ? 1 : 0) +
    filters.types.length +
    filters.rarities.length +
    (filters.category ? 1 : 0) +
    (filters.stage ? 1 : 0) +
    (filters.illustrator ? 1 : 0) +
    (filters.hpMin !== null || filters.hpMax !== null ? 1 : 0) +
    (filters.dexId !== null ? 1 : 0);

  const toggleArrayFilter = (key: "types" | "rarities", value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    void setFilters({ [key]: next.length > 0 ? next : null });
  };

  const clearFilters = () => {
    void setFilters({
      set: null,
      types: null,
      rarities: null,
      category: null,
      stage: null,
      illustrator: null,
      hpMin: null,
      hpMax: null,
      dexId: null,
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mb-6 space-y-4">
        {/* Search + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
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
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted",
              showFilters && "bg-muted",
            )}
          >
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
          <Button asChild variant="outline" size="sm" className="h-auto">
            <Link href="/cards/sets">
              <Layers className="size-4" />
              <span className="hidden sm:inline">sets</span>
            </Link>
          </Button>
        </div>

        {/* Game switch + sort */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {GAME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  void setFilters({
                    game: option.id === "all" ? null : option.id,
                    // A set from the other game would contradict the switch.
                    set: null,
                  })
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  game === option.id
                    ? "border-foreground bg-foreground text-background"
                    : "hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Select
            value={filters.sort}
            onValueChange={(value) =>
              void setFilters({ sort: value === "default" ? null : value })
            }
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cross-reference chip when arriving from a Pokemon page */}
        {crossReferencedPokemon && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Showing cards of
            </span>
            <Link
              href={`/pokemon/${crossReferencedPokemon.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
              className="text-xs font-medium hover:underline"
            >
              {crossReferencedPokemon.name} #
              {crossReferencedPokemon.id.toString().padStart(3, "0")}
            </Link>
            <button
              type="button"
              onClick={() => void setFilters({ dexId: null })}
              className="ml-auto text-muted-foreground hover:text-foreground"
              title="Clear Pokemon filter"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Filter panel */}
        {showFilters && (
          <div className="space-y-4 rounded-lg border p-4">
            {/* Set */}
            <div className="space-y-2">
              <FilterLabel>Set</FilterLabel>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between sm:w-72"
                    >
                      <span className="truncate">
                        {selectedSet ? selectedSet.name : "Any set"}
                      </span>
                      <ChevronsUpDown className="size-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 p-0">
                    <Command>
                      <CommandInput placeholder="Find a set..." />
                      <CommandList>
                        <CommandEmpty>No sets found</CommandEmpty>
                        <CommandGroup>
                          {availableSets.map((set) => (
                            <CommandItem
                              key={set.id}
                              value={`${set.name} ${set.id}`}
                              onSelect={() =>
                                void setFilters({
                                  set: set.id === filters.set ? null : set.id,
                                })
                              }
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">{set.name}</span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {set.cardCount.official}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedSet && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void setFilters({ set: null })}
                    >
                      Clear
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/cards/sets/${selectedSet.id.toLowerCase()}`}
                      >
                        View set
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Energy types */}
            <div className="space-y-2">
              <FilterHeader
                label="Energy type"
                onClear={
                  filters.types.length > 0
                    ? () => void setFilters({ types: null })
                    : undefined
                }
              />
              <div className="flex flex-wrap gap-1">
                {TCG_ENERGY_TYPES.map((type) => {
                  const color = TCG_ENERGY_COLORS[type];
                  const selected = filters.types.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleArrayFilter("types", type)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] uppercase tracking-wider transition-all",
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
                })}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <FilterHeader
                label="Category"
                onClear={
                  filters.category
                    ? () => void setFilters({ category: null })
                    : undefined
                }
              />
              <div className="flex flex-wrap gap-2">
                {TCG_CATEGORIES.map((category) => (
                  <ChipButton
                    key={category}
                    selected={filters.category === category}
                    onClick={() =>
                      void setFilters({
                        category:
                          filters.category === category ? null : category,
                      })
                    }
                  >
                    {category}
                  </ChipButton>
                ))}
              </div>
            </div>

            {/* Rarity */}
            {rarities && rarities.length > 0 && (
              <div className="space-y-2">
                <FilterHeader
                  label="Rarity"
                  onClear={
                    filters.rarities.length > 0
                      ? () => void setFilters({ rarities: null })
                      : undefined
                  }
                />
                <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                  {rarities.map((rarity) => (
                    <ChipButton
                      key={rarity}
                      selected={filters.rarities.includes(rarity)}
                      onClick={() => toggleArrayFilter("rarities", rarity)}
                    >
                      {rarity}
                    </ChipButton>
                  ))}
                </div>
              </div>
            )}

            {/* Stage */}
            {stages && stages.length > 0 && (
              <div className="space-y-2">
                <FilterHeader
                  label="Stage"
                  onClear={
                    filters.stage
                      ? () => void setFilters({ stage: null })
                      : undefined
                  }
                />
                <div className="flex flex-wrap gap-2">
                  {stages.map((stage) => (
                    <ChipButton
                      key={stage}
                      selected={filters.stage === stage}
                      onClick={() =>
                        void setFilters({
                          stage: filters.stage === stage ? null : stage,
                        })
                      }
                    >
                      {stage}
                    </ChipButton>
                  ))}
                </div>
              </div>
            )}

            {/* HP */}
            <div className="space-y-2">
              <FilterHeader
                label="HP"
                onClear={
                  filters.hpMin !== null || filters.hpMax !== null
                    ? () => void setFilters({ hpMin: null, hpMax: null })
                    : undefined
                }
              />
              <div className="flex flex-wrap gap-2">
                {HP_PRESETS.map((preset) => (
                  <ChipButton
                    key={preset.label}
                    selected={
                      filters.hpMin === preset.min &&
                      filters.hpMax === preset.max
                    }
                    onClick={() =>
                      void setFilters({
                        hpMin: preset.min,
                        hpMax: preset.max,
                      })
                    }
                  >
                    {preset.label}
                  </ChipButton>
                ))}
              </div>
            </div>

            {/* Illustrator */}
            <div className="space-y-2">
              <FilterLabel>Illustrator</FilterLabel>
              <input
                type="text"
                placeholder="Any illustrator"
                defaultValue={filters.illustrator}
                onBlur={(e) =>
                  void setFilters({ illustrator: e.target.value || null })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void setFilters({
                      illustrator: e.currentTarget.value || null,
                    });
                  }
                }}
                className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:w-72"
              />
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

      {/* Results */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">
          {isLoading && cards.length === 0
            ? "Loading cards..."
            : `Showing ${cards.length} card${cards.length === 1 ? "" : "s"}${
                hasNextPage ? "+" : ""
              }`}
        </p>
      </div>

      {isError ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Could not load cards right now.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Card data comes from TCGdex — check your connection and try again.
          </p>
        </div>
      ) : (
        <>
          <TcgCardGrid
            cards={cards}
            pocketSetIds={pocketSetIds}
            showGame={game === "all"}
            isLoading={isLoading}
            skeletonCount={CARDS_PER_PAGE}
            emptyMessage="No cards match these filters"
          />

          {hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              <span className="text-xs text-muted-foreground">
                Loading more...
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function FilterHeader({
  label,
  onClear,
}: {
  label: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <FilterLabel>{label}</FilterLabel>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
