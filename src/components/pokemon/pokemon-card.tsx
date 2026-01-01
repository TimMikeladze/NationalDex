"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Heart } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { usePokemon } from "@/hooks/use-pokemon"
import { useFavorites } from "@/hooks/use-favorites"
import { calculateTypeEffectiveness } from "@/lib/pokeapi"
import { TypeBadge } from "./type-badge"
import { StatsGrid } from "./stat-bar"
import type { Pokemon, TypeEffectiveness } from "@/types/pokemon"

// =============================================================================
// Types
// =============================================================================

export type PokemonCardVariant = "compact" | "default" | "detail"

interface BasePokemonCardProps {
  variant?: PokemonCardVariant
  showFavorite?: boolean
  className?: string
}

interface PokemonCardWithDataProps extends BasePokemonCardProps {
  pokemon: Pokemon
  name?: never
  id?: never
}

interface PokemonCardWithNameProps extends BasePokemonCardProps {
  name: string
  id: number
  pokemon?: never
}

export type PokemonCardProps = PokemonCardWithDataProps | PokemonCardWithNameProps

// =============================================================================
// Main Component
// =============================================================================

export function PokemonCard(props: PokemonCardProps) {
  const { variant = "default", showFavorite = true, className } = props

  // If pokemon data is provided directly, use it
  if ("pokemon" in props && props.pokemon) {
    return (
      <PokemonCardContent
        pokemon={props.pokemon}
        variant={variant}
        showFavorite={showFavorite}
        className={className}
      />
    )
  }

  // Otherwise, fetch the data
  return (
    <PokemonCardFetcher
      name={props.name}
      id={props.id}
      variant={variant}
      showFavorite={showFavorite}
      className={className}
    />
  )
}

// =============================================================================
// Fetcher Wrapper (for backward compatibility)
// =============================================================================

function PokemonCardFetcher({
  name,
  id,
  variant,
  showFavorite,
  className,
}: {
  name: string
  id: number
  variant: PokemonCardVariant
  showFavorite: boolean
  className?: string
}) {
  const { data: pokemon, isLoading } = usePokemon(name)

  if (isLoading || !pokemon) {
    return <PokemonCardSkeleton variant={variant} />
  }

  return (
    <PokemonCardContent
      pokemon={pokemon}
      variant={variant}
      showFavorite={showFavorite}
      className={className}
    />
  )
}

// =============================================================================
// Card Content
// =============================================================================

function PokemonCardContent({
  pokemon,
  variant,
  showFavorite,
  className,
}: {
  pokemon: Pokemon
  variant: PokemonCardVariant
  showFavorite: boolean
  className?: string
}) {
  const { isFavorite, toggleFavorite } = useFavorites()

  const typeEffectiveness = useMemo(() => {
    if (variant !== "detail") return null
    return calculateTypeEffectiveness(pokemon.types)
  }, [pokemon.types, variant])

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(pokemon.id)
  }

  if (variant === "compact") {
    return (
      <CompactCard
        pokemon={pokemon}
        className={className}
      />
    )
  }

  if (variant === "detail") {
    return (
      <DetailCard
        pokemon={pokemon}
        typeEffectiveness={typeEffectiveness!}
        showFavorite={showFavorite}
        isFavorite={isFavorite(pokemon.id)}
        onFavoriteClick={handleFavoriteClick}
        className={className}
      />
    )
  }

  // Default variant
  return (
    <DefaultCard
      pokemon={pokemon}
      showFavorite={showFavorite}
      isFavorite={isFavorite(pokemon.id)}
      onFavoriteClick={handleFavoriteClick}
      className={className}
    />
  )
}

// =============================================================================
// Compact Variant
// =============================================================================

