"use client"

import { useMemo } from "react"
import Link from "next/link"
import { X, Plus, ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TypeBadge } from "@/components/pokemon/type-badge"
import { useComparison } from "@/hooks/use-comparison"
import { usePokemon } from "@/hooks/use-pokemon"
import { calculateTypeEffectiveness } from "@/lib/pokeapi"
import { cn } from "@/lib/utils"
import type { Pokemon, PokemonStat, TypeEffectiveness } from "@/types/pokemon"

export default function ComparisonPage() {
  const { comparison, isLoaded, removeFromComparison, clearComparison } = useComparison()

  if (!isLoaded) {
    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ComparisonCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (comparison.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">no pokemon to compare</p>
          <p className="text-xs text-muted-foreground mt-1">
            click the compare icon on any pokemon to add it
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4 mr-2" />
              browse pokemon
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium">
          comparing {comparison.length} pokemon
        </h1>
        <Button variant="ghost" size="sm" onClick={clearComparison}>
          clear all
        </Button>
      </div>

      {/* Comparison Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-4 min-w-full">
          {comparison.map((id) => (
            <ComparisonCard
              key={id}
              pokemonId={id}
              onRemove={() => removeFromComparison(id)}
            />
          ))}
          {comparison.length < 6 && (
            <AddMoreCard />
          )}
        </div>
      </div>

      {/* Stats Comparison Table */}
      {comparison.length >= 2 && (
        <StatsComparisonTable pokemonIds={comparison} />
      )}
    </div>
  )
}

function ComparisonCard({
  pokemonId,
  onRemove,
}: {
  pokemonId: number
  onRemove: () => void
}) {
  const { data: pokemon, isLoading } = usePokemon(pokemonId.toString())

  const typeEffectiveness = useMemo(() => {
    if (!pokemon) return null
    return calculateTypeEffectiveness(pokemon.types)
  }, [pokemon])

  if (isLoading || !pokemon) {
    return <ComparisonCardSkeleton />
  }

  const total = pokemon.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <Card className="w-64 flex-shrink-0 p-4 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <Link href={`/pokemon/${pokemon.id}`} className="block">
        <div className="flex flex-col items-center mb-4">
          <span className="text-xs text-muted-foreground tabular-nums">
            #{pokemon.id.toString().padStart(3, "0")}
          </span>
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="size-24 pixelated"
            loading="lazy"
          />
          <h3 className="text-sm font-medium mt-1">{pokemon.name}</h3>
          <div className="flex gap-1 mt-1">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
            ))}
          </div>
        </div>
      </Link>

      {/* Physical Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-muted-foreground">Height</div>
          <div className="font-medium">{(pokemon.height / 10).toFixed(1)}m</div>
        </div>
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-muted-foreground">Weight</div>
          <div className="font-medium">{(pokemon.weight / 10).toFixed(1)}kg</div>
        </div>
      </div>

      {/* Base Stats */}
      <div className="mb-3">
        <Label>base stats</Label>
        <div className="space-y-1 mt-1">
          {pokemon.stats.map((stat) => (
            <StatRow key={stat.name} stat={stat} />
          ))}
          <div className="flex justify-between pt-1 border-t text-xs">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium tabular-nums">{total}</span>
          </div>
        </div>
      </div>

      {/* Abilities */}
      <div className="mb-3">
        <Label>abilities</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {pokemon.abilities.map((ability) => (
            <span
              key={ability.name}
              className={cn(
                "text-[10px] px-1.5 py-0.5 border rounded",
                ability.isHidden && "text-muted-foreground border-dashed"
              )}
            >
              {ability.name}
              {ability.isHidden && " (H)"}
            </span>
          ))}
        </div>
      </div>

      {/* Type Effectiveness */}
      {typeEffectiveness && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>weak to</Label>
            <div className="flex flex-wrap gap-0.5 mt-1">
              {typeEffectiveness.weaknesses.length > 0 ? (
                typeEffectiveness.weaknesses.map(({ type, multiplier }) => (
                  <TypeBadge key={type} type={type} multiplier={multiplier} size="sm" />
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground">None</span>
              )}
            </div>
          </div>
          <div>
            <Label>resists</Label>
            <div className="flex flex-wrap gap-0.5 mt-1">
              {typeEffectiveness.resistances.length > 0 || typeEffectiveness.immunities.length > 0 ? (
                <>
                  {typeEffectiveness.resistances.map(({ type, multiplier }) => (
                    <TypeBadge key={type} type={type} multiplier={multiplier} size="sm" />
                  ))}
                  {typeEffectiveness.immunities.map((type) => (
                    <TypeBadge key={type} type={type} multiplier={0} size="sm" />
                  ))}
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function AddMoreCard() {
  return (
    <Link href="/" className="block">
      <Card className="w-64 flex-shrink-0 p-4 h-full min-h-[400px] flex flex-col items-center justify-center border-dashed hover:bg-muted/50 transition-colors">
        <Plus className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">add pokemon</p>
      </Card>
    </Link>
  )
}

function StatRow({ stat }: { stat: PokemonStat }) {
  const percentage = Math.min((stat.value / 255) * 100, 100)
  const barColor = percentage > 75 ? "#22c55e" : percentage > 50 ? "#eab308" : "#ef4444"

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-10 text-muted-foreground truncate">{stat.name}</span>
      <span className="w-6 text-right tabular-nums">{stat.value}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
      {children}
    </span>
  )
}

function ComparisonCardSkeleton() {
  return (
    <Card className="w-64 flex-shrink-0 p-4">
      <div className="flex flex-col items-center mb-4">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="size-24 mt-2" />
        <Skeleton className="h-4 w-20 mt-2" />
        <div className="flex gap-1 mt-1">
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </Card>
  )
}

// Stats Comparison Table for side-by-side stat comparison
function StatsComparisonTable({ pokemonIds }: { pokemonIds: number[] }) {
  return (
    <Card className="mt-6 p-4 overflow-x-auto">
      <h2 className="text-sm font-medium mb-4">stats comparison</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 text-muted-foreground font-normal">Stat</th>
            {pokemonIds.map((id) => (
              <PokemonTableHeader key={id} pokemonId={id} />
            ))}
          </tr>
        </thead>
        <tbody>
          <StatsComparisonRows pokemonIds={pokemonIds} />
        </tbody>
      </table>
    </Card>
  )
}

function PokemonTableHeader({ pokemonId }: { pokemonId: number }) {
  const { data: pokemon } = usePokemon(pokemonId.toString())

  if (!pokemon) {
    return <th className="text-center py-2 px-2"><Skeleton className="h-4 w-16 mx-auto" /></th>
  }

  return (
    <th className="text-center py-2 px-2 font-normal">
      <div className="flex flex-col items-center gap-1">
        <img src={pokemon.sprite} alt={pokemon.name} className="size-8 pixelated" />
        <span className="font-medium">{pokemon.name}</span>
      </div>
    </th>
  )
}

function StatsComparisonRows({ pokemonIds }: { pokemonIds: number[] }) {
  const pokemonQueries = pokemonIds.map(id => usePokemon(id.toString()))
  const allLoaded = pokemonQueries.every(q => q.data)

  const statNames = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"]

  if (!allLoaded) {
    return (
      <>
        {statNames.map((stat) => (
          <tr key={stat} className="border-b last:border-0">
            <td className="py-2 pr-4 text-muted-foreground">{stat}</td>
            {pokemonIds.map((id) => (
              <td key={id} className="text-center py-2 px-2">
                <Skeleton className="h-4 w-8 mx-auto" />
              </td>
            ))}
          </tr>
        ))}
      </>
    )
  }

  const pokemonData = pokemonQueries.map(q => q.data!)

  // Find highest stat for each row
  const getHighestIndex = (statIndex: number) => {
    let maxVal = -1
    let maxIdx = -1
    pokemonData.forEach((p, i) => {
      if (p.stats[statIndex].value > maxVal) {
        maxVal = p.stats[statIndex].value
        maxIdx = i
      }
    })
    return maxIdx
  }

  const totals = pokemonData.map(p => p.stats.reduce((sum, s) => sum + s.value, 0))
  const maxTotalIdx = totals.indexOf(Math.max(...totals))

  return (
    <>
      {statNames.map((statName, statIndex) => {
        const highestIdx = getHighestIndex(statIndex)
        return (
          <tr key={statName} className="border-b">
            <td className="py-2 pr-4 text-muted-foreground">{statName}</td>
            {pokemonData.map((pokemon, idx) => (
              <td
                key={pokemon.id}
                className={cn(
                  "text-center py-2 px-2 tabular-nums",
                  idx === highestIdx && "font-medium text-green-600 dark:text-green-400"
                )}
              >
                {pokemon.stats[statIndex].value}
              </td>
            ))}
          </tr>
        )
      })}
      <tr className="border-t-2">
        <td className="py-2 pr-4 font-medium">Total</td>
        {pokemonData.map((pokemon, idx) => (
          <td
            key={pokemon.id}
            className={cn(
              "text-center py-2 px-2 tabular-nums font-medium",
              idx === maxTotalIdx && "text-green-600 dark:text-green-400"
            )}
          >
            {totals[idx]}
          </td>
        ))}
      </tr>
    </>
  )
}
