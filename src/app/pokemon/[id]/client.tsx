"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  Heart,
  ListPlus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { useSecondaryToolbar } from "@/components/app-shell";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { StatBar } from "@/components/pokemon/stat-bar";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComparison } from "@/hooks/use-comparison";
import { useFavorites } from "@/hooks/use-favorites";
import { usePokedexPreference } from "@/hooks/use-pokedex-preference";
import {
  calculateTypeEffectiveness,
  useEvolutionChain,
  usePokemonMoves,
  usePokemonWithSpecies,
} from "@/hooks/use-pokemon";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { getDexPokemonVariationsByDexNumber } from "@/lib/dex-pokemon";
import { getOffensiveTypeMatchups, toID } from "@/lib/pkmn";
import type { PokedexEntry } from "@/lib/pokeapi";
import { pokemonSprite, type SpriteGen } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type {
  EvolutionChainLink,
  Pokemon,
  PokemonMove,
  PokemonSpecies,
} from "@/types/pokemon";

const MAX_POKEMON_ID = 1025;

const _isAnimatedSprite = (src: string) => src.toLowerCase().endsWith(".gif");

// =============================================================================
// Variant & Region Helpers
// =============================================================================

const VARIANT_SUFFIXES = [
  "Gmax",
  "Mega",
  "Mega-X",
  "Mega-Y",
  "Alola",
  "Galar",
  "Hisui",
  "Paldea",
];

function getVariantFromName(name: string): string | null {
  for (const suffix of VARIANT_SUFFIXES) {
    if (name.endsWith(`-${suffix}`)) {
      return suffix;
    }
  }
  return null;
}

function getBaseName(name: string): string {
  const variant = getVariantFromName(name);
  if (variant) {
    return name.slice(0, -(variant.length + 1));
  }
  return name;
}

const VARIANT_DISPLAY_NAMES: Record<string, string> = {
  Gmax: "Gigantamax",
  Mega: "Mega",
  "Mega-X": "Mega X",
  "Mega-Y": "Mega Y",
  Alola: "Alolan",
  Galar: "Galarian",
  Hisui: "Hisuian",
  Paldea: "Paldean",
};

type Region =
  | "Kanto"
  | "Johto"
  | "Hoenn"
  | "Sinnoh"
  | "Unova"
  | "Kalos"
  | "Alola"
  | "Galar"
  | "Paldea";

function getRegionFromDexNumber(dexNumber: number): Region | null {
  if (dexNumber >= 1 && dexNumber <= 151) return "Kanto";
  if (dexNumber >= 152 && dexNumber <= 251) return "Johto";
  if (dexNumber >= 252 && dexNumber <= 386) return "Hoenn";
  if (dexNumber >= 387 && dexNumber <= 493) return "Sinnoh";
  if (dexNumber >= 494 && dexNumber <= 649) return "Unova";
  if (dexNumber >= 650 && dexNumber <= 721) return "Kalos";
  if (dexNumber >= 722 && dexNumber <= 809) return "Alola";
  if (dexNumber >= 810 && dexNumber <= 905) return "Galar";
  if (dexNumber >= 906 && dexNumber <= 1025) return "Paldea";
  return null;
}

function VariantOrRegionBadge({
  name,
  dexNumber,
}: {
  name: string;
  dexNumber: number;
}) {
  const variant = getVariantFromName(name);
  if (variant) {
    return (
      <span className="inline-flex items-center font-medium rounded border border-border bg-muted text-muted-foreground px-2 py-0.5 text-xs">
        {VARIANT_DISPLAY_NAMES[variant] ?? variant}
      </span>
    );
  }
  const region = getRegionFromDexNumber(dexNumber);
  if (region) {
    return (
      <span className="inline-flex items-center font-medium rounded border border-border bg-muted text-muted-foreground px-2 py-0.5 text-xs">
        {region}
      </span>
    );
  }
  return null;
}

