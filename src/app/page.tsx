"use client";

import { Search, Sparkles, Swords, Zap } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useNav } from "@/components/navigation/nav-provider";
import {
  DexFilter,
  useDexFilter,
  useFilteredAbilities,
  useFilteredItems,
  useFilteredMoves,
  useFilteredPokemon,
} from "@/components/pokemon/dex-filter";
import { ItemImage } from "@/components/pokemon/item-image";
import { PokemonCardSkeleton } from "@/components/pokemon/pokemon-card";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { VirtualizedPokemonGrid } from "@/components/pokemon/virtualized-pokemon-grid";
import { getDexPokemonList } from "@/lib/dex-pokemon";
import { ALL_TYPES, toID } from "@/lib/pkmn";
import type { PokemonType } from "@/types/pokemon";

const ITEMS_PER_PAGE = 50;

const STAT_ITEMS = [
  { label: "Pokemon", count: "1025+", icon: Sparkles },
  { label: "Moves", count: "900+", icon: Swords },
  { label: "Abilities", count: "300+", icon: Zap },
] as const;

function HomeContent() {
  const { toggleSearch } = useNav();
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
  const scrollThreshold = 50;

  useEffect(() => {
    const scrollContainer = document.querySelector("main");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      const scrollDelta = currentScrollY - lastScrollY.current;

      if (Math.abs(scrollDelta) > scrollThreshold) {
        if (scrollDelta > 0 && currentScrollY > 100) {
          setToolbarCollapsed(true);
        } else if (scrollDelta < 0) {
          setToolbarCollapsed(false);
        }
        lastScrollY.current = currentScrollY;
      }

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

  useEffect(() => {
    void filterResetKey;
    setMovesDisplayCount(ITEMS_PER_PAGE);
    setAbilitiesDisplayCount(ITEMS_PER_PAGE);
    setItemsDisplayCount(ITEMS_PER_PAGE);
  }, [filterResetKey]);

  const displayedPokemon = hasPokemonFilters ? filteredPokemon : allPokemon;

  return (
    <div>
      {/* Hero Section */}
      <div className="border-b">
        <div className="px-4 md:px-6 pt-8 pb-6 md:pt-12 md:pb-8 max-w-3xl mx-auto">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">
                nationaldex
              </h1>
              <p className="text-sm text-muted-foreground">
                a minimal pokedex — browse, search, and explore
              </p>
            </div>

            {/* Hero Search */}
            <button
              type="button"
              onClick={toggleSearch}
              className="w-full flex items-center gap-3 border bg-card hover:bg-accent/50 transition-colors px-4 py-3 text-sm text-muted-foreground group"
            >
              <Search className="size-4 shrink-0" />
              <span className="flex-1 text-left">
                Search Pokemon, moves, abilities...
              </span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-6 md:gap-10 text-center">
              {STAT_ITEMS.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <stat.icon className="size-3.5 text-muted-foreground" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">
                      {stat.count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Type Links */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {ALL_TYPES.map((type) => (
                <Link key={type} href={`/types/${type.toLowerCase()}`}>
                  <TypeBadge
                    type={type as PokemonType}
                    size="sm"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Filter Toolbar */}
      <div className="sticky top-0 z-30 border-b px-4 md:px-6 py-3 pwa-sticky-toolbar relative bg-background lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/80">
        <DexFilter
          filter={filter}
          onFilterChange={setFilter}
          collapsed={toolbarCollapsed}
        />
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {/* Pokemon Grid */}
        {filter.category === "pokemon" && (
          <>
            {displayedPokemon && displayedPokemon.length > 0 && (
              <VirtualizedPokemonGrid pokemon={displayedPokemon} />
            )}

            {hasPokemonFilters && filteredPokemon && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {filteredPokemon.length} Pokemon found
                </p>
              </div>
            )}

            {displayedPokemon && displayedPokemon.length === 0 && (
              <EmptyState
                title="No Pokemon found"
                description="Try adjusting your filters or search query."
              />
            )}
          </>
        )}

        {/* Moves List */}
        {filter.category === "moves" &&
          (isMovesLoading ? (
            <div className="space-y-1">
              {loadingRowKeys.map((key) => (
                <div key={key} className="h-12 animate-pulse bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="border bg-card">
                <div className="grid grid-cols-[1fr_auto] gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-b px-4 py-2.5 sm:grid-cols-[1fr_80px_60px_60px_50px_70px]">
                  <span>Move</span>
                  <span className="hidden sm:block text-center">Type</span>
                  <span className="hidden sm:block text-center">Cat.</span>
                  <span className="hidden sm:block text-right">Power</span>
                  <span className="hidden sm:block text-right">Acc.</span>
                  <span className="text-right">PP</span>
                </div>
                <div className="divide-y divide-border/50">
                  {filteredMoves?.slice(0, movesDisplayCount).map((move) => (
                    <Link
                      key={move.id}
                      href={`/moves/${toID(move.name)}`}
                      className="grid grid-cols-[1fr_auto] gap-2 items-center px-4 py-3 text-sm transition-colors hover:bg-accent sm:grid-cols-[1fr_80px_60px_60px_50px_70px]"
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
                          className={`text-[10px] px-1.5 py-0.5 font-medium uppercase tracking-wider ${
                            move.category === "Physical"
                              ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                              : move.category === "Special"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                : "bg-gray-500/15 text-gray-600 dark:text-gray-400"
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
                <div ref={movesRef} className="flex justify-center py-6">
                  <span className="text-xs text-muted-foreground">
                    Showing {movesDisplayCount} of {filteredMoves.length} moves
                  </span>
                </div>
              )}
              {filteredMoves &&
                movesDisplayCount >= filteredMoves.length &&
                filteredMoves.length > 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {filteredMoves.length} moves total
                  </div>
                )}
              {filteredMoves && filteredMoves.length === 0 && (
                <EmptyState
                  title="No moves found"
                  description="Try adjusting your filters or search query."
                />
              )}
            </>
          ))}

        {/* Abilities List */}
        {filter.category === "abilities" &&
          (isAbilitiesLoading ? (
            <div className="space-y-1">
              {loadingRowKeys.map((key) => (
                <div key={key} className="h-16 animate-pulse bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="border bg-card divide-y divide-border/50">
                {filteredAbilities
                  ?.slice(0, abilitiesDisplayCount)
                  .map((ability) => (
                    <Link
                      key={ability.id}
                      href={`/abilities/${toID(ability.name)}`}
                      className="block px-4 py-3.5 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm">
                          {ability.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0 mt-0.5">
                          #{ability.id}
                        </span>
                      </div>
                      {ability.shortDesc && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                          {ability.shortDesc}
                        </p>
                      )}
                    </Link>
                  ))}
              </div>
              {filteredAbilities &&
                abilitiesDisplayCount < filteredAbilities.length && (
                  <div ref={abilitiesRef} className="flex justify-center py-6">
                    <span className="text-xs text-muted-foreground">
                      Showing {abilitiesDisplayCount} of{" "}
                      {filteredAbilities.length} abilities
                    </span>
                  </div>
                )}
              {filteredAbilities &&
                abilitiesDisplayCount >= filteredAbilities.length &&
                filteredAbilities.length > 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {filteredAbilities.length} abilities total
                  </div>
                )}
              {filteredAbilities && filteredAbilities.length === 0 && (
                <EmptyState
                  title="No abilities found"
                  description="Try adjusting your search query."
                />
              )}
            </>
          ))}

        {/* Items List */}
        {filter.category === "items" &&
          (isItemsLoading ? (
            <div className="space-y-1">
              {loadingRowKeys.map((key) => (
                <div key={key} className="h-12 animate-pulse bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="border bg-card divide-y divide-border/50">
                {filteredItems?.slice(0, itemsDisplayCount).map((item) => (
                  <Link
                    key={item.id}
                    href={`/items/${toID(item.name)}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <ItemImage
                        src={item.sprite}
                        alt={item.name}
                        width={32}
                        height={32}
                      />
                    </div>
                    <span className="font-medium text-sm truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                      #{item.id}
                    </span>
                  </Link>
                ))}
              </div>
              {filteredItems && itemsDisplayCount < filteredItems.length && (
                <div ref={itemsRef} className="flex justify-center py-6">
                  <span className="text-xs text-muted-foreground">
                    Showing {itemsDisplayCount} of {filteredItems.length} items
                  </span>
                </div>
              )}
              {filteredItems &&
                itemsDisplayCount >= filteredItems.length &&
                filteredItems.length > 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {filteredItems.length} items total
                  </div>
                )}
              {filteredItems && filteredItems.length === 0 && (
                <EmptyState
                  title="No items found"
                  description="Try adjusting your search query."
                />
              )}
            </>
          ))}
      </div>

      {/* Footer */}
      <footer className="border-t px-4 md:px-6 py-8 text-center">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/about"
              className="hover:text-foreground transition-colors"
            >
              About
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/feedback"
              className="hover:text-foreground transition-colors"
            >
              Feedback
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/settings"
              className="hover:text-foreground transition-colors"
            >
              Settings
            </Link>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Data from PokeAPI & Pokemon Showdown
          </p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
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
      {/* Hero Skeleton */}
      <div className="border-b">
        <div className="px-4 md:px-6 pt-8 pb-6 md:pt-12 md:pb-8 max-w-3xl mx-auto">
          <div className="space-y-6">
            <div className="space-y-2 flex flex-col items-center">
              <div className="h-9 w-56 animate-pulse bg-muted" />
              <div className="h-4 w-72 animate-pulse bg-muted" />
            </div>
            <div className="h-11 w-full animate-pulse bg-muted" />
            <div className="flex items-center justify-center gap-6">
              <div className="h-4 w-24 animate-pulse bg-muted" />
              <div className="h-4 w-24 animate-pulse bg-muted" />
              <div className="h-4 w-24 animate-pulse bg-muted" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {filterTypeSkeletonKeys.map((key) => (
                <div key={key} className="h-5 w-14 animate-pulse bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Skeleton */}
      <div className="sticky top-0 z-30 border-b px-4 md:px-6 py-3 pwa-sticky-toolbar relative bg-background lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/80">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={`cat-${i}`}
                className="h-8 w-20 animate-pulse bg-muted"
              />
            ))}
          </div>
          <div className="h-9 animate-pulse bg-muted" />
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
