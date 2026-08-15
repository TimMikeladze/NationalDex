"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BackToTop, LatestSetsRail, TcgCardGrid } from "@/components/tcg";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CARDS_PER_PAGE,
  useLatestSetIds,
  usePocketSetIds,
  useTcgCardSearch,
  useTcgEnergyTypes,
  useTcgRarities,
  useTcgRegulationMarks,
  useTcgSets,
  useTcgStages,
  useTcgSuffixes,
  useTcgTrainerTypes,
} from "@/hooks/use-tcg";
import { resolveSpecies, toID } from "@/lib/pkmn";
import { cn } from "@/lib/utils";
import type { TcgLanguage } from "@/types/tcg";
import {
  DEFAULT_TCG_LANGUAGE,
  gameForSetId,
  isTcgLanguage,
  sortRarities,
  variantLabel,
  withTcgLanguage,
} from "@/types/tcg";
import { CardsFilterBar } from "./filter-bar";
import {
  CARD_FILTER_PARSERS,
  type CardFilterUpdate,
  type CardScope,
  type GameFilter,
  isCardScope,
  isGameFilter,
  scopeApplies,
  toCardSearchFilters,
} from "./filters";

export function CardsPageClient() {
  return (
    <Suspense fallback={<CardsPageSkeleton />}>
      <CardsBrowser />
    </Suspense>
  );
}

