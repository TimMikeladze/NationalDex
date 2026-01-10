"use client"

import { useEffect, Suspense, useState } from "react"
import { useInView } from "react-intersection-observer"
import Link from "next/link"
import { PokemonCard, PokemonCardSkeleton } from "@/components/pokemon/pokemon-card"
import { DexFilter, useFilteredPokemon, useFilteredMoves, useFilteredAbilities, useFilteredItems, useFilteredNews, type DexFilterState } from "@/components/pokemon/dex-filter"
import { usePokemonList, getPokemonIdFromUrl } from "@/hooks/use-pokemon"
import { NewsCard, NewsCardSkeleton } from "@/components/news/news-card"

const ITEMS_PER_PAGE = 50

function HomeContent() {
  const { ref: pokemonRef, inView: pokemonInView } = useInView()
  const { ref: movesRef, inView: movesInView } = useInView()
  const { ref: abilitiesRef, inView: abilitiesInView } = useInView()
  const { ref: itemsRef, inView: itemsInView } = useInView()
  const [filter, setFilter] = useState<DexFilterState>({ search: "", types: [], category: "pokemon" })
  const [movesDisplayCount, setMovesDisplayCount] = useState(ITEMS_PER_PAGE)
  const [abilitiesDisplayCount, setAbilitiesDisplayCount] = useState(ITEMS_PER_PAGE)
  const [itemsDisplayCount, setItemsDisplayCount] = useState(ITEMS_PER_PAGE)

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
  const { filteredItems, isLoading: isItemsLoading } = useFilteredItems(filter)
  const { filteredNews, isLoading: isNewsLoading } = useFilteredNews(filter)

  // Pokemon infinite scroll
  useEffect(() => {
    if (pokemonInView && hasNextPage && !isFetchingNextPage && !hasPokemonFilters && filter.category === "pokemon") {
      fetchNextPage()
    }
  }, [pokemonInView, hasNextPage, isFetchingNextPage, fetchNextPage, hasPokemonFilters, filter.category])

  // Moves infinite scroll
  useEffect(() => {
    if (movesInView && filteredMoves && movesDisplayCount < filteredMoves.length) {
      setMovesDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredMoves.length))
    }
  }, [movesInView, filteredMoves, movesDisplayCount])

  // Abilities infinite scroll
  useEffect(() => {
    if (abilitiesInView && filteredAbilities && abilitiesDisplayCount < filteredAbilities.length) {
      setAbilitiesDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredAbilities.length))
    }
  }, [abilitiesInView, filteredAbilities, abilitiesDisplayCount])

  // Items infinite scroll
  useEffect(() => {
    if (itemsInView && filteredItems && itemsDisplayCount < filteredItems.length) {
      setItemsDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredItems.length))
    }
  }, [itemsInView, filteredItems, itemsDisplayCount])

  // Reset display counts when filter changes
  useEffect(() => {
    setMovesDisplayCount(ITEMS_PER_PAGE)
    setAbilitiesDisplayCount(ITEMS_PER_PAGE)
    setItemsDisplayCount(ITEMS_PER_PAGE)
  }, [filter.search, filter.category])

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
            <div ref={pokemonRef} className="flex justify-center py-6">
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
            <div className="space-y-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card">
                <div className="grid grid-cols-[60px_1fr] text-xs font-medium text-muted-foreground border-b px-3 py-2 sm:grid-cols-[60px_1fr_100px]">
                  <span>#</span>
                  <span>Name</span>
                  <span className="hidden sm:block text-right">ID</span>
                </div>
                <div className="divide-y">
                  {filteredMoves?.slice(0, movesDisplayCount).map((move, index) => (
                    <Link
                      key={move.id}
                      href={`/moves/${move.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className="grid grid-cols-[60px_1fr] items-center px-3 py-2 text-sm transition-colors hover:bg-accent sm:grid-cols-[60px_1fr_100px]"
                    >
                      <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                      <span className="font-medium truncate">{move.name}</span>
                      <span className="hidden sm:block text-right text-muted-foreground tabular-nums">{move.id}</span>
                    </Link>
                  ))}
                </div>
              </div>
              {filteredMoves && movesDisplayCount < filteredMoves.length && (
                <div ref={movesRef} className="flex justify-center py-4">
                  <span className="text-xs text-muted-foreground">
                    Showing {movesDisplayCount} of {filteredMoves.length} moves
                  </span>
                </div>
              )}
              {filteredMoves && movesDisplayCount >= filteredMoves.length && filteredMoves.length > 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  {filteredMoves.length} moves total
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
            <div className="space-y-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card">
                <div className="grid grid-cols-[60px_1fr] text-xs font-medium text-muted-foreground border-b px-3 py-2 sm:grid-cols-[60px_1fr_100px]">
                  <span>#</span>
                  <span>Name</span>
                  <span className="hidden sm:block text-right">ID</span>
                </div>
                <div className="divide-y">
                  {filteredAbilities?.slice(0, abilitiesDisplayCount).map((ability, index) => (
                    <Link
                      key={ability.id}
                      href={`/abilities/${ability.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className="grid grid-cols-[60px_1fr] items-center px-3 py-2 text-sm transition-colors hover:bg-accent sm:grid-cols-[60px_1fr_100px]"
                    >
                      <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                      <span className="font-medium truncate">{ability.name}</span>
                      <span className="hidden sm:block text-right text-muted-foreground tabular-nums">{ability.id}</span>
                    </Link>
                  ))}
                </div>
              </div>
              {filteredAbilities && abilitiesDisplayCount < filteredAbilities.length && (
                <div ref={abilitiesRef} className="flex justify-center py-4">
                  <span className="text-xs text-muted-foreground">
                    Showing {abilitiesDisplayCount} of {filteredAbilities.length} abilities
                  </span>
                </div>
              )}
              {filteredAbilities && abilitiesDisplayCount >= filteredAbilities.length && filteredAbilities.length > 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  {filteredAbilities.length} abilities total
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Items List */}
      {filter.category === "items" && (
        <>
          {isItemsLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card">
                <div className="grid grid-cols-[60px_1fr] text-xs font-medium text-muted-foreground border-b px-3 py-2 sm:grid-cols-[60px_1fr_100px]">
                  <span>#</span>
                  <span>Name</span>
                  <span className="hidden sm:block text-right">ID</span>
                </div>
                <div className="divide-y">
                  {filteredItems?.slice(0, itemsDisplayCount).map((item, index) => (
                    <Link
                      key={item.id}
                      href={`/items/${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className="grid grid-cols-[60px_1fr] items-center px-3 py-2 text-sm transition-colors hover:bg-accent sm:grid-cols-[60px_1fr_100px]"
                    >
                      <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="hidden sm:block text-right text-muted-foreground tabular-nums">{item.id}</span>
                    </Link>
                  ))}
                </div>
              </div>
              {filteredItems && itemsDisplayCount < filteredItems.length && (
                <div ref={itemsRef} className="flex justify-center py-4">
                  <span className="text-xs text-muted-foreground">
                    Showing {itemsDisplayCount} of {filteredItems.length} items
                  </span>
                </div>
              )}
              {filteredItems && itemsDisplayCount >= filteredItems.length && filteredItems.length > 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  {filteredItems.length} items total
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* News List */}
      {filter.category === "news" && (
        <>
          {isNewsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredNews?.map((news) => (
                  <NewsCard key={news.id} news={news} />
                ))}
              </div>
              {filteredNews && filteredNews.length > 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  {filteredNews.length} news items
                </div>
              )}
              {filteredNews && filteredNews.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No news found
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
