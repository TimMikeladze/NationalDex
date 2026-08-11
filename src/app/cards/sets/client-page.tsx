"use client";

import { ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { Suspense, useMemo, useState } from "react";
import { Chip } from "@/components/tcg";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePocketSetIds, useTcgSeriesWithSets } from "@/hooks/use-tcg";
import type { TcgGame, TcgLanguage, TcgSerie } from "@/types/tcg";
import {
  assetUrl,
  DEFAULT_TCG_LANGUAGE,
  gameForSetId,
  isTcgLanguage,
  POCKET_SERIE_ID,
  TCG_GAME_FULL_LABELS,
  TCG_LANGUAGES,
  withTcgLanguage,
} from "@/types/tcg";

type GameFilter = "all" | TcgGame;

const GAME_OPTIONS: { id: GameFilter; label: string; title: string }[] = [
  { id: "all", label: "All", title: "Both card games" },
  { id: "tcg", label: "TCG", title: TCG_GAME_FULL_LABELS.tcg },
  { id: "pocket", label: "Pocket", title: TCG_GAME_FULL_LABELS.pocket },
];

const SKELETON_KEYS = Array.from(
  { length: 4 },
  (_, i) => `serie-skeleton-${i}`,
);

export function CardSetsPageClient() {
  return (
    <Suspense fallback={null}>
      <CardSetsIndex />
    </Suspense>
  );
}

function CardSetsIndex() {
  const [lang, setLang] = useQueryState(
    "lang",
    parseAsString.withDefault(DEFAULT_TCG_LANGUAGE).withOptions({
      history: "replace",
      clearOnDefault: true,
    }),
  );

  // Each language prints its own sets — Japanese has 173 English never got.
  const language: TcgLanguage = isTcgLanguage(lang)
    ? lang
    : DEFAULT_TCG_LANGUAGE;

  const { data: series, isLoading, isError } = useTcgSeriesWithSets(language);
  const pocketSetIds = usePocketSetIds(language);
  const [game, setGame] = useState<GameFilter>("all");
  const [search, setSearch] = useState("");

  const filteredSeries = useMemo(() => {
    if (!series) return [];
    const query = search.trim().toLowerCase();

    return series
      .map((serie) => ({
        ...serie,
        sets: serie.sets.filter((set) => {
          if (game === "pocket" && serie.id !== POCKET_SERIE_ID) return false;
          if (game === "tcg" && serie.id === POCKET_SERIE_ID) return false;
          if (!query) return true;
          return (
            set.name.toLowerCase().includes(query) ||
            set.id.toLowerCase().includes(query) ||
            serie.name.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((serie) => serie.sets.length > 0)
      .sort((a, b) => {
        // Pocket first when it is the focus, otherwise newest series first.
        if (a.id === POCKET_SERIE_ID) return game === "all" ? 1 : -1;
        if (b.id === POCKET_SERIE_ID) return game === "all" ? -1 : 1;
        return 0;
      });
  }, [series, search, game]);

  // Pocket is an English-catalogue-only series, so the chip only makes sense
  // where it actually has sets.
  const hasPocket = (series ?? []).some(
    (serie) => serie.id === POCKET_SERIE_ID && serie.sets.length > 0,
  );

  const totalSets = filteredSeries.reduce(
    (sum, serie) => sum + serie.sets.length,
    0,
  );

  return (
    <div>
      <div className="pwa-sticky-toolbar sticky top-0 z-30 border-b bg-background px-4 py-3 md:px-6 lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/80">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sets..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {GAME_OPTIONS.filter(
                (option) => hasPocket || option.id !== "pocket",
              ).map((option) => (
                <Chip
                  key={option.id}
                  selected={game === option.id}
                  title={option.title}
                  onClick={() => setGame(option.id)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
            <Select
              value={language}
              onValueChange={(value) => {
                void setLang(value === DEFAULT_TCG_LANGUAGE ? null : value);
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-28 shrink-0 border-0 bg-muted text-xs"
                title="Card catalogue language"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {TCG_LANGUAGES.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.native}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!isLoading && (
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {totalSets} set{totalSets === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {isError ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Could not load card sets right now.
            </p>
          </div>
        ) : isLoading ? (
          <div className="space-y-8">
            {SKELETON_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <div className="grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={`${key}-set-${index}`} className="h-16" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No sets found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSeries.map((serie) => (
              <SerieSection
                key={serie.id}
                serie={serie}
                pocketSetIds={pocketSetIds}
                language={language}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SerieSection({
  serie,
  pocketSetIds,
  language,
}: {
  serie: TcgSerie;
  pocketSetIds: string[];
  language: TcgLanguage;
}) {
  return (
    <section>
      {/* Sticks under the toolbar so the series you are in stays named while
          scrolling a list of two hundred sets. */}
      <div className="sticky top-[6.5rem] z-20 mb-2 flex items-baseline justify-between gap-3 border-b bg-background pb-1.5 pt-1">
        <h2 className="truncate text-sm font-medium">{serie.name}</h2>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
          {serie.sets.length} set{serie.sets.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
        {serie.sets.map((set) => {
          const logo = assetUrl(set.logo);
          const symbol = assetUrl(set.symbol);
          const game = gameForSetId(set.id, pocketSetIds);
          const hasSecrets = set.cardCount.total !== set.cardCount.official;

          return (
            <Link
              key={set.id}
              href={withTcgLanguage(
                `/cards/sets/${set.id.toLowerCase()}`,
                language,
              )}
              className="group flex items-center gap-3 border-b py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center">
                {logo ? (
                  // biome-ignore lint/performance/noImgElement: external set logo
                  <img
                    src={logo}
                    alt=""
                    className="max-h-10 w-full object-contain"
                    loading="lazy"
                  />
                ) : symbol ? (
                  // biome-ignore lint/performance/noImgElement: external set symbol
                  <img
                    src={symbol}
                    alt=""
                    className="size-7 object-contain"
                    loading="lazy"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{set.name}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {set.cardCount.official} cards
                  {hasSecrets ? ` · ${set.cardCount.total} with secrets` : ""}
                </p>
              </div>

              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {game === "pocket" ? "pocket" : set.id}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