// Display names for game versions
const VERSION_DISPLAY_NAMES: Record<string, string> = {
  red: "Red",
  blue: "Blue",
  yellow: "Yellow",
  gold: "Gold",
  silver: "Silver",
  crystal: "Crystal",
  ruby: "Ruby",
  sapphire: "Sapphire",
  emerald: "Emerald",
  firered: "FireRed",
  leafgreen: "LeafGreen",
  diamond: "Diamond",
  pearl: "Pearl",
  platinum: "Platinum",
  heartgold: "HeartGold",
  soulsilver: "SoulSilver",
  black: "Black",
  white: "White",
  "black-2": "Black 2",
  "white-2": "White 2",
  x: "X",
  y: "Y",
  "omega-ruby": "Omega Ruby",
  "alpha-sapphire": "Alpha Sapphire",
  sun: "Sun",
  moon: "Moon",
  "ultra-sun": "Ultra Sun",
  "ultra-moon": "Ultra Moon",
  "lets-go-pikachu": "Let's Go Pikachu",
  "lets-go-eevee": "Let's Go Eevee",
  sword: "Sword",
  shield: "Shield",
  "brilliant-diamond": "Brilliant Diamond",
  "shining-pearl": "Shining Pearl",
  "legends-arceus": "Legends: Arceus",
  scarlet: "Scarlet",
  violet: "Violet",
};

const getVersionDisplayName = (version: string) =>
  VERSION_DISPLAY_NAMES[version] ||
  version.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Colors for game version chips
const VERSION_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  red: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500" },
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500",
  },
  yellow: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500",
  },
  gold: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500",
  },
  silver: {
    bg: "bg-slate-400/20",
    text: "text-slate-300",
    border: "border-slate-400",
  },
  crystal: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500",
  },
  ruby: {
    bg: "bg-rose-600/20",
    text: "text-rose-400",
    border: "border-rose-600",
  },
  sapphire: {
    bg: "bg-blue-600/20",
    text: "text-blue-400",
    border: "border-blue-600",
  },
  emerald: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500",
  },
  firered: {
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    border: "border-orange-500",
  },
  leafgreen: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500",
  },
  diamond: {
    bg: "bg-sky-400/20",
    text: "text-sky-300",
    border: "border-sky-400",
  },
  pearl: {
    bg: "bg-pink-300/20",
    text: "text-pink-300",
    border: "border-pink-300",
  },
  platinum: {
    bg: "bg-zinc-400/20",
    text: "text-zinc-300",
    border: "border-zinc-400",
  },
  heartgold: {
    bg: "bg-amber-400/20",
    text: "text-amber-300",
    border: "border-amber-400",
  },
  soulsilver: {
    bg: "bg-slate-300/20",
    text: "text-slate-200",
    border: "border-slate-300",
  },
  black: {
    bg: "bg-neutral-700/30",
    text: "text-neutral-200",
    border: "border-neutral-500",
  },
  white: {
    bg: "bg-neutral-200/20",
    text: "text-neutral-200",
    border: "border-neutral-300",
  },
  "black-2": {
    bg: "bg-neutral-700/30",
    text: "text-neutral-200",
    border: "border-neutral-500",
  },
  "white-2": {
    bg: "bg-neutral-200/20",
    text: "text-neutral-200",
    border: "border-neutral-300",
  },
  x: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500" },
  y: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500" },
  "omega-ruby": {
    bg: "bg-rose-600/20",
    text: "text-rose-400",
    border: "border-rose-600",
  },
  "alpha-sapphire": {
    bg: "bg-blue-600/20",
    text: "text-blue-400",
    border: "border-blue-600",
  },
  sun: {
    bg: "bg-orange-400/20",
    text: "text-orange-300",
    border: "border-orange-400",
  },
  moon: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500",
  },
  "ultra-sun": {
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    border: "border-orange-500",
  },
  "ultra-moon": {
    bg: "bg-purple-600/20",
    text: "text-purple-400",
    border: "border-purple-600",
  },
  "lets-go-pikachu": {
    bg: "bg-yellow-400/20",
    text: "text-yellow-300",
    border: "border-yellow-400",
  },
  "lets-go-eevee": {
    bg: "bg-amber-600/20",
    text: "text-amber-400",
    border: "border-amber-600",
  },
  sword: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500",
  },
  shield: {
    bg: "bg-rose-500/20",
    text: "text-rose-400",
    border: "border-rose-500",
  },
  "brilliant-diamond": {
    bg: "bg-sky-400/20",
    text: "text-sky-300",
    border: "border-sky-400",
  },
  "shining-pearl": {
    bg: "bg-pink-400/20",
    text: "text-pink-300",
    border: "border-pink-400",
  },
  "legends-arceus": {
    bg: "bg-indigo-500/20",
    text: "text-indigo-400",
    border: "border-indigo-500",
  },
  scarlet: {
    bg: "bg-red-600/20",
    text: "text-red-400",
    border: "border-red-600",
  },
  violet: {
    bg: "bg-violet-600/20",
    text: "text-violet-400",
    border: "border-violet-600",
  },
};

