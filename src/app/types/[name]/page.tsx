"use client"

import { use, useState, useMemo } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useFullTypeDetail } from "@/hooks/use-pokemon"
import { TYPE_COLORS } from "@/types/pokemon"
import { AddToListDialog } from "@/components/add-to-list-dialog"
import type { PokemonType, TypePokemon } from "@/types/pokemon"

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

export default function TypeDetailPage({ params }: PageProps) {
  const { name } = use(params)
  const { data: type, isLoading, error } = useFullTypeDetail(name)

  if (isLoading) {
    return <TypeDetailSkeleton />
  }

  if (error || !type) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Type not found</p>
        </div>
      </div>
    )
  }

  const color = TYPE_COLORS[type.name]

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="text-sm px-3 py-1.5 uppercase tracking-wider rounded font-medium"
              style={{ backgroundColor: color, color: "#fff" }}
            >
              {type.name}
            </span>
            <AddToListDialog
              itemType="type"
              itemId={name}
              itemName={type.name}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Introduced in {type.generation}
          </p>
        </section>

        {/* Damage Relations */}
        <section className="space-y-4">
          <Label>when attacking</Label>
          <div className="grid gap-3">
            <DamageRow
              label="Super effective (2x)"
              types={type.damageRelations.doubleDamageTo}
              emptyText="None"
            />
            <DamageRow
              label="Not very effective (0.5x)"
              types={type.damageRelations.halfDamageTo}
              emptyText="None"
            />
            <DamageRow
              label="No effect (0x)"
              types={type.damageRelations.noDamageTo}
              emptyText="None"
            />
          </div>
        </section>

        <section className="space-y-4">
          <Label>when defending</Label>
          <div className="grid gap-3">
            <DamageRow
              label="Weak to (2x)"
              types={type.damageRelations.doubleDamageFrom}
              emptyText="None"
            />
            <DamageRow
              label="Resists (0.5x)"
              types={type.damageRelations.halfDamageFrom}
              emptyText="None"
            />
            <DamageRow
              label="Immune to (0x)"
              types={type.damageRelations.noDamageFrom}
              emptyText="None"
            />
          </div>
        </section>

        {/* Pokemon of this type */}
        <PokemonSection pokemon={type.pokemon} typeName={type.name} />
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

function DamageRow({
  label,
  types,
  emptyText,
}: {
  label: string
  types: PokemonType[]
  emptyText: string
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {types.length > 0 ? (
          types.map((t) => (
            <Link
              key={t}
              href={`/types/${t}`}
              className="text-[10px] px-2 py-0.5 uppercase tracking-wider rounded hover:opacity-80 transition-opacity"
              style={{ backgroundColor: `${TYPE_COLORS[t]}20`, color: TYPE_COLORS[t] }}
            >
              {t}
            </Link>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">{emptyText}</span>
        )}
      </div>
    </div>
  )
}

function PokemonSection({ pokemon, typeName }: { pokemon: TypePokemon[]; typeName: string }) {
  const [search, setSearch] = useState("")
  const [selectedGens, setSelectedGens] = useState<string[]>([])
  const [slotFilter, setSlotFilter] = useState<1 | 2 | null>(null)

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

      // Slot filter (primary/secondary)
      if (slotFilter !== null && poke.slot !== slotFilter) {
        return false
      }

      return true
    })
  }, [pokemon, search, selectedGens, slotFilter])

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
    setSlotFilter(null)
  }

  const hasFilters = search || selectedGens.length > 0 || slotFilter !== null

  const primaryCount = pokemon.filter((p) => p.slot === 1).length
  const secondaryCount = pokemon.filter((p) => p.slot === 2).length

  return (
    <section className="space-y-4">
      <Label>{typeName} type pokemon</Label>

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

        {/* Type slot filter */}
        {primaryCount > 0 && secondaryCount > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSlotFilter(slotFilter === null ? null : null)}
              className={cn(
                "px-2 py-1 text-[10px] border rounded transition-colors",
                slotFilter === null
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted"
              )}
            >
              All ({pokemon.length})
            </button>
            <button
              type="button"
              onClick={() => setSlotFilter(slotFilter === 1 ? null : 1)}
              className={cn(
                "px-2 py-1 text-[10px] border rounded transition-colors",
                slotFilter === 1
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted"
              )}
            >
              Primary ({primaryCount})
            </button>
            <button
              type="button"
              onClick={() => setSlotFilter(slotFilter === 2 ? null : 2)}
              className={cn(
                "px-2 py-1 text-[10px] border border-dashed rounded transition-colors",
                slotFilter === 2
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted"
              )}
            >
              Secondary ({secondaryCount})
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
            Showing {filteredPokemon.length} of {pokemon.length} Pokemon
          </>
        ) : (
          <>{pokemon.length} Pokemon are {typeName} type</>
        )}
      </p>

      {/* Pokemon grid */}
      {sortedPokemon.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {sortedPokemon.map((poke) => (
            <Link
              key={poke.id}
              href={`/pokemon/${poke.id}`}
              className={cn(
                "flex flex-col items-center p-2 rounded hover:bg-muted transition-colors group",
                poke.slot === 2 && "border border-dashed border-muted-foreground/30"
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
          No Pokemon match your filters
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No Pokemon have this type.</p>
      )}
    </section>
  )
}

function TypeDetailSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto space-y-6">
        <section className="space-y-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-40" />
        </section>

        <section className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {Array.from({ length: 40 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
