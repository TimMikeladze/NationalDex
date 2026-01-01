"use client"

import { useEffect, Suspense } from "react"
import { useInView } from "react-intersection-observer"
import { PokemonCard, PokemonCardSkeleton } from "@/components/pokemon/pokemon-card"
import { usePokemonList, getPokemonIdFromUrl } from "@/hooks/use-pokemon"

function HomeContent() {
  const { ref, inView } = useInView()
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePokemonList()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const allPokemon = data?.pages.flatMap((page) => page.results) ?? []
  const count = data?.pages[0]?.count

  return (
    <div className="p-4 md:p-6">
      <header className="mb-6 border-b pb-4">
        <h1 className="text-lg font-medium">natdex</h1>
        <p className="text-xs text-muted-foreground">
          {count ? `${count} entries` : "loading..."}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 20 }).map((_, i) => (
              <PokemonCardSkeleton key={i} />
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

      {hasNextPage && (
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
      <header className="mb-6 border-b pb-4">
        <h1 className="text-lg font-medium">natdex</h1>
        <p className="text-xs text-muted-foreground">loading...</p>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <PokemonCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
