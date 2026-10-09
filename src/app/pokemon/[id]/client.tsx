"use client";

import {
  ChevronLeft,
  ChevronRight,
  Dices,
  Heart,
  ListPlus,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { useSecondaryToolbar } from "@/components/app-shell";
import Link from "@/components/link";
import { CompareIcon } from "@/components/navigation/app-icons";
import { GenerationPicker } from "@/components/pokemon/generation-picker";
import { GenerationScope } from "@/components/pokemon/generation-scope";
import {
  AbilitiesSection,
  DetailsSection,
  EvolutionSection,
  getBaseName,
  Label,
  LocationsSection,
  MovesSection,
  PokedexEntriesSection,
  PokemonPageSkeleton,
  SUMMARY_RAIL_CLASSES,
  TypeMatchupsSection,
  VariantOrRegionBadge,
} from "@/components/pokemon/pokemon-details";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { SpriteSetSelect } from "@/components/pokemon/sprite-set-select";
import { StatBar } from "@/components/pokemon/stat-bar";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { PokemonCardsSection } from "@/components/tcg";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useAmbientPalette } from "@/hooks/use-ambient-palette";
import { useComparison } from "@/hooks/use-comparison";
import { useFavorites } from "@/hooks/use-favorites";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import {
  calculateTypeEffectiveness,
  useEvolutionChain,
  usePokemonEncounters,
  usePokemonMoves,
  usePokemonWithSpecies,
} from "@/hooks/use-pokemon";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { getDexPokemonList } from "@/lib/dex-pokemon";
import { getSpeciesGenerations, LATEST_GEN, toID } from "@/lib/pkmn";
import type { PokedexEntry } from "@/lib/pokeapi";
import { getSpriteSet, pokemonSprite, type SpriteSetId } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import { TYPE_COLORS } from "@/types/pokemon";

interface PokemonPageClientProps {
  id: string;
  pokedexEntry: PokedexEntry | null;
}

