"use client"

import { useEffect, Suspense, useState } from "react"
import { useInView } from "react-intersection-observer"
import { PokemonCard, PokemonCardSkeleton } from "@/components/pokemon/pokemon-card"
import { DexFilter, useFilteredPokemon, type DexFilterState } from "@/components/pokemon/dex-filter"
import { usePokemonList, getPokemonIdFromUrl } from "@/hooks/use-pokemon"

function HomeContent() {
  const { ref, inView } = useInView()
  const [filter, setFilter] = useState<DexFilterState>({ search: "", types: [] })

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePokemonList()

  const { filteredPokemon, hasActiveFilters } = useFilteredPokemon(filter)

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !hasActiveFilters) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, hasActiveFilters])

  const allPokemon = data?.pages.flatMap((page) => page.results) ?? []

  return (
    <div className="p-4 md:p-6">
      {/* Search Filter */}
      <div className="mb-4">
        <DexFilter filter={filter} onFilterChange={setFilter} />
      </div>

      {/* Pokemon Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {isLoading && !hasActiveFilters
          ? Array.from({ length: 20 }).map((_, i) => (
              <PokemonCardSkeleton key={i} />
            ))
          : hasActiveFilters
            ? filteredPokemon?.map((pokemon) => (
                <PokemonCard
                  key={pokemon.id}
                  name={pokemon.name}
                  id={pokemon.id}
                />
              ))
            : allPokemon.map((pokemon) => {
                const id = getPokemonIdFromUrl(pokemon.url)
                return (
                  <PokemonCard
                    key={pokemon.name}
                    name={pokemon.name}
                    id={id}
                  />
                )
              })}
      </div>

      {/* Filtered Results Count */}
      {hasActiveFilters && filteredPokemon && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {filteredPokemon.length} Pokemon found
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      {hasNextPage && !hasActiveFilters && (
        <div ref={ref} className="flex justify-center py-6">
          {isFetchingNextPage && (
            <span className="text-xs text-muted-foreground">loading...</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeContent />
    </Suspense>
  )
}

function HomePageSkeleton() {
  return (
    <div className="p-4 md:p-6">
      {/* Filter Skeleton */}
      <div className="mb-4 space-y-3">
        <div className="h-9 animate-pulse rounded-md bg-muted" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="h-5 w-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {Array.from({ length: 20 }).map((_, i) => (
          <PokemonCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
