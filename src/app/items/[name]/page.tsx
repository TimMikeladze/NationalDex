"use client"

import { use, useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useFullItemDetail } from "@/hooks/use-pokemon"
import { ITEM_POCKET_COLORS, ITEM_POCKET_LABELS } from "@/types/pokemon"
import { AddToListDialog } from "@/components/add-to-list-dialog"
import type { ItemHeldByPokemon } from "@/types/pokemon"

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

export default function ItemDetailPage({ params }: PageProps) {
  const { name } = use(params)
  const { data: item, isLoading, error } = useFullItemDetail(name)

  if (isLoading) {
    return <ItemDetailSkeleton />
  }

  if (error || !item) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Item not found</p>
        </div>
      </div>
    )
  }

  const pocketColor = ITEM_POCKET_COLORS[item.pocket]

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <section className="space-y-3">
          <div className="flex items-center gap-4">
            {item.sprite && (
              <div className="size-16 relative">
                <Image
                  src={item.sprite}
                  alt={item.name}
                  fill
                  className="object-contain pixelated"
                  unoptimized
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-medium">{item.name}</h1>
                <AddToListDialog
                  itemType="item"
                  itemId={name}
                  itemName={item.name}
                  itemSprite={item.sprite}
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] px-2 py-0.5 uppercase tracking-wider rounded"
                  style={{ backgroundColor: `${pocketColor}20`, color: pocketColor }}
                >
                  {ITEM_POCKET_LABELS[item.pocket]}
                </span>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </div>
            </div>
          </div>
          {item.shortDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              {item.shortDescription}
            </p>
          )}
          {item.description && (
            <p className="text-sm leading-relaxed">{item.description}</p>
          )}
        </section>

        {/* Stats Grid */}
        <section className="space-y-3">
          <Label>details</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="Cost"
              value={item.cost > 0 ? `₽${item.cost.toLocaleString()}` : "Not for sale"}
            />
            <StatCard label="Category" value={item.category} />
            <StatCard label="Pocket" value={ITEM_POCKET_LABELS[item.pocket]} />
            {item.flingPower && (
              <StatCard label="Fling Power" value={item.flingPower.toString()} />
            )}
          </div>
        </section>

        {/* Fling Effect */}
        {item.flingEffect && (
          <section className="space-y-3">
            <Label>fling effect</Label>
            <div className="p-3 border rounded-lg">
              <span className="font-medium">{item.flingEffect.name}</span>
              <p className="text-sm text-muted-foreground mt-1">
                {item.flingEffect.description}
              </p>
            </div>
          </section>
        )}

        {/* Attributes */}
        {item.attributes.length > 0 && (
          <section className="space-y-3">
            <Label>attributes</Label>
            <div className="flex flex-wrap gap-2">
              {item.attributes.map((attr) => (
                <span
                  key={attr}
                  className="px-2 py-1 text-xs border rounded-full"
                >
                  {attr}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Game Availability */}
        {item.gameIndices.length > 0 && (
          <section className="space-y-3">
            <Label>available in</Label>
            <div className="flex flex-wrap gap-2">
              {[...new Set(item.gameIndices.map((g) => g.generation))].map((gen) => (
                <span
                  key={gen}
                  className="px-2 py-1 text-xs bg-muted rounded"
                >
                  {gen}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Pokemon that hold this item */}
        {item.heldByPokemon.length > 0 && (
          <PokemonSection pokemon={item.heldByPokemon} itemName={item.name} />
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
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
      {children}
    </span>
  )
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="p-3 border rounded-lg">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
        {label}
      </span>
      <span className={cn("text-lg font-medium", className)}>{value}</span>
    </div>
  )
}

function PokemonSection({
  pokemon,
  itemName,
}: {
  pokemon: ItemHeldByPokemon[]
  itemName: string
}) {
  const [search, setSearch] = useState("")
  const [selectedGens, setSelectedGens] = useState<string[]>([])

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

      return true
    })
  }, [pokemon, search, selectedGens])

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
  }

  const hasFilters = search || selectedGens.length > 0

  return (
    <section className="space-y-4">
      <Label>pokemon that may hold {itemName}</Label>

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
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {hasFilters ? (
          <>
            Showing {filteredPokemon.length} of {pokemon.length} Pokémon
          </>
        ) : (
          <>{pokemon.length} Pokémon may hold this item in the wild</>
        )}
      </p>

      {/* Pokemon grid */}
      {sortedPokemon.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 md:gap-3">
          {sortedPokemon.map((poke) => (
            <Link
              key={poke.id}
              href={`/pokemon/${poke.id}`}
              className="flex flex-col items-center p-2 md:p-3 rounded hover:bg-muted transition-colors group"
            >
              <img
                src={poke.sprite}
                alt={poke.name}
                className="size-12 md:size-16 lg:size-20 pixelated group-hover:scale-110 transition-transform"
                loading="lazy"
              />
              <span className="text-[10px] md:text-xs text-muted-foreground truncate max-w-full">
                #{poke.id.toString().padStart(3, "0")}
              </span>
              {poke.rarity > 0 && (
                <span className="text-[9px] text-muted-foreground">
                  {poke.rarity}%
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : hasFilters ? (
        <p className="text-sm text-muted-foreground py-4">
          No Pokémon match your filters
        </p>
      ) : null}
    </section>
  )
}

function ItemDetailSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </section>

        <section className="space-y-3">
          <Skeleton className="h-3 w-12" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 md:gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-20 md:h-24 lg:h-28 w-full" />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