export function PokemonPageClient({
  id,
  pokedexEntry,
}: PokemonPageClientProps) {
  const router = useRouter();
  const { preferredGeneration } = useGenerationPreference();

  // Generations whose games this Pokemon actually appears in. A preference for
  // a generation it missed (Kakuna in Gen IX, say) falls back to latest data.
  const availableGenerations = useMemo(() => getSpeciesGenerations(id), [id]);
  const activeGeneration =
    preferredGeneration !== null &&
    availableGenerations.includes(preferredGeneration)
      ? preferredGeneration
      : null;
  const missingFromPreferredGeneration =
    preferredGeneration !== null && activeGeneration === null;

  const { pokemon, species, isLoading, error } = usePokemonWithSpecies(
    id,
    activeGeneration,
  );
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInComparison, toggleComparison, expandPanel } = useComparison();
  const setSecondaryToolbar = useSecondaryToolbar();
  const { defaultPokemonSpriteGen, speciesCutoffGeneration } =
    useSpritePreferences();
  const { data: moves, isLoading: movesLoading } = usePokemonMoves(
    id,
    activeGeneration,
  );
  const { data: evolutionChain, isLoading: evolutionLoading } =
    useEvolutionChain(species?.evolutionChainUrl ?? null, activeGeneration);
  const { data: encounters, isLoading: encountersLoading } =
    usePokemonEncounters(pokemon?.id ?? null);

  const [spriteGenOverride, setSpriteGenOverride] = useState<
    "default" | SpriteSetId
  >("default");
  const [spriteShiny, setSpriteShiny] = useState(false);
  const [spriteBack, setSpriteBack] = useState(false);
  const [spriteFemale, setSpriteFemale] = useState(false);

  const effectiveSpriteSetId =
    spriteGenOverride === "default"
      ? defaultPokemonSpriteGen
      : spriteGenOverride;
  // Not every sprite sheet has shiny/back/female variants (Gen 1 has no shiny
  // at all), so the toggles follow what the selected set actually offers.
  const activeSpriteSet = getSpriteSet(effectiveSpriteSetId);

  // Base species only, ordered by National Dex number, each with a unique
  // routable slug. Forms/formes share their base species' dex number, so
  // prev/next/random navigate between base species rather than individual
  // forms. Scoped to the generation being viewed, so prev/next walk that
  // generation's dex.
  const dexOrder = useMemo(
    () =>
      getDexPokemonList(activeGeneration, {
        forms: "none",
        speciesCutoffGeneration,
      }),
    [activeGeneration, speciesCutoffGeneration],
  );
  const dexIndex = useMemo(() => {
    if (!pokemon) return -1;
    return dexOrder.findIndex((p) => p.id === pokemon.id);
  }, [dexOrder, pokemon]);
  const prevDexPokemon = dexIndex > 0 ? dexOrder[dexIndex - 1] : null;
  const nextDexPokemon =
    dexIndex >= 0 && dexIndex < dexOrder.length - 1
      ? dexOrder[dexIndex + 1]
      : null;

  const handleRandomPokemon = useCallback(() => {
    if (dexOrder.length === 0) return;
    const randomPokemon = dexOrder[Math.floor(Math.random() * dexOrder.length)];
    router.push(`/pokemon/${randomPokemon.slug}`);
  }, [router, dexOrder]);

  const typeEffectiveness = useMemo(() => {
    if (!pokemon) return null;
    return calculateTypeEffectiveness(
      pokemon.types,
      activeGeneration ?? LATEST_GEN,
    );
  }, [pokemon, activeGeneration]);

  const secondaryToolbarContent = useMemo(() => {
    if (!pokemon) return null;

    return (
      <>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {prevDexPokemon ? (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
              title="Previous Pokemon"
            >
              <Link href={`/pokemon/${prevDexPokemon.slug}`}>
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline text-xs">prev</span>
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GenerationPicker
            availableGenerations={availableGenerations}
            size="compact"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
                title="Sprite settings"
              >
                <Sparkles className="size-4" />
                <span className="hidden sm:inline text-xs">sprite</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(20rem,calc(100vw-1.5rem))] p-3"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    sprite
                  </span>
                  <SpriteSetSelect
                    value={spriteGenOverride}
                    onValueChange={(v) =>
                      setSpriteGenOverride(v as "default" | SpriteSetId)
                    }
                    extraOption={{ value: "default", label: "Default" }}
                    className="h-8 w-44"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                    <span className="text-xs">Shiny</span>
                    <Switch
                      aria-label="Toggle shiny sprite"
                      disabled={!activeSpriteSet.shiny}
                      checked={spriteShiny && activeSpriteSet.shiny}
                      onCheckedChange={setSpriteShiny}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                    <span className="text-xs">Back</span>
                    <Switch
                      aria-label="Toggle back sprite"
                      disabled={!activeSpriteSet.back}
                      checked={spriteBack && activeSpriteSet.back}
                      onCheckedChange={setSpriteBack}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                    <span className="text-xs">Female</span>
                    <Switch
                      aria-label="Toggle female sprite"
                      disabled={!activeSpriteSet.female}
                      checked={spriteFemale && activeSpriteSet.female}
                      onCheckedChange={setSpriteFemale}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            onClick={handleRandomPokemon}
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
            title="Random Pokemon"
          >
            <Dices className="size-4" />
            <span className="hidden sm:inline text-xs">random</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              const wasInComparison = isInComparison(pokemon.name);
              toggleComparison(pokemon.name);
              if (!wasInComparison) {
                toast.success(`${pokemon.name} added to comparison`, {
                  action: {
                    label: "View",
                    onClick: () => expandPanel(),
                  },
                });
              }
            }}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 gap-1.5 transition-colors",
              isInComparison(pokemon.name)
                ? "text-blue-500 hover:text-blue-500"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={
              isInComparison(pokemon.name)
                ? "Remove from comparison"
                : "Add to comparison"
            }
          >
            <CompareIcon className="size-4" />
            <span className="hidden sm:inline text-xs">
              {isInComparison(pokemon.name) ? "compared" : "compare"}
            </span>
          </Button>

          <Button
            type="button"
            onClick={() => toggleFavorite(pokemon.id)}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 gap-1.5 transition-colors",
              isFavorite(pokemon.id)
                ? "text-rose-500 hover:text-rose-500"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={
              isFavorite(pokemon.id)
                ? "Remove from favorites"
                : "Add to favorites"
            }
          >
            <Heart
              className={cn("size-4", isFavorite(pokemon.id) && "fill-current")}
            />
            <span className="hidden sm:inline text-xs">
              {isFavorite(pokemon.id) ? "favorited" : "favorite"}
            </span>
          </Button>

          <AddToListDialog
            itemType="pokemon"
            itemId={pokemon.id.toString()}
            itemName={pokemon.name}
            itemSprite={pokemon.sprite}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
                title="Add to list"
              >
                <ListPlus className="size-4" />
                <span className="hidden sm:inline text-xs">list</span>
              </Button>
            }
          />
          {nextDexPokemon ? (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
              title="Next Pokemon"
            >
              <Link href={`/pokemon/${nextDexPokemon.slug}`}>
                <span className="hidden sm:inline text-xs">next</span>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
        </div>
      </>
    );
  }, [
    pokemon,
    prevDexPokemon,
    nextDexPokemon,
    availableGenerations,
    expandPanel,
    handleRandomPokemon,
    isFavorite,
    isInComparison,
    activeSpriteSet,
    spriteBack,
    spriteFemale,
    spriteGenOverride,
    spriteShiny,
    toggleComparison,
    toggleFavorite,
  ]);

  useEffect(() => {
    if (secondaryToolbarContent) {
      setSecondaryToolbar({ content: secondaryToolbarContent });
    } else {
      setSecondaryToolbar(null);
    }

    return () => setSecondaryToolbar(null);
  }, [secondaryToolbarContent, setSecondaryToolbar]);

  // Resolved before the early returns below, because the backdrop that reads
  // its colours is a hook and a hook cannot be called after one. Which sprite
  // is on screen is the whole question: flip to shiny and the page follows.
  const currentHeroSprite = pokemon
    ? pokemonSprite(pokemon.name, {
        set: effectiveSpriteSetId,
        shiny: spriteShiny,
        female: spriteFemale,
        side: spriteBack ? "back" : "front",
      }) || pokemon.sprite
    : null;

  const ambientPalette = useAmbientPalette(
    currentHeroSprite,
    (pokemon?.types ?? []).map((type) => TYPE_COLORS[type]),
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50svh] p-6 text-center">
        <h2 className="text-lg font-medium mb-2">pokemon not found</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Could not load data for &ldquo;{id}&rdquo;.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleRandomPokemon}>
            try a random pokemon
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">back to pokedex</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !pokemon) {
    return <PokemonPageSkeleton />;
  }

  const statTotal = pokemon.stats.reduce((sum, s) => sum + s.value, 0);
  const currentSlug = toID(pokemon.name);

  return (
    <div className="relative isolate p-4 md:p-6">
      {/* Hung on the page rather than on the sprite. The colour is the
          sprite's, but it belongs to the top of the page the way an album's
          colour does — full width, from the very top, spent before the moves
          table. Pinned to the padding box, so it starts above the sprite
          rather than level with it. */}
      <AmbientBackdrop palette={ambientPalette} className="-z-10" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {/* Summary rail (pinned on desktop) */}
        <div className={SUMMARY_RAIL_CLASSES}>
          {/* Core Header */}
          <section className="space-y-4">
            {/* Hero */}
            <div className="flex flex-col items-center gap-3">
              <PokemonImage
                src={currentHeroSprite ?? pokemon.sprite}
                alt={pokemon.name}
                pokemonId={pokemon.id}
                width={192}
                height={192}
                className="size-32 md:size-40 xl:size-44 2xl:size-48 mx-auto"
                priority
              />

              <div className="text-center space-y-2">
                <h1 className="text-xl font-medium">
                  {getBaseName(pokemon.name)}
                </h1>
                <div className="flex justify-center gap-2 flex-wrap">
                  {pokemon.types.map((type) => (
                    <TypeBadge key={type} type={type} size="default" linkable />
                  ))}
                  <VariantOrRegionBadge
                    name={pokemon.name}
                    dexNumber={pokemon.id}
                  />
                </div>
              </div>

              <GenerationScope
                activeGeneration={activeGeneration}
                unavailableGeneration={
                  missingFromPreferredGeneration ? preferredGeneration : null
                }
                subject={getBaseName(pokemon.name)}
              />
            </div>

            {/* Pokedex Entries */}
            {pokedexEntry?.entries && pokedexEntry.entries.length > 0 && (
              <PokedexEntriesSection
                entries={pokedexEntry.entries}
                activeGeneration={activeGeneration}
              />
            )}
          </section>

          {/* Type Effectiveness */}
          {typeEffectiveness && (
            <TypeMatchupsSection effectiveness={typeEffectiveness} />
          )}

          {/* Abilities */}
          <AbilitiesSection
            pokemon={pokemon}
            activeGeneration={activeGeneration}
          />

          {/* Stats */}
          <section className="space-y-3">
            <Label>base stats</Label>
            <div className="space-y-2">
              {pokemon.stats.map((stat) => (
                <StatBar key={stat.name} stat={stat} />
              ))}
            </div>
            <div className="flex justify-between text-xs pt-1 border-t">
              <span className="text-muted-foreground">Total</span>
              <span className="tabular-nums font-medium">{statTotal}</span>
            </div>
          </section>

          {/* Evolution */}
          <EvolutionSection
            chain={evolutionChain}
            isLoading={evolutionLoading}
            currentSlug={currentSlug}
            generation={activeGeneration}
          />

          <DetailsSection
            pokemon={pokemon}
            species={species}
            activeGeneration={activeGeneration}
          />
        </div>

        {/* Main content column */}
        <div className="space-y-6 md:col-span-7 lg:col-span-7 xl:col-span-7 2xl:col-span-8">
          {/* Moves */}
          <MovesSection
            moves={moves}
            isLoading={movesLoading}
            activeGeneration={activeGeneration}
          />

          {/* Locations */}
          <LocationsSection
            encounters={encounters}
            isLoading={encountersLoading}
            activeGeneration={activeGeneration}
          />

          {/* Trading cards */}
          <PokemonCardsSection
            dexId={pokemon.id}
            pokemonName={getBaseName(pokemon.name)}
          />
        </div>
      </div>
    </div>
  );
}
