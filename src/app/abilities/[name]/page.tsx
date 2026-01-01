"use client"

import { use, useState, useMemo } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useFullAbilityDetail } from "@/hooks/use-pokemon"
import type { AbilityPokemon } from "@/types/pokemon"

// Pokemon ID ranges by generation
const GEN_RANGES = [
  { id: "gen-1", name: "Gen I", min: 1, max: 151 },
  { id: "gen-2", name: "Gen II", min: 152, max: 251 },
  { id: "gen-3", name: "Gen III", min: 252, max: 386 },
  { id: "gen-4", name: "Gen IV", min: 387, max: 493 },
  { id: "gen-5", name: "Gen V", min: 494, max: 649 },
  { id: "gen-6", name: "Gen VI", min: 650, max: 721 },
  { id: "gen-7", name: "Gen VII", min: 722, max: 809 },
  { id: "gen-8", name: "Gen VIII", min: 810, max: 905 },
  { id: "gen-9", name: "Gen IX", min: 906, max: 1025 },
] as const

function getGeneration(pokemonId: number): string | null {
  for (const gen of GEN_RANGES) {
    if (pokemonId >= gen.min && pokemonId <= gen.max) {
      return gen.id
    }
  }
  return null
}

interface PageProps {
  params: Promise<{ name: string }>
}

export default function AbilityDetailPage({ params }: PageProps) {
  const { name } = use(params)
  const { data: ability, isLoading, error } = useFullAbilityDetail(name)

  if (isLoading) {
    return <AbilityDetailSkeleton />
  }

  if (error || !ability) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Ability not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <section className="space-y-3">
          <h1 className="text-xl font-medium">{ability.name}</h1>
          <p className="text-sm leading-relaxed">{ability.shortDescription}</p>
        </section>

        {/* Full Description */}
        {ability.description && ability.description !== ability.shortDescription && (
          <section className="space-y-3">
            <Label>effect</Label>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ability.description}
            </p>
          </section>
        )}

        {/* Details */}
        <section className="space-y-3">
          <Label>details</Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <DetailRow label="Generation" value={ability.generation} />
            <DetailRow label="Main Series" value={ability.isMainSeries ? "Yes" : "No"} />
          </div>
        </section>

        {/* Pokemon with this ability */}
        <PokemonSection pokemon={ability.pokemon} abilityName={ability.name} />
      </div>
    </div>
  )
}

// ============================================================================
// Components
// ============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
      {children}
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </>
  )
}

function PokemonSection({ pokemon, abilityName }: { pokemon: AbilityPokemon[]; abilityName: string }) {
  const [search, setSearch] = useState("")
  const [selectedGens, setSelectedGens] = useState<string[]>([])
  const [showHiddenOnly, setShowHiddenOnly] = useState<boolean | null>(null) // null = all, true = hidden only, false = regular only

  const filteredPokemon = useMemo(() => {
    return pokemon.filter((poke) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesName = poke.name.toLowerCase().includes(searchLower)
        const matchesId = poke.id.toString().includes(search)
        if (!matchesName && !matchesId) {
          return false
        }
      }

      // Generation filter
      if (selectedGens.length > 0) {
        const pokeGen = getGeneration(poke.id)
        if (!pokeGen || !selectedGens.includes(pokeGen)) {
          return false
        }
      }

      // Hidden ability filter
      if (showHiddenOnly === true && !poke.isHidden) {
        return false
      }
      if (showHiddenOnly === false && poke.isHidden) {
        return false
      }

      return true
    })
  }, [pokemon, search, selectedGens, showHiddenOnly])

  const sortedPokemon = useMemo(() => {
    return [...filteredPokemon].sort((a, b) => a.id - b.id)
  }, [filteredPokemon])

  const toggleGen = (genId: string) => {
    setSelectedGens((prev) =>
      prev.includes(genId) ? prev.filter((g) => g !== genId) : [...prev, genId]
    )
  }

  const clearFilters = () => {
    setSearch("")
    setSelectedGens([])
    setShowHiddenOnly(null)
  }

  const hasFilters = search || selectedGens.length > 0 || showHiddenOnly !== null

  const normalCount = pokemon.filter((p) => !p.isHidden).length
  const hiddenCount = pokemon.filter((p) => p.isHidden).length

  return (
    <section className="space-y-4">
      <Label>pokemon with {abilityName}</Label>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Generation filters */}
        <div className="flex flex-wrap gap-1.5">
          {GEN_RANGES.map((gen) => (
            <button
              key={gen.id}
              type="button"
              onClick={() => toggleGen(gen.id)}
              className={cn(
                "px-2 py-1 text-[10px] border rounded transition-colors",
                selectedGens.includes(gen.id)
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted"
              )}
            >
              {gen.name}
            </button>
          ))}
        </div>

        {/* Ability type filter */}
        {normalCount > 0 && hiddenCount > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowHiddenOnly(showHiddenOnly === null ? null : null)}
              className={cn(
                "px-2 py-1 text-[10px] border rounded transition-colors",
                showHiddenOnly === null
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted"
              )}
            >
              All ({pokemon.length})
            </button>
            <button
              type="button"
              onClick={() => setShowHiddenOnly(showHiddenOnly === false ? null : false)}
              className={cn(
                "px-2 py-1 text-[10px] border rounded transition-colors",
                showHiddenOnly === false
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted"
              )}
            >
              Regular ({normalCount})
            </button>
            <button
              type="button"
              onClick={() => setShowHiddenOnly(showHiddenOnly === true ? null : true)}
              className={cn(
                "px-2 py-1 text-[10px] border border-dashed rounded transition-colors",
                showHiddenOnly === true
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted"
              )}
            >
              Hidden ({hiddenCount})
            </button>
          </div>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {hasFilters ? (
          <>
            Showing {filteredPokemon.length} of {pokemon.length} Pokémon
          </>
        ) : (
          <>{pokemon.length} Pokémon have this ability</>
        )}
      </p>

      {/* Pokemon grid */}
      {sortedPokemon.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {sortedPokemon.map((poke) => (
            <Link
              key={poke.id}
              href={`/pokemon/${poke.id}`}
              className={cn(
                "flex flex-col items-center p-2 rounded hover:bg-muted transition-colors group",
                poke.isHidden && "border border-dashed border-muted-foreground/30"
              )}
            >
              <img
                src={poke.sprite}
                alt={poke.name}
                className="size-12 pixelated group-hover:scale-110 transition-transform"
                loading="lazy"
              />
              <span className="text-[10px] text-muted-foreground truncate max-w-full">
                #{poke.id.toString().padStart(3, "0")}
              </span>
            </Link>
          ))}
        </div>
      ) : hasFilters ? (
        <p className="text-sm text-muted-foreground py-4">
          No Pokémon match your filters
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No Pokémon have this ability.</p>
      )}
    </section>
  )
}

function AbilityDetailSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <section className="space-y-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </section>

        <section className="space-y-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </section>

        <section className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
