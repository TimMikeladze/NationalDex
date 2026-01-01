"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { usePokemon } from "@/hooks/use-pokemon"
import { useFavorites } from "@/hooks/use-favorites"
import type { PokemonType } from "@/types/pokemon"

interface PokemonCardProps {
  name: string
  id: number
}

export function PokemonCard({ name, id }: PokemonCardProps) {
  const { data: pokemon, isLoading } = usePokemon(name)
  const { isFavorite, toggleFavorite } = useFavorites()

  if (isLoading || !pokemon) {
    return <PokemonCardSkeleton />
  }

  return (
    <Card className="group relative p-0 hover:bg-muted/50 transition-colors">
      <Link href={`/pokemon/${pokemon.id}`} className="block p-3">
        <div className="flex items-start justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">
            #{id.toString().padStart(3, "0")}
          </span>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(pokemon.id)
            }}
          >
            <Heart
              className={cn(
                "size-3.5",
                isFavorite(pokemon.id) && "fill-current"
              )}
            />
          </button>
        </div>

        <div className="flex flex-col items-center py-2">
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="size-16 pixelated"
            loading="lazy"
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium truncate">{pokemon.name}</h3>
          <div className="flex gap-1 flex-wrap">
            {pokemon.types.map((type) => (
              <TypeTag key={type} type={type} />
            ))}
          </div>
        </div>
      </Link>
    </Card>
  )
}

function TypeTag({ type }: { type: PokemonType }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
      {type}
    </span>
  )
}

export function PokemonCardSkeleton() {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="flex flex-col items-center py-2">
        <Skeleton className="size-16" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </Card>
  )
}