const getVersionColors = (version: string) =>
  VERSION_COLORS[version] || {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-muted",
  };

// Group entries with identical flavor text
type GroupedEntry = {
  versions: string[];
  flavorText: string;
};

function groupEntriesByText(
  entries: { version: string; flavorText: string }[],
): GroupedEntry[] {
  const groups: GroupedEntry[] = [];
  for (const entry of entries) {
    const existing = groups.find((g) => g.flavorText === entry.flavorText);
    if (existing) {
      existing.versions.push(entry.version);
    } else {
      groups.push({ versions: [entry.version], flavorText: entry.flavorText });
    }
  }
  return groups;
}

const MOVES_SKELETON_GROUP_KEYS = Array.from(
  { length: 3 },
  (_, i) => `moves-skel-group-${i}`,
);
const MOVES_SKELETON_ROW_KEYS = Array.from(
  { length: 4 },
  (_, i) => `moves-skel-row-${i}`,
);
const EVOLUTION_SKELETON_KEYS = Array.from(
  { length: 3 },
  (_, i) => `evo-skel-${i}`,
);
const WEAKNESS_SKELETON_KEYS = Array.from(
  { length: 4 },
  (_, i) => `weak-skel-${i}`,
);
const RESISTANCE_SKELETON_KEYS = Array.from(
  { length: 3 },
  (_, i) => `resist-skel-${i}`,
);
const STAT_SKELETON_KEYS = Array.from(
  { length: 6 },
  (_, i) => `stat-skel-${i}`,
);

interface PokemonPageClientProps {
  id: string;
  pokedexEntry: PokedexEntry | null;
}

