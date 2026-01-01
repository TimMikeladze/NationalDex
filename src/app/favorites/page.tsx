"use client"

import { PokemonCard, PokemonCardSkeleton } from "@/components/pokemon/pokemon-card"
import { useFavorites } from "@/hooks/use-favorites"

export default function FavoritesPage() {
  const { favorites, isLoaded } = useFavorites()

  return (
    <div className="p-4 md:p-6">
      {!isLoaded ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <PokemonCardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">no favorites yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            click the heart icon on any pokemon to save it
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {favorites.map((id) => (
            <PokemonCard key={id} name={id.toString()} id={id} />
          ))}
        </div>
      )}
    </div>
  )
}
