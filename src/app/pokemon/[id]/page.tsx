"use client"

import { use, useMemo } from "react"
import Link from "next/link"
import { Heart } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { usePokemonWithSpecies, usePokemonMoves, useEvolutionChain } from "@/hooks/use-pokemon"
import { useFavorites } from "@/hooks/use-favorites"
import { calculateTypeEffectiveness } from "@/lib/pokeapi"
import { TypeBadge } from "@/components/pokemon/type-badge"
import { StatBar } from "@/components/pokemon/stat-bar"
import type { PokemonType, PokemonMove, EvolutionChainLink, PokemonSpecies, Pokemon } from "@/types/pokemon"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PokemonPage({ params }: PageProps) {
  const { id } = use(params)
  const { pokemon, species, isLoading } = usePokemonWithSpecies(id)
  const { isFavorite, toggleFavorite } = useFavorites()
  const { data: moves, isLoading: movesLoading } = usePokemonMoves(id)
  const { data: evolutionChain, isLoading: evolutionLoading } = useEvolutionChain(
    species?.evolutionChainUrl ?? null
  )

  const typeEffectiveness = useMemo(() => {
    if (!pokemon) return null
    return calculateTypeEffectiveness(pokemon.types)
  }, [pokemon])

  if (isLoading || !pokemon) {
    return <PokemonPageSkeleton />
  }

  const statTotal = pokemon.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto space-y-6">
        {/* Core Header */}
        <section className="text-center space-y-3">
          <div className="flex justify-between items-start">
            <div />
            <span className="text-xs text-muted-foreground tabular-nums">
              #{pokemon.id.toString().padStart(3, "0")}
            </span>
            <button
              type="button"
              onClick={() => toggleFavorite(pokemon.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Heart
                className={cn(
                  "size-4",
                  isFavorite(pokemon.id) && "fill-current"
                )}
              />
            </button>
          </div>
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="size-32 md:size-40 lg:size-48 mx-auto pixelated"
          />
          <h1 className="text-xl font-medium">{pokemon.name}</h1>
          {species && (
            <p className="text-xs text-muted-foreground">{species.genus}</p>
          )}
          <div className="flex justify-center gap-2">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} size="default" linkable />
            ))}
          </div>
        </section>

        {/* Type Effectiveness */}
        {typeEffectiveness && (
          <section className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>weaknesses</Label>
              <div className="flex flex-wrap gap-1">
                {typeEffectiveness.weaknesses.map(({ type, multiplier }) => (
                  <TypeBadge key={type} type={type} multiplier={multiplier} size="sm" linkable />
                ))}
                {typeEffectiveness.weaknesses.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>resistances</Label>
              <div className="flex flex-wrap gap-1">
                {typeEffectiveness.resistances.map(({ type, multiplier }) => (
                  <TypeBadge key={type} type={type} multiplier={multiplier} size="sm" linkable />
                ))}
                {typeEffectiveness.immunities.map((type) => (
                  <TypeBadge key={type} type={type} multiplier={0} size="sm" linkable />
                ))}
                {typeEffectiveness.resistances.length === 0 && typeEffectiveness.immunities.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="space-y-3">
          <Label>base stats</Label>
          <div className="space-y-2">
            {pokemon.stats.map((stat) => (
              <StatBar key={stat.name} stat={stat} />
            ))}
          </div>
          <div className="flex justify-between text-xs pt-1 border-t">
            <span className="text-muted-foreground">Total</span>
            <span className="tabular-nums font-medium">{statTotal}</span>
          </div>
        </section>

        {/* Evolution */}
        <EvolutionSection
          chain={evolutionChain}
          isLoading={evolutionLoading}
          currentId={pokemon.id}
        />

        {/* Details */}
        <DetailsSection pokemon={pokemon} species={species} />

        {/* Moves */}
        <MovesSection moves={moves} isLoading={movesLoading} />
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

// ============================================================================
// Moves Section
// ============================================================================

function MovesSection({
  moves,
  isLoading,
}: {
  moves?: PokemonMove[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <section className="space-y-4">
        <Label>moves</Label>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-6 w-full" />
            ))}
          </div>
        ))}
      </section>
    )
  }

  if (!moves || moves.length === 0) {
    return (
      <section className="space-y-3">
        <Label>moves</Label>
        <p className="text-sm text-muted-foreground">No moves found.</p>
      </section>
    )
  }

  const levelUpMoves = moves
    .filter((m) => m.learnMethod === "level-up")
    .sort((a, b) => a.levelLearnedAt - b.levelLearnedAt)

  const tmMoves = moves
    .filter((m) => m.learnMethod === "machine")
    .sort((a, b) => a.name.localeCompare(b.name))

  const eggMoves = moves
    .filter((m) => m.learnMethod === "egg")
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <section className="space-y-4">
      <Label>moves</Label>
      <div className="space-y-6">
        {levelUpMoves.length > 0 && (
          <MoveGroup title="Level Up" moves={levelUpMoves} showLevel />
        )}
        {tmMoves.length > 0 && (
          <MoveGroup title="TM / HM" moves={tmMoves} />
        )}
        {eggMoves.length > 0 && (
          <MoveGroup title="Egg Moves" moves={eggMoves} />
        )}
      </div>
    </section>
  )
}

