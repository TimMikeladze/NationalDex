"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Search, X, Filter } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useMoveList } from "@/hooks/use-pokemon"
import { ALL_TYPES, GENERATIONS, DAMAGE_CLASSES } from "@/lib/pokeapi"
import { TYPE_COLORS } from "@/types/pokemon"
import type { PokemonType, MoveListItem } from "@/types/pokemon"

type DamageClass = "physical" | "special" | "status"

interface Filters {
  search: string
  types: PokemonType[]
  damageClasses: DamageClass[]
  generations: string[]
}

export default function MovesPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMoveList()
  const [filters, setFilters] = useState<Filters>({
    search: "",
    types: [],
    damageClasses: [],
    generations: [],
  })
  const [showFilters, setShowFilters] = useState(false)

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0,
      rootMargin: "200px",
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [handleObserver])

  // Flatten all moves from pages
  const allMoves = useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page) => page.moves)
  }, [data])

  // Apply filters client-side
  const filteredMoves = useMemo(() => {
    return allMoves.filter((move) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!move.name.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(move.type)) {
        return false
      }

      // Damage class filter
      if (filters.damageClasses.length > 0 && !filters.damageClasses.includes(move.damageClass)) {
        return false
      }

      // Generation filter
      if (filters.generations.length > 0) {
        const moveGen = move.generation.toLowerCase().replace(/\s+/g, "-")
        if (!filters.generations.includes(moveGen)) {
          return false
        }
      }

      return true
    })
  }, [allMoves, filters])

  const activeFilterCount =
    filters.types.length + filters.damageClasses.length + filters.generations.length

  const toggleType = (type: PokemonType) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }))
  }

  const toggleDamageClass = (dc: DamageClass) => {
    setFilters((prev) => ({
      ...prev,
      damageClasses: prev.damageClasses.includes(dc)
        ? prev.damageClasses.filter((d) => d !== dc)
        : [...prev.damageClasses, dc],
    }))
  }

  const toggleGeneration = (gen: string) => {
    setFilters((prev) => ({
      ...prev,
      generations: prev.generations.includes(gen)
        ? prev.generations.filter((g) => g !== gen)
        : [...prev.generations, gen],
    }))
  }

  const clearFilters = () => {
    setFilters({ search: "", types: [], damageClasses: [], generations: [] })
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Search & Filter Controls */}
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search moves..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
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
              showFilters && "bg-muted"
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
                    onClick={() => setFilters((prev) => ({ ...prev, types: [] }))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {ALL_TYPES.map((type) => (
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
                    onClick={() => setFilters((prev) => ({ ...prev, damageClasses: [] }))}
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
                        : "hover:bg-muted"
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
                    onClick={() => setFilters((prev) => ({ ...prev, generations: [] }))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {GENERATIONS.map((gen) => (
                  <button
                    key={gen.id}
                    type="button"
                    onClick={() => toggleGeneration(gen.id)}
                    className={cn(
                      "px-3 py-1 text-xs border rounded-full transition-colors",
                      filters.generations.includes(gen.id)
                        ? "bg-foreground text-background border-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {gen.name}
                  </button>
                ))}
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
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto mb-4">
        <p className="text-xs text-muted-foreground">
          {isLoading ? (
            "Loading moves..."
          ) : (
            <>
              Showing {filteredMoves.length} moves
              {data && allMoves.length < data.pages[0].count && (
                <> (loaded {allMoves.length} of {data.pages[0].count})</>
              )}
            </>
          )}
        </p>
      </div>

      {/* Moves List */}
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {isLoading ? (
          <MovesListSkeleton />
        ) : (
          <>
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
              {filteredMoves.map((move) => (
                <MoveRow key={move.id} move={move} />
              ))}

              {filteredMoves.length === 0 && !isLoading && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No moves found matching your filters
                </div>
              )}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="py-4">
              {isFetchingNextPage && (
                <div className="flex justify-center">
                  <div className="animate-spin size-5 border-2 border-muted border-t-foreground rounded-full" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Components
// ============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  )
}

function TypeFilterButton({
  type,
  selected,
  onClick,
}: {
  type: PokemonType
  selected: boolean
  onClick: () => void
}) {
  const color = TYPE_COLORS[type]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[10px] px-2 py-0.5 uppercase tracking-wider rounded transition-all",
        selected ? "ring-2 ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100"
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
  )
}

function MoveRow({ move }: { move: MoveListItem }) {
  const color = TYPE_COLORS[move.type]
  const slug = move.name.toLowerCase().replace(/\s+/g, "-")

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
      <span className="text-right tabular-nums text-muted-foreground">
        {move.power ?? "—"}
      </span>
      <span className="text-right tabular-nums text-muted-foreground">
        {move.accuracy ? `${move.accuracy}%` : "—"}
      </span>
      <span className="text-right tabular-nums text-muted-foreground">{move.pp}</span>
      <span className="text-center text-xs text-muted-foreground capitalize">
        {move.damageClass}
      </span>
    </Link>
  )
}

function MovesListSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr,80px,70px,70px,50px,100px] gap-2 px-4 py-2 bg-muted">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr,80px,70px,70px,50px,100px] gap-2 px-4 py-2 border-t"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-8 ml-auto" />
          <Skeleton className="h-5 w-10 ml-auto" />
          <Skeleton className="h-5 w-6 ml-auto" />
          <Skeleton className="h-5 w-16 mx-auto" />
        </div>
      ))}
    </div>
  )
}
