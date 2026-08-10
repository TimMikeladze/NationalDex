"use client";

import { Heart, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BackToTop,
  Chip,
  GameBadge,
  SectionLabel,
  TcgCardGrid,
} from "@/components/tcg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { usePocketSetIds } from "@/hooks/use-tcg";
import { cn } from "@/lib/utils";
import type { TcgLanguage, TcgSet, TcgVariantKey } from "@/types/tcg";
import {
  assetUrl,
  DEFAULT_TCG_LANGUAGE,
  formatReleaseDate,
  gameForSetId,
  TCG_VARIANT_LABELS,
  tcgLanguageLabel,
  withTcgLanguage,
} from "@/types/tcg";

interface SetDetailClientProps {
  set: TcgSet;
  /** Which catalogue this set was read from — sets differ between them. */
  language: TcgLanguage;
}

export function SetDetailClient({
  set,
  language = DEFAULT_TCG_LANGUAGE,
}: SetDetailClientProps) {
  const pocketSetIds = usePocketSetIds(language);
  const game = gameForSetId(set.id, pocketSetIds);
  const { isFavoriteCard } = useCardFavorites();
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // How much of the set is already in your favourites — the number a collector
  // opens a set page to see.
  const favoriteCount = useMemo(
    () => set.cards.filter((card) => isFavoriteCard(card.id)).length,
    [set.cards, isFavoriteCard],
  );

  const logo = assetUrl(set.logo);
  const symbol = assetUrl(set.symbol);
  const hasSecrets = set.cardCount.total !== set.cardCount.official;

  // A handful of sets advertise more cards than TCGdex has actually catalogued
  // — Jumbo cards claims 160 and lists none. Saying so beats a header that
  // promises cards the grid below cannot show.
  const listed = set.cards.length;
  const uncatalogued = Math.max(0, set.cardCount.total - listed);

  // `firstEd` in the set's counts is `firstEdition` in a card's variants.
  const printingCounts = useMemo(() => {
    const counts: [TcgVariantKey, number | undefined][] = [
      ["normal", set.cardCount.normal],
      ["reverse", set.cardCount.reverse],
      ["holo", set.cardCount.holo],
      ["firstEdition", set.cardCount.firstEd],
    ];
    return counts
      .filter((entry): entry is [TcgVariantKey, number] => Boolean(entry[1]))
      .map(([key, count]) => ({ key, count }));
  }, [set.cardCount]);

  const cards = useMemo(() => {
    const query = search.trim().toLowerCase();
    return set.cards.filter((card) => {
      if (favoritesOnly && !isFavoriteCard(card.id)) return false;
      if (!query) return true;
      return (
        card.name.toLowerCase().includes(query) ||
        card.localId.toLowerCase().includes(query)
      );
    });
  }, [set.cards, search, favoritesOnly, isFavoriteCard]);

  return (
    <div>
      <header className="border-b px-4 py-4 md:px-6">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center md:size-20">
            {logo ? (
              // biome-ignore lint/performance/noImgElement: external set logo
              <img
                src={logo}
                alt=""
                className="max-h-16 w-full object-contain md:max-h-20"
              />
            ) : symbol ? (
              // biome-ignore lint/performance/noImgElement: external set symbol
              <img src={symbol} alt="" className="size-10 object-contain" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-medium leading-tight">{set.name}</h1>
              <GameBadge game={game} />
              {language !== DEFAULT_TCG_LANGUAGE && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {tcgLanguageLabel(language)}
                </span>
              )}
            </div>
            <p className="text-xs tabular-nums text-muted-foreground">
              {set.serie?.name}
              {set.releaseDate
                ? ` · ${formatReleaseDate(set.releaseDate)}`
                : ""}
              {` · ${set.cardCount.official} cards`}
              {hasSecrets ? ` (${set.cardCount.total} with secrets)` : ""}
              {uncatalogued > 0 ? ` · ${listed} catalogued` : ""}
            </p>
            {set.legal && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <LegalityBadge label="Standard" legal={set.legal.standard} />
                <LegalityBadge label="Expanded" legal={set.legal.expanded} />
              </div>
            )}
          </div>

          <div className="hidden shrink-0 gap-2 sm:flex">
            <Button asChild variant="outline" size="sm">
              <Link href={withTcgLanguage(`/cards?set=${set.id}`, language)}>
                filter in browser
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={withTcgLanguage("/cards/sets", language)}>
                all sets
              </Link>
            </Button>
          </div>
        </div>

        {/* How many of the set's cards exist in each printing — the numbers a
            master-set collector counts against, each one a way into the
            browser filtered to exactly those cards. */}
        {printingCounts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <SectionLabel className="w-full">printings</SectionLabel>
            {printingCounts.map(({ key, count }) => (
              <Link
                key={key}
                href={withTcgLanguage(
                  `/cards?set=${set.id}&variants=${key}`,
                  language,
                )}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {TCG_VARIANT_LABELS[key]}{" "}
                <span className="tabular-nums">{count}</span>
              </Link>
            ))}
          </div>
        )}

        {set.boosters && set.boosters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <SectionLabel className="w-full">boosters</SectionLabel>
            {set.boosters.map((booster) => (
              <span
                key={booster.id}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {booster.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2 sm:hidden">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={withTcgLanguage(`/cards?set=${set.id}`, language)}>
              filter in browser
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="flex-1">
            <Link href={withTcgLanguage("/cards/sets", language)}>
              all sets
            </Link>
          </Button>
        </div>
      </header>

      <div className="pwa-sticky-toolbar sticky top-0 z-30 border-b bg-background px-4 py-3 md:px-6 lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={`Search ${set.name}...`}
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
          {favoriteCount > 0 && (
            <Chip
              selected={favoritesOnly}
              onClick={() => setFavoritesOnly((current) => !current)}
              title={`${favoriteCount} of ${set.cards.length} favorited`}
              className="flex shrink-0 items-center gap-1"
            >
              <Heart
                className={cn("size-3", favoritesOnly && "fill-current")}
              />
              <span className="tabular-nums">{favoriteCount}</span>
            </Chip>
          )}
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {cards.length === set.cards.length
              ? `${set.cards.length} cards`
              : `${cards.length} of ${set.cards.length}`}
          </span>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <TcgCardGrid
          cards={cards}
          language={language}
          pocketSetIds={pocketSetIds}
          showGame={false}
          emptyMessage={
            favoritesOnly
              ? "No favorited cards match"
              : listed === 0
                ? "TCGdex lists this set but has not catalogued its cards yet"
                : "No cards match that search"
          }
        />
      </div>

      <BackToTop />
    </div>
  );
}

function LegalityBadge({ label, legal }: { label: string; legal: boolean }) {
  return (
    <span
      className={
        legal
          ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400"
          : "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
      }
    >
      <span aria-hidden>{legal ? "✓" : "✕"}</span>
      {label}
      <span className="sr-only">{legal ? "legal" : "not legal"}</span>
    </span>
  );
}
