"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import Link from "@/components/link";
import { DexIcon } from "@/components/navigation/app-icons";
import {
  useDexFilter,
  useFilteredPokemon,
} from "@/components/pokemon/dex-filter";
import { PokemonSwipeDeck } from "@/components/pokemon/pokemon-swipe-deck";
import { Chip } from "@/components/tcg/tcg-chip";
import { Button } from "@/components/ui/button";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { getDexPokemonList } from "@/lib/dex-pokemon";
import { GEN_RANGES } from "@/lib/pkmn";

export function PokemonSwipePageClient() {
  return (
    <Suspense fallback={<SwipeSkeleton />}>
      <PokemonSwipeBrowser />
    </Suspense>
  );
}

/**
 * The dex, one Pokémon at a time. It reads the dex's own filter — the same
 * query string and the same remembered state — so narrowing the grid and then
 * coming here deals exactly the Pokémon you were looking at.
 */
function PokemonSwipeBrowser() {
  const [filter, setFilter] = useDexFilter();
  const searchParams = useSearchParams();
  const { preferredGeneration } = useGenerationPreference();
  const { speciesCutoffGeneration } = useSpritePreferences();

  // The grid works in names; the deck needs the whole entry — stats, flags —
  // so the filtered names are looked up in the same list they came from.
  const allPokemon = useMemo(
    () =>
      getDexPokemonList(preferredGeneration, {
        forms: "distinct-sprites",
        speciesCutoffGeneration,
      }),
    [preferredGeneration, speciesCutoffGeneration],
  );
  const { filteredPokemon } = useFilteredPokemon(filter);

  const pokemon = useMemo(() => {
    if (!filteredPokemon) return allPokemon;
    const byName = new Map(allPokemon.map((p) => [p.name, p]));
    return filteredPokemon.flatMap((p) => byName.get(p.name) ?? []);
  }, [allPokemon, filteredPokemon]);

  const query = searchParams.toString();
  const backToDex = query ? `/?${query}` : "/";

  const toggleGeneration = (id: string) =>
    setFilter({
      ...filter,
      // The deck is only ever Pokémon, whatever tab the dex was left on.
      category: "pokemon",
      generations: filter.generations.includes(id)
        ? filter.generations.filter((g) => g !== id)
        : [...filter.generations, id],
    });

  // A different deal is a different deck: remounting starts it from the top
  // instead of leaving the place you had reached in a list that has changed.
  const deckKey = useMemo(
    () =>
      [
        filter.search,
        filter.types.join(","),
        filter.generations.join(","),
        filter.regulations.join(","),
        JSON.stringify(filter.stats),
        JSON.stringify(filter.tags),
        filter.sort,
        filter.sortDirection,
        filter.randomSeed,
        preferredGeneration,
      ].join("|"),
    [filter, preferredGeneration],
  );

  return (
    // Sized to the room the shell has measured, exactly like the card deck:
    // the card takes whatever is left and is never something to scroll to.
    <div className="mx-auto flex h-(--app-content-height) min-h-[min(26rem,var(--app-content-height))] w-full max-w-lg flex-col gap-3 overflow-x-clip px-4 py-3 md:px-6">
      <div className="flex shrink-0 items-center gap-2">
        {/* Generations, to narrow the deck without leaving it */}
        <div className="-my-1 flex min-w-0 flex-1 gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
          {GEN_RANGES.map((gen) => (
            <Chip
              key={gen.id}
              selected={filter.generations.includes(gen.id)}
              onClick={() => toggleGeneration(gen.id)}
              title={`${gen.name} — ${gen.label}`}
              className="shrink-0"
            >
              {gen.name.replace("Gen ", "")}
            </Chip>
          ))}
        </div>

        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href={backToDex} title="Back to the Pokédex grid">
            <DexIcon className="size-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1.5">grid</span>
          </Link>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <PokemonSwipeDeck
          key={deckKey}
          pokemon={pokemon}
          emptyAction={
            <Button variant="outline" size="sm" asChild>
              <Link href={backToDex}>change filters</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function SwipeSkeleton() {
  return (
    <div className="mx-auto flex h-(--app-content-height) w-full max-w-lg flex-col items-center justify-center px-4">
      <div className="aspect-[63/88] w-full max-w-xs animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
