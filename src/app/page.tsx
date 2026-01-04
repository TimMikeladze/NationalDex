"use client"

import { useEffect, Suspense, useState } from "react"
import { useInView } from "react-intersection-observer"
import Link from "next/link"
import { Swords, Sparkles } from "lucide-react"
import { PokemonCard, PokemonCardSkeleton } from "@/components/pokemon/pokemon-card"
import { DexFilter, useFilteredPokemon, useFilteredMoves, useFilteredAbilities, type DexFilterState } from "@/components/pokemon/dex-filter"
import { usePokemonList, getPokemonIdFromUrl } from "@/hooks/use-pokemon"

function HomeContent() {
  const { ref, inView } = useInView()
  const [filter, setFilter] = useState<DexFilterState>({ search: "", types: [], category: "pokemon" })

  const {
    data,
    isLoading: isPokemonLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePokemonList()

  const { filteredPokemon, hasActiveFilters: hasPokemonFilters } = useFilteredPokemon(filter)
  const { filteredMoves, isLoading: isMovesLoading } = useFilteredMoves(filter)
  const { filteredAbilities, isLoading: isAbilitiesLoading } = useFilteredAbilities(filter)

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !hasPokemonFilters && filter.category === "pokemon") {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, hasPokemonFilters, filter.category])

  const allPokemon = data?.pages.flatMap((page) => page.results) ?? []

  return (
    <div className="p-4 md:p-6">
      {/* Search Filter */}
      <div className="mb-4">
        <DexFilter filter={filter} onFilterChange={setFilter} />
      </div>

      {/* Pokemon Grid */}
      {filter.category === "pokemon" && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {isPokemonLoading && !hasPokemonFilters
              ? Array.from({ length: 20 }).map((_, i) => (
                  <PokemonCardSkeleton key={i} />
                ))
              : hasPokemonFilters
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
          {hasPokemonFilters && filteredPokemon && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {filteredPokemon.length} Pokémon found
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          {hasNextPage && !hasPokemonFilters && (
            <div ref={ref} className="flex justify-center py-6">
              {isFetchingNextPage && (
                <span className="text-xs text-muted-foreground">loading...</span>
              )}
            </div>
          )}
        </>
      )}

      {/* Moves List */}
      {filter.category === "moves" && (
        <>
          {isMovesLoading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredMoves?.slice(0, 100).map((move) => (
                  <Link
                    key={move.id}
                    href={`/moves/${move.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                  >
                    <Swords className="size-4 text-muted-foreground" />
                    <span className="font-medium">{move.name}</span>
                  </Link>
                ))}
              </div>
              {filteredMoves && filteredMoves.length > 100 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing 100 of {filteredMoves.length} moves
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Abilities List */}
      {filter.category === "abilities" && (
        <>
          {isAbilitiesLoading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredAbilities?.slice(0, 100).map((ability) => (
                  <Link
                    key={ability.id}
                    href={`/abilities/${ability.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                  >
                    <Sparkles className="size-4 text-muted-foreground" />
                    <span className="font-medium">{ability.name}</span>
                  </Link>
                ))}
              </div>
              {filteredAbilities && filteredAbilities.length > 100 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing 100 of {filteredAbilities.length} abilities
                </div>
              )}
            </>
          )}
        </>
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
