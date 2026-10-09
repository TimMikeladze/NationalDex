"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { HoloCard } from "@/components/holo-card";
import Link from "@/components/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import {
  calculateTypeEffectiveness,
  useEvolutionChain,
  usePokemonEncounters,
  usePokemonMoves,
  usePokemonWithSpecies,
} from "@/hooks/use-pokemon";
import type { DexPokemonListItem } from "@/lib/dex-pokemon";
import { getSpeciesGenerations, LATEST_GEN, toID } from "@/lib/pkmn";
import {
  AbilitiesSection,
  DetailsSection,
  EvolutionSection,
  Label,
  LocationsSection,
  MovesSection,
  TypeMatchupsSection,
} from "./pokemon-details";
import { PokemonSwipeFace } from "./pokemon-swipe-face";
import { StatBar } from "./stat-bar";

/**
 * A Pokémon picked up out of the deck: the card itself, still tiltable, and
 * everything its page would tell you — matchups, abilities, stats, evolution,
 * details, every move and where to find it — without leaving the deck.
 */
export function PokemonSwipePeek({
  pokemon,
  sprite,
  onClose,
}: {
  pokemon: DexPokemonListItem | null;
  sprite: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={pokemon !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        // Tall and scrolling rather than card-sized: this is the whole page,
        // folded into the deck.
        className="flex max-h-[min(92dvh,60rem)] w-[min(100vw-1rem,60rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">
          {pokemon?.name ?? "Pokémon"}
        </DialogTitle>
        {pokemon && (
          <>
            <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1">
              <p className="min-w-0 flex-1 truncate px-2 text-sm font-medium">
                {pokemon.name}
              </p>
              <Link
                href={`/pokemon/${pokemon.slug}`}
                className="shrink-0 px-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                full page →
              </Link>
              <button
                type="button"
                onClick={onClose}
                title="Close"
                aria-label="Close"
                className="shrink-0 p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:p-6">
                {/* The card stays in view on a wide screen while the details
                    scroll past it. */}
                <div className="mx-auto w-full max-w-[16rem] md:sticky md:top-0 md:max-w-none md:self-start">
                  <HoloCard size="lg">
                    <PokemonSwipeFace
                      pokemon={pokemon}
                      sprite={sprite}
                      priority
                      className="aspect-[63/88] h-auto w-full"
                    />
                  </HoloCard>
                </div>

                <PokemonFullDetails key={pokemon.slug} slug={pokemon.slug} />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The detail page's sections, fed the same way the page feeds them — scoped
 * to the generation being viewed when this Pokémon appears in it.
 */
function PokemonFullDetails({ slug }: { slug: string }) {
  const { preferredGeneration } = useGenerationPreference();
  const availableGenerations = useMemo(
    () => getSpeciesGenerations(slug),
    [slug],
  );
  const activeGeneration =
    preferredGeneration !== null &&
    availableGenerations.includes(preferredGeneration)
      ? preferredGeneration
      : null;

  const { pokemon, species, isLoading } = usePokemonWithSpecies(
    slug,
    activeGeneration,
  );
  const { data: moves, isLoading: movesLoading } = usePokemonMoves(
    slug,
    activeGeneration,
  );
  const { data: evolutionChain, isLoading: evolutionLoading } =
    useEvolutionChain(species?.evolutionChainUrl ?? null, activeGeneration);
  const { data: encounters, isLoading: encountersLoading } =
    usePokemonEncounters(pokemon?.id ?? null);

  const effectiveness = useMemo(
    () =>
      pokemon
        ? calculateTypeEffectiveness(
            pokemon.types,
            activeGeneration ?? LATEST_GEN,
          )
        : null,
    [pokemon, activeGeneration],
  );

  if (isLoading || !pokemon) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statTotal = pokemon.stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="min-w-0 space-y-6">
      {effectiveness && <TypeMatchupsSection effectiveness={effectiveness} />}

      <AbilitiesSection pokemon={pokemon} activeGeneration={activeGeneration} />

      <section className="space-y-3">
        <Label>base stats</Label>
        <div className="space-y-2">
          {pokemon.stats.map((stat) => (
            <StatBar key={stat.name} stat={stat} />
          ))}
        </div>
        <div className="flex justify-between border-t pt-1 text-xs">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium tabular-nums">{statTotal}</span>
        </div>
      </section>

      <EvolutionSection
        chain={evolutionChain}
        isLoading={evolutionLoading}
        currentSlug={toID(pokemon.name)}
        generation={activeGeneration}
      />

      <DetailsSection
        pokemon={pokemon}
        species={species}
        activeGeneration={activeGeneration}
      />

      <MovesSection
        moves={moves}
        isLoading={movesLoading}
        activeGeneration={activeGeneration}
      />

      <LocationsSection
        encounters={encounters}
        isLoading={encountersLoading}
        activeGeneration={activeGeneration}
      />
    </div>
  );
}
