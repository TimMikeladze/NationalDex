"use client";

import Image from "next/image";
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
import { PokemonCardSkeleton } from "@/components/pokemon/pokemon-card";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { VirtualizedPokemonGrid } from "@/components/pokemon/virtualized-pokemon-grid";
import { getDexPokemonList } from "@/lib/dex-pokemon";
import { toID } from "@/lib/pkmn";
import type { PokemonType } from "@/types/pokemon";

const ITEMS_PER_PAGE = 50;

function HomeContent() {
  const { ref: movesRef, inView: movesInView } = useInView();
  const { ref: abilitiesRef, inView: abilitiesInView } = useInView();
  const { ref: itemsRef, inView: itemsInView } = useInView();
  const [filter, setFilter] = useDexFilter();
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
    setMovesDisplayCount(ITEMS_PER_PAGE);
    setAbilitiesDisplayCount(ITEMS_PER_PAGE);
    setItemsDisplayCount(ITEMS_PER_PAGE);
  }, [filterResetKey]);

  const displayedPokemon = hasPokemonFilters ? filteredPokemon : allPokemon;

  return (
    <div>
      {/* Sticky Filter Toolbar */}
      <div className="sticky top-0 z-30 border-b px-4 md:px-6 py-3 pwa-sticky-toolbar relative bg-background lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/80">
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
            {displayedPokemon && displayedPokemon.length > 0 && (
              <VirtualizedPokemonGrid pokemon={displayedPokemon} />
            )}

            {/* Filtered Results Count */}
            {hasPokemonFilters && filteredPokemon && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {filteredPokemon.length} Pokemon found
              </div>
            )}
          </>
        )}

        {/* Moves List */}
        {filter.category === "moves" &&
          (isMovesLoading ? (
            <div className="space-y-1">
              {loadingRowKeys.map((key) => (
                <div
                  key={key}
                  className="h-12 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card">
                <div className="grid grid-cols-[1fr_auto] gap-2 text-xs font-medium text-muted-foreground border-b px-3 py-2 sm:grid-cols-[1fr_80px_60px_60px_50px_70px]">
                  <span>Move</span>
                  <span className="hidden sm:block text-center">Type</span>
                  <span className="hidden sm:block text-center">Cat.</span>
                  <span className="hidden sm:block text-right">Power</span>
                  <span className="hidden sm:block text-right">Acc.</span>
                  <span className="text-right">PP</span>
                </div>
                <div className="divide-y">
                  {filteredMoves?.slice(0, movesDisplayCount).map((move) => (
                    <Link
                      key={move.id}
                      href={`/moves/${toID(move.name)}`}
                      className="grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2.5 text-sm transition-colors hover:bg-accent sm:grid-cols-[1fr_80px_60px_60px_50px_70px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">
                          {move.name}
                        </span>
                        <TypeBadge
                          type={move.type as PokemonType}
                          size="sm"
                          className="sm:hidden flex-shrink-0"
                        />
                      </div>
                      <div className="hidden sm:flex justify-center">
                        <TypeBadge type={move.type as PokemonType} size="sm" />
                      </div>
                      <div className="hidden sm:flex justify-center">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            move.category === "Physical"
                              ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                              : move.category === "Special"
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                : "bg-gray-500/20 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {move.category === "Physical"
                            ? "Phys"
                            : move.category === "Special"
                              ? "Spec"
                              : "Stat"}
                        </span>
                      </div>
                      <span className="hidden sm:block text-right text-muted-foreground tabular-nums">
                        {move.power || "—"}
                      </span>
                      <span className="hidden sm:block text-right text-muted-foreground tabular-nums">
                        {move.accuracy === true
                          ? "—"
                          : move.accuracy
                            ? `${move.accuracy}%`
                            : "—"}
                      </span>
                      <span className="text-right text-muted-foreground tabular-nums">
                        {move.pp}
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
                <div
                  key={key}
                  className="h-16 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card divide-y">
                {filteredAbilities
                  ?.slice(0, abilitiesDisplayCount)
                  .map((ability) => (
                    <Link
                      key={ability.id}
                      href={`/abilities/${toID(ability.name)}`}
                      className="block px-3 py-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm">
                          {ability.name}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                          #{ability.id}
                        </span>
                      </div>
                      {ability.shortDesc && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {ability.shortDesc}
                        </p>
                      )}
                    </Link>
                  ))}
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
                <div
                  key={key}
                  className="h-12 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-card divide-y">
                {filteredItems?.slice(0, itemsDisplayCount).map((item) => (
                  <Link
                    key={item.id}
                    href={`/items/${toID(item.name)}`}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent"
                  >
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <Image
                        src={item.sprite}
                        alt={item.name}
                        width={32}
                        height={32}
                        className="pixelated"
                        unoptimized
                      />
                    </div>
                    <span className="font-medium text-sm truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                      #{item.id}
                    </span>
                  </Link>
                ))}
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
      <div className="sticky top-0 z-30 border-b px-4 md:px-6 py-3 pwa-sticky-toolbar relative bg-background lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/80">
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
