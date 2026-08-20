"use client";

import { Loader2, Maximize2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardsFilterBar } from "@/app/cards/filter-bar";
import {
  type CardFilterState,
  type CardFilterUpdate,
  SET_ORDER_SORT_VALUE,
  toCardSearchFilters,
} from "@/app/cards/filters";
import { Chip } from "@/components/tcg/tcg-chip";
import type { DeckPool } from "@/hooks/use-deck-pool";
import {
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
import {
  briefPoolReason,
  copyLimitName,
  nameSuggestsBasicEnergy,
} from "@/lib/deck";
import { cn } from "@/lib/utils";
import type { Deck, DeckFormat } from "@/types/deck";
import type { TcgCardBrief, TcgLanguage } from "@/types/tcg";
import {
  DEFAULT_TCG_LANGUAGE,
  formatLocalId,
  gameForSetId,
  setIdFromCardId,
  sortRarities,
} from "@/types/tcg";
import { TcgCardImage } from "../tcg-card-image";
import { TcgCardTileSkeleton } from "../tcg-card-tile";
import { type DragCard, useDeckDragSource } from "./deck-drag";

/** The builder's own search state — the deck's URL belongs to the deck. */
const DEFAULT_FILTERS: CardFilterState = {
  q: "",
  game: "all",
  set: "",
  types: [],
  rarities: [],
  category: "",
  stage: "",
  suffix: "",
  regulationMark: "",
  trainerType: "",
  energyType: "",
  variants: [],
  illustrator: "",
  hpMin: null,
  hpMax: null,
  dexId: null,
  // The pool is read in set order. A browse opens on a shuffle because the
  // catalogue is too big to read front to back; a deck builder is looking for
  // a particular card, and cards that move between searches are harder to find.
  sort: SET_ORDER_SORT_VALUE,
  // The format already decides how much of the catalogue is in play, so the
  // browse's "newest sets" scope would narrow it a second time.
  scope: "all",
  seed: null,
  lang: DEFAULT_TCG_LANGUAGE,
};

function applyUpdate(
  state: CardFilterState,
  update: CardFilterUpdate,
): CardFilterState {
  const next: CardFilterState = { ...state };
  for (const key of Object.keys(update) as (keyof CardFilterState)[]) {
    // Null clears a filter, exactly as it does in the URL-driven browse.
    Object.assign(next, { [key]: update[key] ?? DEFAULT_FILTERS[key] });
  }
  return next;
}

interface DeckSearchPanelProps {
  deck: Deck;
  format: DeckFormat;
  pool: DeckPool;
  language: TcgLanguage;
  /** Cards being fetched before they can join the deck. */
  pendingIds: Set<string>;
  onAdd: (card: DragCard) => void;
  onPeek: (card: TcgCardBrief) => void;
}

/**
 * The card pool, filtered to what this deck may actually play.
 *
 * A deck builder's search is not the catalogue browser: it is scoped to the
 * format before a single filter is touched, because a Standard list has no use
 * for a card that rotated out three years ago. Everything else — energy type,
 * stage, Trainer type, HP — narrows within that, and every result says how many
 * copies the deck already holds.
 */
export function DeckSearchPanel({
  deck,
  format,
  pool,
  language,
  pendingIds,
  onAdd,
  onPeek,
}: DeckSearchPanelProps) {
  const [filters, setFilterState] = useState<CardFilterState>(DEFAULT_FILTERS);
  const [legalOnly, setLegalOnly] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const setFilters = useCallback((update: CardFilterUpdate) => {
    setFilterState((current) => applyUpdate(current, update));
  }, []);

  const pocketSetIds = usePocketSetIds(language);
  const { data: sets } = useTcgSets(language);
  const { data: rarities } = useTcgRarities(language);
  const { data: stages } = useTcgStages(language);
  const { data: suffixes } = useTcgSuffixes(language);
  const { data: regulationMarks } = useTcgRegulationMarks(language);
  const { data: trainerTypes } = useTcgTrainerTypes(language);
  const { data: energyTypes } = useTcgEnergyTypes(language);

  // The format's pool is the floor the search stands on; the player's filters
  // narrow within it. Turning the format off widens the search to the whole
  // game rather than merely un-hiding what came back — otherwise there would
  // be no way to reach a card the pool has wrong.
  const searchFilters = useMemo(() => {
    const base = toCardSearchFilters(filters);
    const merged = legalOnly
      ? { ...base, ...pool.filters }
      : { ...base, game: format.game };
    if (filters.set) merged.setIds = [filters.set];
    if (filters.regulationMark) {
      merged.regulationMark = filters.regulationMark;
    }
    return merged;
  }, [filters, pool.filters, legalOnly, format.game]);

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
    enabled: pool.isReady,
  });

  // The rotation is already applied by the search; what is left to catch is a
  // set outside the pool and a mechanic the format bans, both of which a
  // result's id and name give away.
  const results = useMemo(() => {
    if (!legalOnly) return cards;
    return cards.filter(
      (card) => briefPoolReason(card, format, pool.context) === null,
    );
  }, [cards, legalOnly, format, pool.context]);

  // The copy limit counts names, not printings, so a fourth copy from another
  // set has to know about the three already in the deck.
  const countsByName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of deck.entries) {
      const name = copyLimitName(entry.card);
      counts.set(name, (counts.get(name) ?? 0) + entry.count);
    }
    return counts;
  }, [deck.entries]);

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

  const availableSets = useMemo(() => {
    if (!sets) return [];
    return sets.filter(
      (set) => gameForSetId(set.id, pocketSetIds) === format.game,
    );
  }, [sets, pocketSetIds, format.game]);

  const selectedSet = useMemo(
    () => sets?.find((set) => set.id === filters.set) ?? null,
    [sets, filters.set],
  );

  const activeFilterCount = useMemo(
    () =>
      [
        filters.set,
        filters.category,
        filters.stage,
        filters.suffix,
        filters.regulationMark,
        filters.trainerType,
        filters.energyType,
        filters.illustrator,
        filters.hpMin !== null || filters.hpMax !== null ? "hp" : "",
      ].filter(Boolean).length +
      filters.types.length +
      filters.rarities.length +
      filters.variants.length,
    [filters],
  );

  const isLoadingCards = isLoading || !pool.isReady;
  const isRefiltering = isFetching && !isFetchingNextPage && cards.length > 0;

  return (
    <div className="@container flex h-full flex-col">
      <div className="shrink-0 border-b bg-background px-3 py-3">
        <CardsFilterBar
          variant="builder"
          filters={filters}
          setFilters={setFilters}
          game={format.game}
          order={filters.sort}
          shuffleSeed={null}
          onOrderChange={(value) =>
            setFilters({ sort: value === SET_ORDER_SORT_VALUE ? null : value })
          }
          sets={availableSets}
          selectedSet={selectedSet}
          language={language}
          hasPocket={pocketSetIds.length > 0}
          rarities={sortRarities(rarities ?? [])}
          stages={stages ?? []}
          suffixes={suffixes ?? []}
          regulationMarks={regulationMarks ?? []}
          trainerTypes={trainerTypes ?? []}
          energyTypes={energyTypes ?? []}
          panelFilterCount={activeFilterCount}
          resultLabel={
            isLoadingCards
              ? "loading..."
              : `${results.length}${hasNextPage ? "+" : ""}`
          }
        />

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip
            selected={legalOnly}
            onClick={() => setLegalOnly((current) => !current)}
            title={`Only show cards that can be played in ${format.name}`}
          >
            {format.name} only
          </Chip>
          <span className="text-[10px] text-muted-foreground">
            drag a card onto the deck, or tap it
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isError ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Could not load cards right now.
          </p>
        ) : isLoadingCards ? (
          <div className="grid grid-cols-2 gap-2 @sm:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-5">
            {Array.from({ length: 12 }, (_, index) => (
              <TcgCardTileSkeleton key={`deck-search-skeleton-${index}`} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="space-y-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No cards match this search
            </p>
            {legalOnly && (
              <button
                type="button"
                onClick={() => setLegalOnly(false)}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                show cards outside {format.name}
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={cn(
                "grid grid-cols-2 gap-2 transition-opacity @sm:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-5",
                isRefiltering && "opacity-50",
              )}
            >
              {results.map((card) => {
                const name = card.name.trim().toLowerCase();
                return (
                  <SearchResultTile
                    key={card.id}
                    card={card}
                    inDeck={countsByName.get(name) ?? 0}
                    limit={
                      format.basicEnergyUncapped &&
                      nameSuggestsBasicEnergy(card.name)
                        ? null
                        : format.maxCopies
                    }
                    illegalReason={briefPoolReason(card, format, pool.context)}
                    pending={pendingIds.has(card.id)}
                    onAdd={onAdd}
                    onPeek={onPeek}
                  />
                );
              })}
            </div>

            {hasNextPage && (
              <div
                ref={loadMoreRef}
                className="py-6 text-center text-xs text-muted-foreground"
              >
                loading more...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SearchResultTile({
  card,
  inDeck,
  limit,
  illegalReason,
  pending,
  onAdd,
  onPeek,
}: {
  card: TcgCardBrief;
  inDeck: number;
  /** Null where the format lets a deck play any number of them. */
  limit: number | null;
  illegalReason: string | null;
  pending: boolean;
  onAdd: (card: DragCard) => void;
  onPeek: (card: TcgCardBrief) => void;
}) {
  const { dragProps, isDragging, wasDragged } = useDeckDragSource({
    source: "search",
    card,
  });

  const atLimit = limit !== null && inDeck >= limit;

  return (
    <div
      className={cn("group relative", isDragging && "opacity-40")}
      {...dragProps}
    >
      <button
        type="button"
        onClick={() => {
          if (wasDragged()) return;
          onAdd(card);
        }}
        title={
          illegalReason
            ? `${card.name} — ${illegalReason}`
            : atLimit
              ? `${card.name} — already at ${inDeck} copies`
              : `Add ${card.name} to the deck`
        }
        className={cn(
          "relative block w-full bg-muted/30 ring-1 ring-transparent transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "md:hover:ring-foreground/40 md:active:scale-[0.98]",
          atLimit && "opacity-45",
        )}
      >
        <TcgCardImage
          image={card.image}
          alt={card.name}
          localId={card.localId}
          setName={setIdFromCardId(card.id)}
        />

        {inDeck > 0 && (
          <span
            className={cn(
              "absolute bottom-1 left-1 rounded-sm bg-background/90 px-1 py-0.5 text-[10px] font-semibold tabular-nums backdrop-blur",
              atLimit && "text-muted-foreground",
            )}
          >
            {inDeck}
            {limit !== null && `/${limit}`}
          </span>
        )}

        {illegalReason && (
          <span className="absolute left-1 top-1 rounded-sm bg-destructive/90 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white">
            {illegalReason}
          </span>
        )}

        {pending && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </span>
        )}

        {/* The affordance a drag has no way of showing: this card goes in. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-foreground/85 py-1 text-[10px] font-medium uppercase tracking-wider text-background opacity-0 transition-opacity md:group-hover:opacity-100">
          <Plus className="size-3" />
          add
        </span>
      </button>

      <button
        type="button"
        onClick={() => onPeek(card)}
        title={`Look closer at ${card.name}`}
        aria-label={`Look closer at ${card.name}`}
        className="absolute right-1 top-1 hidden size-6 items-center justify-center bg-background/85 text-muted-foreground backdrop-blur transition-colors hover:text-foreground md:flex md:opacity-0 md:group-hover:opacity-100"
      >
        <Maximize2 className="size-3.5" />
      </button>

      <p className="mt-1 truncate px-0.5 text-[10px] text-muted-foreground">
        {card.name}{" "}
        <span className="tabular-nums">{formatLocalId(card.localId)}</span>
      </p>
    </div>
  );
}
