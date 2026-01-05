"use client"

import { use, useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { Heart, GitCompareArrows, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { usePokemonWithSpecies, usePokemonMoves, useEvolutionChain, useAvailableVersionGroups } from "@/hooks/use-pokemon"
import { useFavorites } from "@/hooks/use-favorites"
import { useComparison } from "@/hooks/use-comparison"
import { useGameVersion } from "@/hooks/use-game-version"
import { calculateTypeEffectiveness, VERSION_GROUPS, getAbilitiesForVersion, getTypesForVersion } from "@/lib/pokeapi"
import type { VersionGroup } from "@/lib/pokeapi"
import { TypeBadge } from "@/components/pokemon/type-badge"
import { StatBar } from "@/components/pokemon/stat-bar"
import { AddToListDialog } from "@/components/add-to-list-dialog"
import type { PokemonType, PokemonMove, EvolutionChainLink, PokemonSpecies, Pokemon, PokemonAbility } from "@/types/pokemon"

const MAX_POKEMON_ID = 1025

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PokemonPage({ params }: PageProps) {
  const { id } = use(params)
  const { pokemon, species, isLoading } = usePokemonWithSpecies(id)
  const { isFavorite, toggleFavorite } = useFavorites()
  const { isInComparison, toggleComparison, canAddMore } = useComparison()
  const { gameVersion: defaultGameVersion } = useGameVersion()
  const [selectedGame, setSelectedGame] = useState<VersionGroup>(defaultGameVersion)
  const { data: availableVersions } = useAvailableVersionGroups(id)
  const { data: moves, isLoading: movesLoading } = usePokemonMoves(id, selectedGame)
  const { data: evolutionChain, isLoading: evolutionLoading } = useEvolutionChain(
    species?.evolutionChainUrl ?? null
  )

  // Update selected game when default changes or when navigating to a new Pokemon
  useEffect(() => {
    setSelectedGame(defaultGameVersion)
  }, [defaultGameVersion, id])

  // Get version-specific types and abilities
  const versionTypes = useMemo(() => {
    if (!pokemon) return []
    return getTypesForVersion(pokemon, selectedGame)
  }, [pokemon, selectedGame])

  const versionAbilities = useMemo(() => {
    if (!pokemon) return []
    return getAbilitiesForVersion(pokemon, selectedGame)
  }, [pokemon, selectedGame])

  const typeEffectiveness = useMemo(() => {
    if (!pokemon || versionTypes.length === 0) return null
    return calculateTypeEffectiveness(versionTypes)
  }, [pokemon, versionTypes])

  if (isLoading || !pokemon) {
    return <PokemonPageSkeleton />
  }

  const statTotal = pokemon.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto space-y-6">
        {/* Core Header */}
        <section className="text-center space-y-3">
          {/* Navigation and ID row */}
          <div className="flex justify-between items-center">
            {pokemon.id > 1 ? (
              <Link
                href={`/pokemon/${pokemon.id - 1}`}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Previous Pokemon"
              >
                <ChevronLeft className="size-5" />
              </Link>
            ) : (
              <div className="size-7" />
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
              #{pokemon.id.toString().padStart(3, "0")}
            </span>
            {pokemon.id < MAX_POKEMON_ID ? (
              <Link
                href={`/pokemon/${pokemon.id + 1}`}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Next Pokemon"
              >
                <ChevronRight className="size-5" />
              </Link>
            ) : (
              <div className="size-7" />
            )}
          </div>
          {/* Actions row */}
          <div className="flex justify-center items-center gap-2">
            <button
              type="button"
              onClick={() => toggleComparison(pokemon.id)}
              disabled={!canAddMore && !isInComparison(pokemon.id)}
              className={cn(
                "transition-colors",
                isInComparison(pokemon.id) ? "text-blue-500" : "text-muted-foreground hover:text-foreground",
                !canAddMore && !isInComparison(pokemon.id) && "opacity-50 cursor-not-allowed"
              )}
              title={isInComparison(pokemon.id) ? "Remove from comparison" : "Add to comparison"}
            >
              <GitCompareArrows className="size-4" />
            </button>
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
            <AddToListDialog
              itemType="pokemon"
              itemId={pokemon.id.toString()}
              itemName={pokemon.name}
              itemSprite={pokemon.sprite}
            />
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
            {versionTypes.map((type) => (
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
        <DetailsSection pokemon={pokemon} species={species} abilities={versionAbilities} />

        {/* Moves */}
        <MovesSection
          moves={moves}
          isLoading={movesLoading}
          selectedGame={selectedGame}
          setSelectedGame={setSelectedGame}
          availableVersions={availableVersions}
        />
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
  selectedGame,
  setSelectedGame,
  availableVersions,
}: {
  moves?: PokemonMove[]
  isLoading: boolean
  selectedGame: VersionGroup
  setSelectedGame: (game: VersionGroup) => void
  availableVersions?: VersionGroup[]
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const selectedGameInfo = VERSION_GROUPS.find((g) => g.id === selectedGame)
  const isAvailable = availableVersions?.includes(selectedGame) ?? true

  const GameSelector = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-muted transition-colors"
      >
        <span>{selectedGameInfo?.name ?? "Select Game"}</span>
        <ChevronDown className="size-3" />
      </button>
      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-background border rounded shadow-lg max-h-64 overflow-y-auto min-w-48">
            {VERSION_GROUPS.map((game) => {
              const isGameAvailable = availableVersions?.includes(game.id) ?? true
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setSelectedGame(game.id)
                    setIsDropdownOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center justify-between",
                    selectedGame === game.id && "bg-muted",
                    !isGameAvailable && "text-muted-foreground"
                  )}
                >
                  <span>{game.name}</span>
                  {!isGameAvailable && (
                    <span className="text-[10px] text-muted-foreground">N/A</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>moves</Label>
          <GameSelector />
        </div>
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

  if (!isAvailable) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>moves</Label>
          <GameSelector />
        </div>
        <p className="text-sm text-muted-foreground">
          This Pokemon is not available in {selectedGameInfo?.name ?? "this game"}.
        </p>
        {availableVersions && availableVersions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Available in: {availableVersions.slice(0, 3).map(v =>
              VERSION_GROUPS.find(g => g.id === v)?.name
            ).join(", ")}
            {availableVersions.length > 3 && ` and ${availableVersions.length - 3} more`}
          </p>
        )}
      </section>
    )
  }

  if (!moves || moves.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>moves</Label>
          <GameSelector />
        </div>
        <p className="text-sm text-muted-foreground">No moves found for this game.</p>
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
      <div className="flex items-center justify-between">
        <Label>moves</Label>
        <GameSelector />
      </div>
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
  if (chain.evolvesTo.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">This Pokémon does not evolve.</p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <EvolutionNode pokemon={chain} currentId={currentId} isFirst />
    </div>
  )
}

function EvolutionNode({
  pokemon,
  currentId,
  isFirst = false,
}: {
  pokemon: EvolutionChainLink
  currentId: number
  isFirst?: boolean
}) {
  const hasBranching = pokemon.evolvesTo.length > 1

  return (
    <div className="flex items-center gap-2">
      {/* Show evolution method arrow if this isn't the base form */}
      {!isFirst && pokemon.evolutionDetails.length > 0 && (
        <div className="text-muted-foreground text-xs flex flex-col items-center">
          <span>→</span>
          <div className="text-[10px] text-center max-w-20">
            {pokemon.evolutionDetails.map((detail, i) => (
              <div key={i}>{formatEvolutionMethod(detail)}</div>
            ))}
          </div>
        </div>
      )}

      {/* Pokemon card */}
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

      {/* Evolutions */}
      {pokemon.evolvesTo.length > 0 && (
        <div className={cn("flex", hasBranching ? "flex-col gap-2" : "items-center")}>
          {pokemon.evolvesTo.map((evo) => (
            <EvolutionNode key={evo.id} pokemon={evo} currentId={currentId} />
          ))}
        </div>
      )}
    </div>
  )
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
  abilities,
}: {
  pokemon: Pokemon
  species?: PokemonSpecies
  abilities: PokemonAbility[]
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
          {abilities.length > 0 ? (
            abilities.map((ability) => {
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
            })
          ) : (
            <span className="text-xs text-muted-foreground">No abilities in this game</span>
          )}
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
          <div className="flex justify-between items-center">
            <Skeleton className="size-7" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="size-7" />
          </div>
          <div className="flex justify-center gap-2">
            <Skeleton className="h-4 w-4" />
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