function CompactCard({
  pokemon,
  className,
}: {
  pokemon: Pokemon
  className?: string
}) {
  return (
    <Link href={`/pokemon/${pokemon.id}`} className={cn("block", className)}>
      <Card className="p-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="size-10 pixelated"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium truncate">{pokemon.name}</h3>
            <div className="flex gap-1 flex-wrap">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// =============================================================================
// Default Variant
// =============================================================================

function DefaultCard({
  pokemon,
  showFavorite,
  isFavorite,
  onFavoriteClick,
  className,
}: {
  pokemon: Pokemon
  showFavorite: boolean
  isFavorite: boolean
  onFavoriteClick: (e: React.MouseEvent) => void
  className?: string
}) {
  return (
    <Card className={cn("group relative p-0 hover:bg-muted/50 transition-colors", className)}>
      <Link href={`/pokemon/${pokemon.id}`} className="block p-3 md:p-4">
        <div className="flex items-start justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">
            #{pokemon.id.toString().padStart(3, "0")}
          </span>
          {showFavorite && (
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onFavoriteClick}
            >
              <Heart
                className={cn(
                  "size-3.5",
                  isFavorite && "fill-current"
                )}
              />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center py-2 md:py-3">
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="size-16 md:size-20 lg:size-24 pixelated"
            loading="lazy"
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium truncate">{pokemon.name}</h3>
          <div className="flex gap-1 flex-wrap">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
            ))}
          </div>
        </div>
      </Link>
    </Card>
  )
}

// =============================================================================
// Detail Variant
// =============================================================================

function DetailCard({
  pokemon,
  typeEffectiveness,
  showFavorite,
  isFavorite,
  onFavoriteClick,
  className,
}: {
  pokemon: Pokemon
  typeEffectiveness: TypeEffectiveness
  showFavorite: boolean
  isFavorite: boolean
  onFavoriteClick: (e: React.MouseEvent) => void
  className?: string
}) {
  return (
    <Card className={cn("p-4 md:p-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs text-muted-foreground tabular-nums">
          #{pokemon.id.toString().padStart(3, "0")}
        </span>
        {showFavorite && (
          <button
            type="button"
            onClick={onFavoriteClick}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Heart
              className={cn(
                "size-4",
                isFavorite && "fill-current"
              )}
            />
          </button>
        )}
      </div>

      {/* Pokemon Image & Name */}
      <Link href={`/pokemon/${pokemon.id}`} className="block">
        <div className="flex flex-col items-center mb-4">
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="size-24 md:size-32 pixelated"
            loading="lazy"
          />
          <h3 className="text-lg font-medium mt-2">{pokemon.name}</h3>
          <div className="flex gap-2 mt-2">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        </div>
      </Link>

      {/* Stats */}
      <div className="mb-4">
        <Label>base stats</Label>
        <StatsGrid stats={pokemon.stats} showTotal size="sm" className="mt-2" />
      </div>

      {/* Abilities */}
      <div className="mb-4">
        <Label>abilities</Label>
        <div className="flex flex-wrap gap-1 mt-2">
          {pokemon.abilities.map((ability) => (
            <span
              key={ability.name}
              className={cn(
                "text-xs px-2 py-0.5 border rounded",
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>weaknesses</Label>
          <div className="flex flex-wrap gap-1 mt-2">
            {typeEffectiveness.weaknesses.length > 0 ? (
              typeEffectiveness.weaknesses.map(({ type, multiplier }) => (
                <TypeBadge key={type} type={type} multiplier={multiplier} size="sm" />
              ))
            ) : (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
        </div>
        <div>
          <Label>resistances</Label>
          <div className="flex flex-wrap gap-1 mt-2">
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
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
      {children}
    </span>
  )
}

// =============================================================================
// Skeletons
// =============================================================================

export function PokemonCardSkeleton({
  variant = "default",
}: {
  variant?: PokemonCardVariant
}) {
  if (variant === "compact") {
    return (
      <Card className="p-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-10" />
          <div className="flex-1">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </Card>
    )
  }

  if (variant === "detail") {
    return (
      <Card className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-4" />
        </div>
        <div className="flex flex-col items-center mb-4">
          <Skeleton className="size-24 md:size-32" />
          <Skeleton className="h-5 w-24 mt-2" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
        <div className="mb-4">
          <Skeleton className="h-3 w-16 mb-2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full mb-1" />
          ))}
        </div>
        <div className="mb-4">
          <Skeleton className="h-3 w-14 mb-2" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-3 w-16 mb-2" />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-12" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-3 w-16 mb-2" />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-12" />
              ))}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Default skeleton
  return (
    <Card className="p-3 md:p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="flex flex-col items-center py-2 md:py-3">
        <Skeleton className="size-16 md:size-20 lg:size-24" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </Card>
  )
}
