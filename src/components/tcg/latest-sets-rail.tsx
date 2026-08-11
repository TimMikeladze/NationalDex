"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePocketSetIds, useTcgSets } from "@/hooks/use-tcg";
import type { TcgGame, TcgLanguage } from "@/types/tcg";
import {
  assetUrl,
  DEFAULT_TCG_LANGUAGE,
  gameForSetId,
  withTcgLanguage,
} from "@/types/tcg";
import { GameBadge } from "./game-badge";
import { SectionLabel } from "./tcg-chip";

const SKELETON_KEYS = Array.from({ length: 6 }, (_, i) => `latest-set-${i}`);

const RAIL_LIMIT = 10;

/**
 * The newest sets, as a way into the card database. Browsing 20,000 cards in
 * printed order opens on 1999 promos, which is nobody's starting point — the
 * set that just released is. TCGdex lists sets oldest-first, so the newest ones
 * are the tail.
 */
export function LatestSetsRail({
  game,
  language = DEFAULT_TCG_LANGUAGE,
}: {
  game: "all" | TcgGame;
  language?: TcgLanguage;
}) {
  const { data: sets, isLoading } = useTcgSets(language);
  const pocketSetIds = usePocketSetIds(language);

  const latest = useMemo(() => {
    if (!sets) return [];
    const scoped =
      game === "all"
        ? sets
        : sets.filter((set) => gameForSetId(set.id, pocketSetIds) === game);
    return scoped.slice(-RAIL_LIMIT).reverse();
  }, [sets, game, pocketSetIds]);

  if (!isLoading && latest.length === 0) return null;

  return (
    <section className="mb-6 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>latest sets</SectionLabel>
        <Link
          href={withTcgLanguage("/cards/sets", language)}
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          all sets
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Bleeds to the page edge so the rail reads as scrollable on a phone */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <div className="flex w-max gap-2">
          {isLoading
            ? SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-[4.5rem] w-40" />
              ))
            : latest.map((set) => {
                const logo = assetUrl(set.logo);
                const symbol = assetUrl(set.symbol);

                return (
                  <Link
                    key={set.id}
                    href={withTcgLanguage(
                      `/cards/sets/${set.id.toLowerCase()}`,
                      language,
                    )}
                    className="flex h-[4.5rem] w-40 shrink-0 flex-col justify-between border p-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-6 min-w-0 flex-1 items-start">
                        {logo ? (
                          // biome-ignore lint/performance/noImgElement: external set logo
                          <img
                            src={logo}
                            alt=""
                            className="max-h-6 max-w-full object-contain object-left"
                            loading="lazy"
                          />
                        ) : symbol ? (
                          // biome-ignore lint/performance/noImgElement: external set symbol
                          <img
                            src={symbol}
                            alt=""
                            className="size-6 object-contain"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      {game === "all" && (
                        <GameBadge
                          game={gameForSetId(set.id, pocketSetIds)}
                          className="shrink-0"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{set.name}</p>
                      <p className="text-[10px] tabular-nums text-muted-foreground">
                        {set.cardCount.official} cards
                      </p>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
}
