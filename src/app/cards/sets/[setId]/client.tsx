"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { BackToTop, GameBadge, SectionLabel } from "@/components/tcg";
import { Button } from "@/components/ui/button";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { usePocketSetIds } from "@/hooks/use-tcg";
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
import { CardBrowser } from "../../card-browser";

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

  // How much of the set is already in your favourites — the number a collector
  // opens a set page to see. Counted against the set's own card list, which
  // the server sends whole, so it is the real total rather than however far
  // the grid below has been scrolled.
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
            <Button asChild variant="ghost" size="sm">
              <Link href={withTcgLanguage("/cards/sets", language)}>
                all sets
              </Link>
            </Button>
          </div>
        </div>

        {/* How many of the set's cards exist in each printing — the numbers a
            master-set collector counts against. Each one now narrows the grid
            below rather than sending you to another page to see it, because
            the grid below is that page. */}
        {printingCounts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <SectionLabel className="w-full">printings</SectionLabel>
            {printingCounts.map(({ key, count }) => (
              <Link
                key={key}
                href={withTcgLanguage(
                  `/cards/sets/${set.id.toLowerCase()}?variants=${key}`,
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

        {/* What you already have of it. The count is the whole set's, not the
            grid's — the browser below pages, and a collector's number must not
            change with how far they have scrolled. */}
        {favoriteCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <SectionLabel className="w-full">yours</SectionLabel>
            <Link
              href="/favorites"
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Heart className="size-3 fill-current text-rose-500" />
              <span className="tabular-nums">
                {favoriteCount} of {listed}
              </span>{" "}
              favorited
            </Link>
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

        <div className="mt-3 sm:hidden">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={withTcgLanguage("/cards/sets", language)}>
              all sets
            </Link>
          </Button>
        </div>
      </header>

      {/* The card browser, pinned to this set. A set page used to have its own
          smaller search — a name field and nothing else — because the set's
          payload carries only names and numbers. Asking the API instead is
          what lets rarity, printing, HP, illustrator and the rest work here
          exactly as they do on `/cards`. */}
      <CardBrowser lockedSet={set} lockedLanguage={language} />

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