/** Filters live in the URL, so a card search can be shared or bookmarked. */
function CardsBrowser() {
  const [filters, setQueryFilters] = useQueryStates(CARD_FILTER_PARSERS, {
    history: "replace",
    clearOnDefault: true,
  });

  const setFilters = useCallback(
    (next: CardFilterUpdate) => {
      void setQueryFilters(next);
    },
    [setQueryFilters],
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);

  // Each language is its own catalogue of sets, not a translation of one.
  const language: TcgLanguage = isTcgLanguage(filters.lang)
    ? filters.lang
    : DEFAULT_TCG_LANGUAGE;

  const pocketSetIds = usePocketSetIds(language);
  const { data: sets } = useTcgSets(language);
  const { data: rarities } = useTcgRarities(language);
  const { data: stages } = useTcgStages(language);
  const { data: suffixes } = useTcgSuffixes(language);
  const { data: regulationMarks } = useTcgRegulationMarks(language);
  const { data: trainerTypes } = useTcgTrainerTypes(language);
  const { data: energyTypes } = useTcgEnergyTypes(language);

  const game: GameFilter = isGameFilter(filters.game) ? filters.game : "all";
  const scope: CardScope = isCardScope(filters.scope)
    ? filters.scope
    : "latest";

  // A plain browse opens on the newest sets. Searching by name or asking for a
  // set is asking about the whole catalogue, so the scope steps aside there.
  const scopeMatters = scopeApplies(filters);
  const scopeIsLive = scope === "latest" && scopeMatters;
  const { setIds: latestSetIds, isReady: latestSetsReady } = useLatestSetIds(
    game,
    language,
  );

  const searchFilters = useMemo(
    () => toCardSearchFilters(filters, scopeIsLive ? latestSetIds : undefined),
    [filters, latestSetIds, scopeIsLive],
  );

  const {
    cards,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = useTcgCardSearch(searchFilters, {
    language,
    // Firing before the set list lands would search everything and flash
    // twenty-year-old promos onto the screen.
    enabled: !scopeIsLive || latestSetsReady,
  });

  // Waiting on the set list reads as loading, because that is what it is: the
  // search cannot be asked until the newest sets are known.
  const isLoadingCards = isLoading || (scopeIsLive && !latestSetsReady);

  // Re-filtering keeps the old results on screen; dimming them says the list
  // being read is about to be replaced.
  const isRefiltering = isFetching && !isFetchingNextPage && cards.length > 0;

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0,
      rootMargin: "400px",
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  // The toolbar's second row folds away while the grid is scrolled, the same
  // way the dex toolbar does, so more artwork stays on screen.
  const lastScrollY = useRef(0);
  useEffect(() => {
    const scrollContainer = document.querySelector("main");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      const delta = currentScrollY - lastScrollY.current;

      if (Math.abs(delta) > 50) {
        if (delta > 0 && currentScrollY > 100) setToolbarCollapsed(true);
        else if (delta < 0) setToolbarCollapsed(false);
        lastScrollY.current = currentScrollY;
      }

      if (currentScrollY < 50) setToolbarCollapsed(false);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const sortedRarities = useMemo(
    () => sortRarities(rarities ?? []),
    [rarities],
  );

  const selectedSet = useMemo(
    () => sets?.find((set) => set.id === filters.set) ?? null,
    [sets, filters.set],
  );

  // Sets narrow to the chosen game so the picker matches the rest of the page.
  const availableSets = useMemo(() => {
    if (!sets) return [];
    if (game === "all") return sets;
    return sets.filter((set) => gameForSetId(set.id, pocketSetIds) === game);
  }, [sets, game, pocketSetIds]);

  const crossReferencedPokemon = useMemo(() => {
    if (filters.dexId === null) return null;
    const species = resolveSpecies(filters.dexId);
    return species ? { name: species.name, id: species.num } : null;
  }, [filters.dexId]);

  // Chips for everything currently narrowing the list, each one removable.
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: CardFilterUpdate }[] = [];

    if (selectedSet) {
      chips.push({
        key: "set",
        label: selectedSet.name,
        clear: { set: null },
      });
    } else if (filters.set) {
      chips.push({ key: "set", label: filters.set, clear: { set: null } });
    }

    for (const type of filters.types) {
      chips.push({
        key: `type-${type}`,
        label: type,
        clear: {
          types: filters.types.filter((entry) => entry !== type),
        },
      });
    }

    for (const rarity of filters.rarities) {
      chips.push({
        key: `rarity-${rarity}`,
        label: rarity,
        clear: {
          rarities: filters.rarities.filter((entry) => entry !== rarity),
        },
      });
    }

    if (filters.category) {
      chips.push({
        key: "category",
        label: filters.category,
        clear: { category: null },
      });
    }

    if (filters.stage) {
      chips.push({
        key: "stage",
        label: filters.stage,
        clear: { stage: null },
      });
    }

    if (filters.suffix) {
      chips.push({
        key: "suffix",
        label: filters.suffix,
        clear: { suffix: null },
      });
    }

    if (filters.regulationMark) {
      chips.push({
        key: "regulationMark",
        label: `Regulation ${filters.regulationMark}`,
        clear: { regulationMark: null },
      });
    }

    if (filters.trainerType) {
      chips.push({
        key: "trainerType",
        label: filters.trainerType,
        clear: { trainerType: null },
      });
    }

    if (filters.energyType) {
      chips.push({
        key: "energyType",
        label: `${filters.energyType} energy`,
        clear: { energyType: null },
      });
    }

    for (const variant of filters.variants) {
      chips.push({
        key: `variant-${variant}`,
        label: variantLabel(variant),
        clear: {
          variants: filters.variants.filter((entry) => entry !== variant),
        },
      });
    }

    if (filters.hpMin !== null || filters.hpMax !== null) {
      const label =
        filters.hpMin !== null && filters.hpMax !== null
          ? `HP ${filters.hpMin}-${filters.hpMax}`
          : filters.hpMin !== null
            ? `HP ${filters.hpMin}+`
            : `HP ≤ ${filters.hpMax}`;
      chips.push({ key: "hp", label, clear: { hpMin: null, hpMax: null } });
    }

    if (filters.illustrator) {
      chips.push({
        key: "illustrator",
        label: `illus. ${filters.illustrator}`,
        clear: { illustrator: null },
      });
    }

    return chips;
  }, [
    filters.category,
    filters.hpMax,
    filters.hpMin,
    filters.illustrator,
    filters.rarities,
    filters.set,
    filters.stage,
    filters.suffix,
    filters.regulationMark,
    filters.trainerType,
    filters.energyType,
    filters.variants,
    filters.types,
    selectedSet,
  ]);

  const panelFilterCount = activeChips.length;

  const hasAnyFilter =
    panelFilterCount > 0 || filters.q.length > 0 || filters.dexId !== null;

  const clearAll = () =>
    setFilters({
      set: null,
      types: null,
      rarities: null,
      category: null,
      stage: null,
      suffix: null,
      regulationMark: null,
      trainerType: null,
      energyType: null,
      variants: null,
      illustrator: null,
      hpMin: null,
      hpMax: null,
      dexId: null,
    });

  const resultLabel =
    isLoadingCards && cards.length === 0
      ? "loading..."
      : `${cards.length}${hasNextPage ? "+" : ""} cards`;

  return (
    <div>
      <div className="pwa-sticky-toolbar sticky top-0 z-30 border-b bg-background px-4 py-3 md:px-6 lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/80">
        <CardsFilterBar
          filters={filters}
          setFilters={setFilters}
          game={game}
          scope={scope}
          scopeMatters={scopeMatters}
          sets={availableSets}
          selectedSet={selectedSet}
          language={language}
          hasPocket={pocketSetIds.length > 0}
          rarities={sortedRarities}
          stages={stages ?? []}
          suffixes={suffixes ?? []}
          regulationMarks={regulationMarks ?? []}
          trainerTypes={trainerTypes ?? []}
          energyTypes={energyTypes ?? []}
          panelFilterCount={panelFilterCount}
          resultLabel={resultLabel}
          collapsed={toolbarCollapsed}
        />
      </div>

      <div className="p-4 md:p-6">
        {/* An unfiltered browse opens on 1999 promos, so the newest sets lead */}
        {!hasAnyFilter && <LatestSetsRail game={game} language={language} />}

        {/* What is currently narrowing the list, and how to undo any of it */}
        {(crossReferencedPokemon || activeChips.length > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {crossReferencedPokemon && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground py-1 pl-2.5 pr-1 text-xs font-medium text-background">
                <Link
                  href={`/pokemon/${toID(crossReferencedPokemon.name)}`}
                  className="hover:underline"
                >
                  {crossReferencedPokemon.name} #
                  {crossReferencedPokemon.id.toString().padStart(3, "0")}
                </Link>
                <button
                  type="button"
                  onClick={() => setFilters({ dexId: null })}
                  title="Clear Pokemon filter"
                  className="p-0.5 opacity-70 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-2.5 pr-1 text-xs font-medium text-muted-foreground"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => setFilters(chip.clear)}
                  title={`Remove ${chip.label}`}
                  className="p-0.5 hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}

            {activeChips.length > 1 && (
              <button
                type="button"
                onClick={clearAll}
                className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                clear all
              </button>
            )}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-3 sm:hidden">
          <p className="text-xs tabular-nums text-muted-foreground">
            {resultLabel}
          </p>
          <Link
            href={withTcgLanguage("/cards/sets", language)}
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            browse sets →
          </Link>
        </div>

        {isError ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Could not load cards right now.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Card data comes from TCGdex — check your connection and try again.
            </p>
          </div>
        ) : (
          <div aria-busy={isRefiltering}>
            <TcgCardGrid
              className={cn(
                "transition-opacity duration-150",
                isRefiltering && "opacity-50",
              )}
              cards={cards}
              language={language}
              pocketSetIds={pocketSetIds}
              showGame={game === "all"}
              isLoading={isLoadingCards}
              skeletonCount={CARDS_PER_PAGE}
              emptyMessage={
                scopeIsLive
                  ? "No cards in the newest sets match these filters"
                  : "No cards match these filters"
              }
              emptyAction={
                // Inside the newest sets, widening is the likelier fix — the
                // filters may well have matches further back in the catalogue.
                scopeIsLive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ scope: "all" })}
                  >
                    search every set
                  </Button>
                ) : panelFilterCount > 0 ? (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    clear filters
                  </Button>
                ) : undefined
              }
            />

            {hasNextPage ? (
              <div
                ref={loadMoreRef}
                className="flex justify-center py-8 text-xs text-muted-foreground"
              >
                loading more...
              </div>
            ) : (
              cards.length > 0 && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <p className="text-center text-xs tabular-nums text-muted-foreground">
                    {scopeIsLive ? "end of the newest sets" : "end of results"}{" "}
                    — {cards.length} card{cards.length === 1 ? "" : "s"}
                  </p>
                  {scopeIsLive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ scope: "all" })}
                    >
                      keep going through every set
                    </Button>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      <BackToTop />
    </div>
  );
}

function CardsPageSkeleton() {
  return (
    <div>
      <div className="sticky top-0 z-30 border-b bg-background px-4 py-3 md:px-6">
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <div className="flex gap-1">
            {["all", "tcg", "pocket"].map((key) => (
              <Skeleton key={key} className={cn("h-6 w-20 rounded-full")} />
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 md:p-6">
        <TcgCardGrid cards={[]} isLoading skeletonCount={CARDS_PER_PAGE} />
      </div>
    </div>
  );
}