export function PokemonPageClient({
  id,
  pokedexEntry,
}: PokemonPageClientProps) {
  const { pokemon, species, isLoading } = usePokemonWithSpecies(id);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInComparison, toggleComparison, canAddMore } = useComparison();
  const setSecondaryToolbar = useSecondaryToolbar();
  const { defaultPokemonSpriteGen } = useSpritePreferences();
  const { data: moves, isLoading: movesLoading } = usePokemonMoves(id);
  const { data: evolutionChain, isLoading: evolutionLoading } =
    useEvolutionChain(species?.evolutionChainUrl ?? null);

  const [spriteGenOverride, setSpriteGenOverride] = useState<
    "default" | SpriteGen
  >("default");
  const [spriteShiny, setSpriteShiny] = useState(false);
  const [spriteBack, setSpriteBack] = useState(false);
  const [spriteFemale, setSpriteFemale] = useState(false);

  const typeEffectiveness = useMemo(() => {
    if (!pokemon) return null;
    return calculateTypeEffectiveness(pokemon.types);
  }, [pokemon]);

  const secondaryToolbarContent = useMemo(() => {
    if (!pokemon) return null;

    return (
      <>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {pokemon.id > 1 ? (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
              title="Previous Pokemon"
            >
              <Link href={`/pokemon/${pokemon.id - 1}`}>
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline text-xs">prev</span>
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
            <PopoverContent align="end" className="w-80 p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    sprite
                  </span>
                  <Select
                    value={spriteGenOverride}
                    onValueChange={(v) =>
                      setSpriteGenOverride(v as "default" | SpriteGen)
                    }
                  >
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="gen5">Gen 5 (static)</SelectItem>
                      <SelectItem value="ani">Animated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                    <span className="text-xs">Shiny</span>
                    <Switch
                      aria-label="Toggle shiny sprite"
                      checked={spriteShiny}
                      onCheckedChange={setSpriteShiny}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                    <span className="text-xs">Back</span>
                    <Switch
                      aria-label="Toggle back sprite"
                      checked={spriteBack}
                      onCheckedChange={setSpriteBack}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                    <span className="text-xs">Female</span>
                    <Switch
                      aria-label="Toggle female sprite"
                      checked={spriteFemale}
                      onCheckedChange={setSpriteFemale}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            onClick={() => toggleComparison(pokemon.id)}
            disabled={!canAddMore && !isInComparison(pokemon.id)}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 gap-1.5 transition-colors",
              isInComparison(pokemon.id)
                ? "text-blue-500 hover:text-blue-500"
                : "text-muted-foreground hover:text-foreground",
              !canAddMore && !isInComparison(pokemon.id) && "opacity-50",
            )}
            title={
              isInComparison(pokemon.id)
                ? "Remove from comparison"
                : "Add to comparison"
            }
          >
            <GitCompareArrows className="size-4" />
            <span className="hidden sm:inline text-xs">
              {isInComparison(pokemon.id) ? "compared" : "compare"}
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
          {pokemon.id < MAX_POKEMON_ID ? (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
              title="Next Pokemon"
            >
              <Link href={`/pokemon/${pokemon.id + 1}`}>
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
    canAddMore,
    isFavorite,
    isInComparison,
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

  if (isLoading || !pokemon) {
    return <PokemonPageSkeleton />;
  }

  const effectiveGen =
    spriteGenOverride === "default"
      ? defaultPokemonSpriteGen
      : spriteGenOverride;

  const currentHeroSprite =
    pokemonSprite(pokemon.name, {
      gen: effectiveGen,
      shiny: spriteShiny,
      female: spriteFemale,
      side: spriteBack ? "back" : "front",
    }) || pokemon.sprite;

  const statTotal = pokemon.stats.reduce((sum, s) => sum + s.value, 0);
  const currentSlug = toID(pokemon.name);

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {/* Summary rail (static on desktop) */}
        <div className="space-y-6 md:col-span-5 lg:col-span-5 xl:col-span-5 2xl:col-span-4 md:self-start">
          {/* Core Header */}
          <section className="space-y-4">
            {/* Hero */}
            <div className="flex flex-col items-center gap-3">
              <PokemonImage
                src={currentHeroSprite}
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
            </div>

            {/* Pokedex Entries */}
            {pokedexEntry?.entries && pokedexEntry.entries.length > 0 && (
              <PokedexEntriesSection entries={pokedexEntry.entries} />
            )}
          </section>

          {/* Type Effectiveness */}
          {typeEffectiveness && (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>weaknesses</Label>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.weaknesses.map(({ type, multiplier }) => (
                    <TypeBadge
                      key={type}
                      type={type}
                      multiplier={multiplier}
                      size="sm"
                      linkable
                    />
                  ))}
                  {typeEffectiveness.weaknesses.length === 0 && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>resistances</Label>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.resistances.map(({ type, multiplier }) => (
                    <TypeBadge
                      key={type}
                      type={type}
                      multiplier={multiplier}
                      size="sm"
                      linkable
                    />
                  ))}
                  {typeEffectiveness.immunities.map((type) => (
                    <TypeBadge
                      key={type}
                      type={type}
                      multiplier={0}
                      size="sm"
                      linkable
                    />
                  ))}
                  {typeEffectiveness.resistances.length === 0 &&
                    typeEffectiveness.immunities.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        None
                      </span>
                    )}
                </div>
              </div>
            </section>
          )}

          {/* Abilities */}
          <AbilitiesSection pokemon={pokemon} />

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
          />

          <DetailsSection pokemon={pokemon} species={species} />
        </div>

        {/* Main content column */}
        <div className="space-y-6 md:col-span-7 lg:col-span-7 xl:col-span-7 2xl:col-span-8">
          {/* Moves */}
          <MovesSection moves={moves} isLoading={movesLoading} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
      {children}
    </span>
  );
}

function PokedexEntriesSection({
  entries,
}: {
  entries: { version: string; flavorText: string }[];
}) {
  const { preferredGameVersion, setPreferredGameVersion, isLoaded } =
    usePokedexPreference();
  const [showAllVersions, setShowAllVersions] = useState(false);

  // Group entries with identical flavor text
  const groupedEntries = useMemo(() => groupEntriesByText(entries), [entries]);

  // Find the group to display - prefer user's selection, fall back to most recent
  const selectedGroup = useMemo(() => {
    if (preferredGameVersion) {
      const preferred = groupedEntries.find((g) =>
        g.versions.includes(preferredGameVersion),
      );
      if (preferred) return preferred;
    }
    // Fall back to most recent (last group)
    return groupedEntries[groupedEntries.length - 1];
  }, [groupedEntries, preferredGameVersion]);

  const currentIndex = groupedEntries.findIndex(
    (g) => g.flavorText === selectedGroup.flavorText,
  );

  const cycleVersion = (direction: "prev" | "next") => {
    const newIndex =
      direction === "next"
        ? (currentIndex + 1) % groupedEntries.length
        : (currentIndex - 1 + groupedEntries.length) % groupedEntries.length;
    // Select the first version in the new group
    setPreferredGameVersion(groupedEntries[newIndex].versions[0]);
  };

  // Don't render until preferences are loaded to avoid hydration mismatch
  if (!isLoaded) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-6 w-48 mx-auto" />
      </div>
    );
  }

  // Format display name for a group (multiple versions)
  const formatGroupName = (versions: string[]) => {
    if (versions.length === 1) {
      return getVersionDisplayName(versions[0]);
    }
    if (versions.length === 2) {
      return `${getVersionDisplayName(versions[0])} / ${getVersionDisplayName(versions[1])}`;
    }
    return `${getVersionDisplayName(versions[0])} +${versions.length - 1}`;
  };

  return (
    <div className="space-y-3">
      {/* Current entry with cycle controls */}
      <div className="flex items-start gap-2">
        {groupedEntries.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => cycleVersion("prev")}
            title="Previous entry"
          >
            <ChevronLeft className="size-3" />
          </Button>
        )}
        <p className="flex-1 text-xs md:text-sm text-muted-foreground italic text-center leading-snug md:leading-relaxed">
          "{selectedGroup.flavorText}"
        </p>
        {groupedEntries.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => cycleVersion("next")}
            title="Next entry"
          >
            <ChevronRight className="size-3" />
          </Button>
        )}
      </div>

      {/* Version selector chips */}
      {groupedEntries.length > 1 && (
        <div className="space-y-2">
          {/* Current selection badge */}
          <button
            type="button"
            onClick={() => setShowAllVersions(!showAllVersions)}
            className="flex items-center justify-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="size-3" />
            <span className="font-medium">
              {formatGroupName(selectedGroup.versions)}
            </span>
            <span className="text-[10px]">
              ({currentIndex + 1}/{groupedEntries.length})
            </span>
            <ChevronRight
              className={cn(
                "size-3 transition-transform",
                showAllVersions && "rotate-90",
              )}
            />
          </button>

          {/* All version chips - show individual games with colors */}
          {showAllVersions && (
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {entries.map((entry) => {
                const isSelected = selectedGroup.versions.includes(
                  entry.version,
                );
                const colors = getVersionColors(entry.version);
                return (
                  <button
                    key={entry.version}
                    type="button"
                    onClick={() => setPreferredGameVersion(entry.version)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded-full border transition-colors",
                      colors.text,
                      colors.border,
                      isSelected
                        ? colors.bg
                        : "bg-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    {getVersionDisplayName(entry.version)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AbilitiesSection({ pokemon }: { pokemon: Pokemon }) {
  return (
    <section className="space-y-2">
      <Label>abilities</Label>
      <div className="flex flex-wrap gap-2">
        {pokemon.abilities.map((ability) => {
          const slug = ability.name.toLowerCase().replace(/\s+/g, "-");
          return (
            <Link
              key={ability.name}
              href={`/abilities/${slug}`}
              className={cn(
                "text-xs px-2 py-1 border rounded hover:bg-muted/50 transition-colors cursor-pointer",
                ability.isHidden && "text-muted-foreground border-dashed",
              )}
            >
              {ability.name}
              {ability.isHidden && " (hidden)"}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Moves Section
// ============================================================================

function MovesSection({
  moves,
  isLoading,
}: {
  moves?: PokemonMove[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <section className="space-y-4">
        <Label>moves</Label>
        {MOVES_SKELETON_GROUP_KEYS.map((groupKey) => (
          <div key={groupKey} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            {MOVES_SKELETON_ROW_KEYS.map((rowKey) => (
              <Skeleton key={`${groupKey}-${rowKey}`} className="h-6 w-full" />
            ))}
          </div>
        ))}
      </section>
    );
  }

  if (!moves || moves.length === 0) {
    return (
      <section className="space-y-3">
        <Label>moves</Label>
        <p className="text-sm text-muted-foreground">No moves found.</p>
      </section>
    );
  }

  const levelUpMoves = moves
    .filter((m) => m.learnMethod === "level-up")
    .sort((a, b) => a.levelLearnedAt - b.levelLearnedAt);

  const tmMoves = moves
    .filter((m) => m.learnMethod === "machine")
    .sort((a, b) => a.name.localeCompare(b.name));

  const eggMoves = moves
    .filter((m) => m.learnMethod === "egg")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="space-y-4">
      <Label>moves</Label>
      <div className="space-y-6">
        {levelUpMoves.length > 0 && (
          <MoveGroup title="Level Up" moves={levelUpMoves} showLevel />
        )}
        {tmMoves.length > 0 && <MoveGroup title="TM / HM" moves={tmMoves} />}
        {eggMoves.length > 0 && (
          <MoveGroup title="Egg Moves" moves={eggMoves} />
        )}
      </div>
    </section>
  );
}

function MoveGroup({
  title,
  moves,
  showLevel = false,
}: {
  title: string;
  moves: PokemonMove[];
  showLevel?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="space-y-1">
        {moves.map((move, idx) => {
          const slug = move.name.toLowerCase().replace(/\s+/g, "-");
          return (
            <Tooltip key={`${move.name}-${idx}`}>
              <TooltipTrigger asChild>
                <Link
                  href={`/moves/${slug}`}
                  className="flex items-center gap-2 text-xs py-1 border-b border-muted last:border-0 w-full text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {showLevel && (
                    <span className="w-10 shrink-0 text-muted-foreground tabular-nums whitespace-nowrap">
                      {move.levelLearnedAt > 0
                        ? `Lv.${move.levelLearnedAt}`
                        : "—"}
                    </span>
                  )}
                  <span className="flex-1 font-medium">{move.name}</span>
                  <TypeBadge type={move.type} size="sm" />
                  <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                    {move.power ? `${move.power} pwr` : move.damageClass}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" className="w-72 p-0">
                <MoveTooltipContent move={move} />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function MoveTooltipContent({ move }: { move: PokemonMove }) {
  const typeMatchups = useMemo(
    () => getOffensiveTypeMatchups(move.type),
    [move.type],
  );

  const formatTarget = (target: string) => {
    const targetMap: Record<string, string> = {
      normal: "One target",
      self: "User",
      allAdjacent: "All adjacent",
      allAdjacentFoes: "All adjacent foes",
      allySide: "Ally side",
      foeSide: "Foe side",
      all: "All Pokémon",
      any: "Any target",
      allies: "User & allies",
      allyTeam: "User's team",
      scripted: "Varies",
      randomNormal: "Random foe",
    };
    return targetMap[target] || target;
  };

  return (
    <div className="space-y-2 p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="font-medium">{move.name}</span>
        <TypeBadge type={move.type} size="sm" />
      </div>

      {/* Description */}
      {move.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {move.description}
        </p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            Power
          </span>
          <span className="font-medium tabular-nums">{move.power ?? "—"}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            Accuracy
          </span>
          <span className="font-medium tabular-nums">
            {move.accuracy ? `${move.accuracy}%` : "—"}
          </span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            PP
          </span>
          <span className="font-medium tabular-nums">{move.pp}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            Category
          </span>
          <span className="font-medium">{move.damageClass}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            Priority
          </span>
          <span className="font-medium tabular-nums">
            {move.priority > 0 ? `+${move.priority}` : move.priority}
          </span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            Target
          </span>
          <span className="font-medium">{formatTarget(move.target)}</span>
        </div>
      </div>

      {/* Type Effectiveness - only for damaging moves */}
      {move.damageClass !== "Status" && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-muted">
          {typeMatchups.superEffective.map((t) => (
            <TypeBadge
              key={t}
              type={t as PokemonMove["type"]}
              size="sm"
              multiplier={2}
            />
          ))}
          {typeMatchups.notVeryEffective.map((t) => (
            <TypeBadge
              key={t}
              type={t as PokemonMove["type"]}
              size="sm"
              multiplier={0.5}
            />
          ))}
          {typeMatchups.noEffect.map((t) => (
            <TypeBadge
              key={t}
              type={t as PokemonMove["type"]}
              size="sm"
              multiplier={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Evolution Section
// ============================================================================

function EvolutionSection({
  chain,
  isLoading,
  currentSlug,
}: {
  chain?: EvolutionChainLink;
  isLoading: boolean;
  currentSlug: string;
}) {
  if (isLoading) {
    return (
      <section className="space-y-3">
        <Label>evolution</Label>
        <div className="flex justify-center gap-4">
          {EVOLUTION_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="size-20" />
          ))}
        </div>
      </section>
    );
  }

  if (!chain) {
    return (
      <section className="space-y-3">
        <Label>evolution</Label>
        <p className="text-sm text-muted-foreground">
          No evolution data found.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <Label>evolution</Label>
      <EvolutionChainDisplay chain={chain} currentSlug={currentSlug} />
    </section>
  );
}

function EvolutionChainDisplay({
  chain,
  currentSlug,
}: {
  chain: EvolutionChainLink;
  currentSlug: string;
}) {
  if (chain.evolvesTo.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This Pokémon does not evolve.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <EvolutionNode pokemon={chain} currentSlug={currentSlug} isFirst />
    </div>
  );
}

function EvolutionNode({
  pokemon,
  currentSlug,
  isFirst = false,
}: {
  pokemon: EvolutionChainLink;
  currentSlug: string;
  isFirst?: boolean;
}) {
  const hasBranching = pokemon.evolvesTo.length > 1;

  // Get all variations for this Pokemon
  const variations = useMemo(() => {
    return getDexPokemonVariationsByDexNumber(9, pokemon.id);
  }, [pokemon.id]);

  // Check if this node contains the current Pokemon (either base or a variation)
  const currentVariation = variations.find((v) => v.slug === currentSlug);
  const hasCurrentVariation = Boolean(currentVariation);

  return (
    <div className="flex items-center gap-2">
      {/* Show evolution method arrow if this isn't the base form */}
      {!isFirst && pokemon.evolutionDetails.length > 0 && (
        <div className="text-muted-foreground text-xs flex flex-col items-center">
          <span>→</span>
          <div className="text-[10px] text-center max-w-20">
            {pokemon.evolutionDetails.map((detail, i) => (
              <div key={`${formatEvolutionMethod(detail)}-${i}`}>
                {formatEvolutionMethod(detail)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pokemon card with variations */}
      <div className="flex flex-col items-center gap-1">
        {variations.length > 1 ? (
          <EvolutionNodeVariations
            variations={variations}
            currentSlug={currentSlug}
            pokemonId={pokemon.id}
          />
        ) : (
          <EvolutionNodeCard
            name={pokemon.name}
            sprite={pokemon.sprite}
            id={pokemon.id}
            isCurrent={hasCurrentVariation}
          />
        )}
      </div>

      {/* Evolutions */}
      {pokemon.evolvesTo.length > 0 && (
        <div
          className={cn(
            "flex",
            hasBranching ? "flex-col gap-2" : "items-center",
          )}
        >
          {pokemon.evolvesTo.map((evo) => (
            <EvolutionNode
              key={`${evo.id}-${evo.name}`}
              pokemon={evo}
              currentSlug={currentSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EvolutionNodeCard({
  name,
  sprite,
  id,
  isCurrent,
  isSmall = false,
}: {
  name: string;
  sprite: string;
  id: number;
  isCurrent: boolean;
  isSmall?: boolean;
}) {
  const href = `/pokemon/${toID(name)}`;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded hover:bg-muted transition-colors",
        isCurrent && "bg-muted ring-1 ring-primary",
      )}
    >
      <PokemonImage
        src={sprite}
        alt={name}
        pokemonId={id}
        width={96}
        height={96}
        className={
          isSmall ? "size-10 md:size-12" : "size-16 md:size-20 lg:size-24"
        }
      />
      <span className={cn("text-center", isSmall ? "text-[10px]" : "text-xs")}>
        {name}
      </span>
      {!isSmall && (
        <span className="text-[10px] text-muted-foreground">
          #{id.toString().padStart(3, "0")}
        </span>
      )}
    </Link>
  );
}

function EvolutionNodeVariations({
  variations,
  currentSlug,
  pokemonId,
}: {
  variations: ReturnType<typeof getDexPokemonVariationsByDexNumber>;
  currentSlug: string;
  pokemonId: number;
}) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();

  // Separate base form from other variations
  const baseVariation = variations.find((v) => !v.isForm) ?? variations[0];
  const otherVariations = variations.filter((v) => v !== baseVariation);

  const baseSprite =
    pokemonSprite(baseVariation.name, { gen: defaultPokemonSpriteGen }) ?? "";
  const isBaseCurrentSlug = baseVariation.slug === currentSlug;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Base form - larger */}
      <EvolutionNodeCard
        name={baseVariation.name}
        sprite={baseSprite}
        id={pokemonId}
        isCurrent={isBaseCurrentSlug}
      />

      {/* Other variations - smaller grid */}
      {otherVariations.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5 max-w-32">
          {otherVariations.map((v) => {
            const sprite =
              pokemonSprite(v.name, { gen: defaultPokemonSpriteGen }) ?? "";
            const isCurrent = v.slug === currentSlug;
            return (
              <EvolutionNodeCard
                key={v.slug}
                name={v.name}
                sprite={sprite}
                id={v.id}
                isCurrent={isCurrent}
                isSmall
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatEvolutionMethod(
  detail: EvolutionChainLink["evolutionDetails"][0],
): string {
  if (detail.minLevel) return `Lv.${detail.minLevel}`;
  if (detail.item) return detail.item;
  if (detail.minHappiness) return "Friendship";
  if (detail.knownMove) return detail.knownMove;
  if (detail.timeOfDay) return detail.timeOfDay;
  if (detail.heldItem) return `Hold ${detail.heldItem}`;
  return detail.trigger;
}

// ============================================================================
// Details Section
// ============================================================================

function DetailsSection({
  pokemon,
  species,
}: {
  pokemon: Pokemon;
  species?: PokemonSpecies;
}) {
  const genderDisplay = species
    ? species.genderRate === -1
      ? "Genderless"
      : `${(8 - species.genderRate) * 12.5}% ♂ / ${species.genderRate * 12.5}% ♀`
    : "—";

  const catchRatePercent = species
    ? ((species.captureRate / 255) * 100).toFixed(1)
    : "—";

  const hatchSteps = species
    ? (species.hatchCounter * 257).toLocaleString()
    : "—";

  return (
    <section className="space-y-6">
      {/* Breeding */}
      <div className="space-y-2">
        <Label>breeding</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow
            label="Egg Groups"
            value={species?.eggGroups.join(", ") ?? "—"}
          />
          <DetailRow label="Gender" value={genderDisplay} />
          <DetailRow
            label="Hatch Time"
            value={species ? `~${hatchSteps} steps` : "—"}
          />
        </div>
      </div>

      {/* Training */}
      <div className="space-y-2">
        <Label>training</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow
            label="Catch Rate"
            value={
              species ? `${species.captureRate} (${catchRatePercent}%)` : "—"
            }
          />
          <DetailRow label="Growth Rate" value={species?.growthRate ?? "—"} />
          <DetailRow
            label="EV Yield"
            value={
              species?.evYield.map((e) => `${e.value} ${e.stat}`).join(", ") ||
              "—"
            }
          />
          <DetailRow
            label="Base Happiness"
            value={species?.baseHappiness?.toString() ?? "—"}
          />
        </div>
      </div>

      {/* About */}
      <div className="space-y-2">
        <Label>about</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow
            label="Height"
            value={`${(pokemon.height / 10).toFixed(1)}m`}
          />
          <DetailRow
            label="Weight"
            value={`${(pokemon.weight / 10).toFixed(1)}kg`}
          />
          <DetailRow label="Generation" value={species?.generation ?? "—"} />
        </div>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function PokemonPageSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        <div className="space-y-6 md:col-span-5 lg:col-span-5 xl:col-span-5 2xl:col-span-4 md:self-start">
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="size-7" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="size-7" />
            </div>
            <div className="flex justify-center xl:justify-start gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-32 md:size-40 xl:size-44 2xl:size-48 mx-auto" />
              <div className="w-full space-y-2">
                <Skeleton className="h-6 w-32 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto" />
                <div className="flex justify-center gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <div className="flex flex-wrap gap-1">
                {WEAKNESS_SKELETON_KEYS.map((key) => (
                  <Skeleton key={key} className="h-5 w-14" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <div className="flex flex-wrap gap-1">
                {RESISTANCE_SKELETON_KEYS.map((key) => (
                  <Skeleton key={key} className="h-5 w-14" />
                ))}
              </div>
            </div>
          </section>

          {/* abilities */}
          <Skeleton className="h-10 w-full" />

          {/* base stats */}
          <section className="space-y-3">
            <Skeleton className="h-3 w-16" />
            {STAT_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-4 w-full" />
            ))}
          </section>

          {/* evolution */}
          <Skeleton className="h-10 w-full" />

          {/* variations */}
          <Skeleton className="h-10 w-full" />

          {/* details */}
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-6 md:col-span-7 lg:col-span-7 xl:col-span-7 2xl:col-span-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