function MoveGroup({
  title,
  moves,
  showLevel = false,
}: {
  title: string
  moves: PokemonMove[]
  showLevel?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="space-y-1">
        {moves.map((move, idx) => {
          const slug = move.name.toLowerCase().replace(/\s+/g, "-")
          return (
            <Link
              key={`${move.name}-${idx}`}
              href={`/moves/${slug}`}
              className="flex items-center gap-2 text-xs py-1 border-b border-muted last:border-0 w-full text-left hover:bg-muted/50 transition-colors cursor-pointer"
            >
              {showLevel && (
                <span className="w-8 text-muted-foreground tabular-nums">
                  {move.levelLearnedAt > 0 ? `Lv.${move.levelLearnedAt}` : "—"}
                </span>
              )}
              <span className="flex-1 font-medium">{move.name}</span>
              <TypeBadge type={move.type} size="sm" linkable />
              <span className="w-12 text-right tabular-nums text-muted-foreground">
                {move.power ? `${move.power} pwr` : move.damageClass}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Evolution Section
// ============================================================================

function EvolutionSection({
  chain,
  isLoading,
  currentId,
}: {
  chain?: EvolutionChainLink
  isLoading: boolean
  currentId: number
}) {
  if (isLoading) {
    return (
      <section className="space-y-3">
        <Label>evolution</Label>
        <div className="flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="size-20" />
          ))}
        </div>
      </section>
    )
  }

  if (!chain) {
    return (
      <section className="space-y-3">
        <Label>evolution</Label>
        <p className="text-sm text-muted-foreground">No evolution data found.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <Label>evolution</Label>
      <EvolutionChainDisplay chain={chain} currentId={currentId} />
    </section>
  )
}

function EvolutionChainDisplay({
  chain,
  currentId
}: {
  chain: EvolutionChainLink
  currentId: number
}) {
  const flatChain = flattenEvolutionChain(chain)

  if (flatChain.length === 1) {
    return (
      <p className="text-sm text-muted-foreground">This Pokémon does not evolve.</p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {flatChain.map((pokemon, index) => (
          <div key={pokemon.id} className="flex items-center gap-2">
            <Link
              href={`/pokemon/${pokemon.id}`}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded hover:bg-muted transition-colors",
                pokemon.id === currentId && "bg-muted ring-1 ring-primary"
              )}
            >
              <img
                src={pokemon.sprite}
                alt={pokemon.name}
                className="size-16 md:size-20 lg:size-24 pixelated"
              />
              <span className="text-xs">{pokemon.name}</span>
              <span className="text-[10px] text-muted-foreground">
                #{pokemon.id.toString().padStart(3, "0")}
              </span>
            </Link>
            {index < flatChain.length - 1 && (
              <div className="text-muted-foreground text-xs">
                <span>→</span>
                {flatChain[index + 1]?.evolutionDetails[0] && (
                  <div className="text-[10px] text-center max-w-16">
                    {formatEvolutionMethod(flatChain[index + 1].evolutionDetails[0])}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function flattenEvolutionChain(chain: EvolutionChainLink): EvolutionChainLink[] {
  const result: EvolutionChainLink[] = [chain]
  for (const evolution of chain.evolvesTo) {
    result.push(...flattenEvolutionChain(evolution))
  }
  return result
}

function formatEvolutionMethod(detail: EvolutionChainLink["evolutionDetails"][0]): string {
  if (detail.minLevel) return `Lv.${detail.minLevel}`
  if (detail.item) return detail.item
  if (detail.minHappiness) return "Friendship"
  if (detail.knownMove) return detail.knownMove
  if (detail.timeOfDay) return detail.timeOfDay
  if (detail.heldItem) return `Hold ${detail.heldItem}`
  return detail.trigger
}

// ============================================================================
// Details Section
// ============================================================================

function DetailsSection({
  pokemon,
  species,
}: {
  pokemon: Pokemon
  species?: PokemonSpecies
}) {
  const genderDisplay = species
    ? species.genderRate === -1
      ? "Genderless"
      : `${(8 - species.genderRate) * 12.5}% ♂ / ${species.genderRate * 12.5}% ♀`
    : "—"

  const catchRatePercent = species
    ? ((species.captureRate / 255) * 100).toFixed(1)
    : "—"

  const hatchSteps = species
    ? (species.hatchCounter * 257).toLocaleString()
    : "—"

  return (
    <section className="space-y-6">
      {/* Breeding */}
      <div className="space-y-2">
        <Label>breeding</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow label="Egg Groups" value={species?.eggGroups.join(", ") ?? "—"} />
          <DetailRow label="Gender" value={genderDisplay} />
          <DetailRow label="Hatch Time" value={species ? `~${hatchSteps} steps` : "—"} />
        </div>
      </div>

      {/* Training */}
      <div className="space-y-2">
        <Label>training</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow
            label="Catch Rate"
            value={species ? `${species.captureRate} (${catchRatePercent}%)` : "—"}
          />
          <DetailRow label="Growth Rate" value={species?.growthRate ?? "—"} />
          <DetailRow
            label="EV Yield"
            value={species?.evYield.map(e => `${e.value} ${e.stat}`).join(", ") || "—"}
          />
          <DetailRow
            label="Base Happiness"
            value={species?.baseHappiness?.toString() ?? "—"}
          />
        </div>
      </div>

      {/* About */}
      <div className="space-y-2">
        <Label>about</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow
            label="Height"
            value={`${(pokemon.height / 10).toFixed(1)}m`}
          />
          <DetailRow
            label="Weight"
            value={`${(pokemon.weight / 10).toFixed(1)}kg`}
          />
          <DetailRow label="Generation" value={species?.generation ?? "—"} />
        </div>
      </div>

      {/* Abilities */}
      <div className="space-y-2">
        <Label>abilities</Label>
        <div className="flex flex-wrap gap-2">
          {pokemon.abilities.map((ability) => {
            const slug = ability.name.toLowerCase().replace(/\s+/g, "-")
            return (
              <Link
                key={ability.name}
                href={`/abilities/${slug}`}
                className={cn(
                  "text-xs px-2 py-1 border rounded hover:bg-muted/50 transition-colors cursor-pointer",
                  ability.isHidden && "text-muted-foreground border-dashed"
                )}
              >
                {ability.name}
                {ability.isHidden && " (hidden)"}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Description */}
      {species?.description && (
        <div className="space-y-2">
          <Label>description</Label>
          <p className="text-sm leading-relaxed">{species.description}</p>
        </div>
      )}
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

function PokemonPageSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto space-y-6">
        <section className="text-center space-y-3">
          <div className="flex justify-between items-start">
            <div />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className="size-32 md:size-40 lg:size-48 mx-auto" />
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
          <div className="flex justify-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </section>
        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-14" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-14" />
              ))}
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <Skeleton className="h-3 w-16" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </section>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

