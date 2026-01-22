"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import {
  DexFilter,
  useDexFilter,
  useFilteredAbilities,
  useFilteredItems,
  useFilteredMoves,
  useFilteredPokemon,
} from "@/components/pokemon/dex-filter";
import {
  PokemonCard,
  PokemonCardSkeleton,
} from "@/components/pokemon/pokemon-card";
import { getDexPokemonList } from "@/lib/dex-pokemon";
import { toID } from "@/lib/pkmn";

const ITEMS_PER_PAGE = 50;

function HomeContent() {
  const { ref: pokemonRef, inView: pokemonInView } = useInView();
  const { ref: movesRef, inView: movesInView } = useInView();
  const { ref: abilitiesRef, inView: abilitiesInView } = useInView();
  const { ref: itemsRef, inView: itemsInView } = useInView();
  const [filter, setFilter] = useDexFilter();
  const [pokemonDisplayCount, setPokemonDisplayCount] =
    useState(ITEMS_PER_PAGE);
  const [movesDisplayCount, setMovesDisplayCount] = useState(ITEMS_PER_PAGE);
  const [abilitiesDisplayCount, setAbilitiesDisplayCount] =
    useState(ITEMS_PER_PAGE);
  const [itemsDisplayCount, setItemsDisplayCount] = useState(ITEMS_PER_PAGE);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = 50; // Minimum scroll distance before toggling

  // Scroll direction detection for collapsible toolbar
  useEffect(() => {
    // Find the scrollable main element from app-shell
    const scrollContainer = document.querySelector("main");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      const scrollDelta = currentScrollY - lastScrollY.current;

      // Only toggle if we've scrolled past the threshold
      if (Math.abs(scrollDelta) > scrollThreshold) {
        if (scrollDelta > 0 && currentScrollY > 100) {
          // Scrolling down and past initial content
          setToolbarCollapsed(true);
        } else if (scrollDelta < 0) {
          // Scrolling up
          setToolbarCollapsed(false);
        }
        lastScrollY.current = currentScrollY;
      }

      // Always expand when near top
      if (currentScrollY < 50) {
        setToolbarCollapsed(false);
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const loadingRowKeys = useMemo(
    () => Array.from({ length: 20 }, (_, i) => `loading-row-${i}`),
    [],
  );

  const filterResetKey = useMemo(() => {
    return `${filter.category}|${filter.search}|${filter.types.join(",")}|${filter.generations.join(",")}|${filter.randomSeed}`;
  }, [
    filter.category,
    filter.search,
    filter.types,
    filter.generations,
    filter.randomSeed,
  ]);

  const allPokemon = useMemo(() => {
    return getDexPokemonList(9, { forms: "distinct-sprites" }).map((p) => ({
      name: p.name,
      id: p.id,
    }));
  }, []);

  const { filteredPokemon, hasActiveFilters: hasPokemonFilters } =
    useFilteredPokemon(filter);
  const { filteredMoves, isLoading: isMovesLoading } = useFilteredMoves(filter);
  const { filteredAbilities, isLoading: isAbilitiesLoading } =
    useFilteredAbilities(filter);
  const { filteredItems, isLoading: isItemsLoading } = useFilteredItems(filter);

  // Pokemon infinite scroll
  useEffect(() => {
    if (
      pokemonInView &&
      !hasPokemonFilters &&
      filter.category === "pokemon" &&
      pokemonDisplayCount < allPokemon.length
    ) {
      setPokemonDisplayCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, allPokemon.length),
      );
    }
  }, [
    pokemonInView,
    hasPokemonFilters,
    filter.category,
    allPokemon.length,
    pokemonDisplayCount,
  ]);

  // Moves infinite scroll
  useEffect(() => {
    if (
      movesInView &&
      filteredMoves &&
      movesDisplayCount < filteredMoves.length
    ) {
      setMovesDisplayCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, filteredMoves.length),
      );
    }
  }, [movesInView, filteredMoves, movesDisplayCount]);

  // Abilities infinite scroll
  useEffect(() => {
    if (
      abilitiesInView &&
      filteredAbilities &&
      abilitiesDisplayCount < filteredAbilities.length
    ) {
      setAbilitiesDisplayCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, filteredAbilities.length),
      );
    }
  }, [abilitiesInView, filteredAbilities, abilitiesDisplayCount]);

  // Items infinite scroll
  useEffect(() => {
    if (
      itemsInView &&
      filteredItems &&
      itemsDisplayCount < filteredItems.length
    ) {
      setItemsDisplayCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, filteredItems.length),
      );
    }
  }, [itemsInView, filteredItems, itemsDisplayCount]);

  // Reset display counts when filter changes
  useEffect(() => {
    void filterResetKey;
    setPokemonDisplayCount(ITEMS_PER_PAGE);
    setMovesDisplayCount(ITEMS_PER_PAGE);
    setAbilitiesDisplayCount(ITEMS_PER_PAGE);
    setItemsDisplayCount(ITEMS_PER_PAGE);
  }, [filterResetKey]);

  const displayedPokemon = hasPokemonFilters
    ? filteredPokemon
    : allPokemon.slice(0, pokemonDisplayCount);

  return (
    <div>
      {/* Sticky Filter Toolbar */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 md:px-6 py-3 lg:top-14">
        <DexFilter
          filter={filter}
          onFilterChange={setFilter}
          collapsed={toolbarCollapsed}
        />
      </div>

      <div className="p-4 md:p-6">
        {/* Pokemon Grid */}
        {filter.category === "pokemon" && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {displayedPokemon?.map((pokemon) => (
                <PokemonCard
                  key={`${pokemon.id}-${pokemon.name}`}
                  name={pokemon.name}
                  id={pokemon.id}
                />
              ))}
            </div>

            {/* Filtered Results Count */}
            {hasPokemonFilters && filteredPokemon && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {filteredPokemon.length} Pokemon found
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            {!hasPokemonFilters && pokemonDisplayCount < allPokemon.length && (
              <div ref={pokemonRef} className="flex justify-center py-6">
                <span className="text-xs text-muted-foreground">
                  Showing {pokemonDisplayCount} of {allPokemon.length}
                </span>
              </div>
            )}
          </>
        )}

        {/* Moves List */}
        {filter.category === "moves" &&
          (isMovesLoading ? (
            <div className="space-y-1">
              {loadingRowKeys.map((key) => (
                <div key={key} className="h-8 animate-pulse rounded bg-muted" />
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
                  {filteredMoves
                    ?.slice(0, movesDisplayCount)
                    .map((move, index) => (
                      <Link
                        key={move.id}
                        href={`/moves/${toID(move.name)}`}
                        className="grid grid-cols-[60px_1fr] items-center px-3 py-2 text-sm transition-colors hover:bg-accent sm:grid-cols-[60px_1fr_100px]"
                      >
                        <span className="text-muted-foreground tabular-nums">
                          {index + 1}
                        </span>
                        <span className="font-medium truncate">
                          {move.name}
                        </span>
                        <span className="hidden sm:block text-right text-muted-foreground tabular-nums">
                          {move.id}
                        </span>
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
              {filteredMoves &&
                movesDisplayCount >= filteredMoves.length &&
                filteredMoves.length > 0 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {filteredMoves.length} moves total
                  </div>
                )}
            </>
          ))}

        {/* Abilities List */}
        {filter.category === "abilities" &&
          (isAbilitiesLoading ? (
            <div className="space-y-1">
              {loadingRowKeys.map((key) => (
                <div key={key} className="h-8 animate-pulse rounded bg-muted" />
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
                  {filteredAbilities
                    ?.slice(0, abilitiesDisplayCount)
                    .map((ability, index) => (
                      <Link
                        key={ability.id}
                        href={`/abilities/${toID(ability.name)}`}
                        className="grid grid-cols-[60px_1fr] items-center px-3 py-2 text-sm transition-colors hover:bg-accent sm:grid-cols-[60px_1fr_100px]"
                      >
                        <span className="text-muted-foreground tabular-nums">
                          {index + 1}
                        </span>
                        <span className="font-medium truncate">
                          {ability.name}
                        </span>
                        <span className="hidden sm:block text-right text-muted-foreground tabular-nums">
                          {ability.id}
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
              {filteredAbilities &&
                abilitiesDisplayCount < filteredAbilities.length && (
                  <div ref={abilitiesRef} className="flex justify-center py-4">
                    <span className="text-xs text-muted-foreground">
                      Showing {abilitiesDisplayCount} of{" "}
                      {filteredAbilities.length} abilities
                    </span>
                  </div>
                )}
              {filteredAbilities &&
                abilitiesDisplayCount >= filteredAbilities.length &&
                filteredAbilities.length > 0 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {filteredAbilities.length} abilities total
                  </div>
                )}
            </>
          ))}

        {/* Items List */}
        {filter.category === "items" &&
          (isItemsLoading ? (
            <div className="space-y-1">
              {loadingRowKeys.map((key) => (
                <div key={key} className="h-8 animate-pulse rounded bg-muted" />
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
                  {filteredItems
                    ?.slice(0, itemsDisplayCount)
                    .map((item, index) => (
                      <Link
                        key={item.id}
                        href={`/items/${toID(item.name)}`}
                        className="grid grid-cols-[60px_1fr] items-center px-3 py-2 text-sm transition-colors hover:bg-accent sm:grid-cols-[60px_1fr_100px]"
                      >
                        <span className="text-muted-foreground tabular-nums">
                          {index + 1}
                        </span>
                        <span className="font-medium truncate">
                          {item.name}
                        </span>
                        <span className="hidden sm:block text-right text-muted-foreground tabular-nums">
                          {item.id}
                        </span>
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
              {filteredItems &&
                itemsDisplayCount >= filteredItems.length &&
                filteredItems.length > 0 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {filteredItems.length} items total
                  </div>
                )}
            </>
          ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

function HomePageSkeleton() {
  const filterTypeSkeletonKeys = useMemo(
    () => Array.from({ length: 18 }, (_, i) => `filter-type-${i}`),
    [],
  );
  const pokemonCardSkeletonKeys = useMemo(
    () => Array.from({ length: 20 }, (_, i) => `pokemon-card-${i}`),
    [],
  );

  return (
    <div>
      {/* Sticky Filter Skeleton */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 md:px-6 py-3 lg:top-14">
        <div className="space-y-3">
          <div className="h-9 animate-pulse rounded-md bg-muted" />
          <div className="flex flex-wrap gap-1.5">
            {filterTypeSkeletonKeys.map((key) => (
              <div
                key={key}
                className="h-5 w-14 animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {pokemonCardSkeletonKeys.map((key) => (
            <PokemonCardSkeleton key={key} />
          ))}
        </div>
      </div>
    </div>
  );
}
