"use client";

import { GitCompareArrows, Heart } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useComparison } from "@/hooks/use-comparison";
import { useFavorites } from "@/hooks/use-favorites";
import { calculateTypeEffectiveness, usePokemon } from "@/hooks/use-pokemon";
import { toID } from "@/lib/pkmn";
import { cn } from "@/lib/utils";
import type { Pokemon, PokemonType, TypeEffectiveness } from "@/types/pokemon";
import { PokemonImage } from "./pokemon-image";
import { StatsGrid } from "./stat-bar";
import { TypeBadge } from "./type-badge";

// =============================================================================
// Variant Helpers
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

/**
 * Extract the variant suffix from a Pokemon name.
 * e.g., "Pikachu-Gmax" -> "Gmax", "Raichu-Alola" -> "Alola"
 */
function getVariantFromName(name: string): string | null {
  for (const suffix of VARIANT_SUFFIXES) {
    if (name.endsWith(`-${suffix}`)) {
      return suffix;
    }
  }
  return null;
}

/**
 * Get the base name without the variant suffix.
 * e.g., "Pikachu-Gmax" -> "Pikachu", "Raichu-Alola" -> "Raichu"
 */
function getBaseName(name: string): string {
  const variant = getVariantFromName(name);
  if (variant) {
    return name.slice(0, -(variant.length + 1)); // Remove "-Variant"
  }
  return name;
}

// Variant display names for prettier rendering
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

function VariantBadge({
  variant,
  size = "sm",
}: {
  variant: string;
  size?: "sm" | "default";
}) {
  const displayName = VARIANT_DISPLAY_NAMES[variant] ?? variant;
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded border border-border bg-muted text-muted-foreground",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      )}
    >
      {displayName}
    </span>
  );
}

// =============================================================================
// Region Helpers
// =============================================================================

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

/**
 * Get the region a Pokemon is originally from based on its dex number.
 */
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

function RegionBadge({
  region,
  size = "sm",
}: {
  region: Region;
  size?: "sm" | "default";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded border border-border bg-muted text-muted-foreground",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      )}
    >
      {region}
    </span>
  );
}

// =============================================================================
// Types
// =============================================================================

export type PokemonCardVariant = "compact" | "default" | "detail";

export type PokemonCardData = {
  id: number;
  name: string;
  sprite: string;
  /**
   * Optional; when absent, type badges are simply hidden.
   * (Useful for dense grids like "learns this move", where we only have sprite/id.)
   */
  types?: PokemonType[];
};

interface BasePokemonCardProps {
  variant?: PokemonCardVariant;
  showFavorite?: boolean;
  /**
   * Optional per-card meta line (e.g. rarity % on item pages).
   * Displayed only for variants that render it (tile).
   */
  meta?: React.ReactNode;
  className?: string;
}

interface PokemonCardWithDataProps extends BasePokemonCardProps {
  pokemon: Pokemon | PokemonCardData;
  name?: never;
  id?: never;
}

interface PokemonCardWithNameProps extends BasePokemonCardProps {
  name: string;
  id: number;
  pokemon?: never;
}

export type PokemonCardProps =
  | PokemonCardWithDataProps
  | PokemonCardWithNameProps;

const DETAIL_STAT_SKELETON_KEYS = Array.from(
  { length: 6 },
  (_, i) => `detail-stat-${i}`,
);
const DETAIL_BADGE_SKELETON_KEYS = Array.from(
  { length: 3 },
  (_, i) => `detail-badge-${i}`,
);
function isFullPokemon(p: Pokemon | PokemonCardData): p is Pokemon {
  return (
    Array.isArray((p as Pokemon).types) && Array.isArray((p as Pokemon).stats)
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PokemonCard(props: PokemonCardProps) {
  const { variant = "default", showFavorite = true, meta, className } = props;

  // If pokemon data is provided directly, use it
  if ("pokemon" in props && props.pokemon) {
    // Detail variant needs full Pokemon data (stats, abilities, etc). If we only
    // have minimal info, fall back to fetching.
    if (variant === "detail" && !isFullPokemon(props.pokemon)) {
      return (
        <PokemonCardFetcher
          name={props.pokemon.name}
          id={props.pokemon.id}
          variant={variant}
          showFavorite={showFavorite}
          className={className}
        />
      );
    }

    return (
      <PokemonCardContent
        pokemon={props.pokemon}
        variant={variant}
        showFavorite={showFavorite}
        meta={meta}
        className={className}
      />
    );
  }

  // Otherwise, fetch the data
  return (
    <PokemonCardFetcher
      name={props.name}
      id={props.id}
      variant={variant}
      showFavorite={showFavorite}
      meta={meta}
      className={className}
    />
  );
}

// =============================================================================
// Fetcher Wrapper (for backward compatibility)
// =============================================================================

function PokemonCardFetcher({
  name,
  id,
  variant,
  showFavorite,
  meta,
  className,
}: {
  name: string;
  id: number;
  variant: PokemonCardVariant;
  showFavorite: boolean;
  meta?: React.ReactNode;
  className?: string;
}) {
  // Prefer slug lookups so formes resolve correctly.
  // (Dex numbers are shared across many formes, so ID-only fetches lose the variant.)
  const lookup = toID(name) || id;
  const { data: pokemon, isLoading } = usePokemon(lookup);

  if (isLoading || !pokemon) {
    return <PokemonCardSkeleton variant={variant} />;
  }

  return (
    <PokemonCardContent
      pokemon={pokemon}
      variant={variant}
      showFavorite={showFavorite}
      meta={meta}
      className={className}
    />
  );
}

// =============================================================================
// Card Content
// =============================================================================

function PokemonCardContent({
  pokemon,
  variant,
  showFavorite,
  meta,
  className,
}: {
  pokemon: Pokemon | PokemonCardData;
  variant: PokemonCardVariant;
  showFavorite: boolean;
  meta?: React.ReactNode;
  className?: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInComparison, toggleComparison } = useComparison();

  const types = pokemon.types ?? [];
  const typeEffectiveness = useMemo(
    () => calculateTypeEffectiveness(types),
    [types],
  );

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(pokemon.id);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleComparison(pokemon.id);
  };

  if (variant === "compact") {
    return <CompactCard pokemon={pokemon} className={className} />;
  }

  if (variant === "detail") {
    // DetailCard requires full Pokemon data (with stats, abilities, etc.)
    if (!("stats" in pokemon)) {
      return <CompactCard pokemon={pokemon} className={className} />;
    }
    return (
      <DetailCard
        pokemon={pokemon}
        typeEffectiveness={typeEffectiveness}
        showFavorite={showFavorite}
        isFavorite={isFavorite(pokemon.id)}
        onFavoriteClick={handleFavoriteClick}
        isInComparison={isInComparison(pokemon.id)}
        onCompareClick={handleCompareClick}
        className={className}
      />
    );
  }

  // Default variant
  return (
    <DefaultCard
      pokemon={pokemon}
      showFavorite={showFavorite}
      isFavorite={isFavorite(pokemon.id)}
      onFavoriteClick={handleFavoriteClick}
      isInComparison={isInComparison(pokemon.id)}
      onCompareClick={handleCompareClick}
      meta={meta}
      className={className}
    />
  );
}

// =============================================================================
// Compact Variant
// =============================================================================

function CompactCard({
  pokemon,
  className,
}: {
  pokemon: Pokemon | PokemonCardData;
  className?: string;
}) {
  const href = `/pokemon/${toID(pokemon.name) || pokemon.id}`;
  return (
    <Link href={href} className={cn("block", className)}>
      <Card className="p-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <PokemonImage
            src={pokemon.sprite}
            alt={pokemon.name}
            pokemonId={pokemon.id}
            width={40}
            height={40}
            className="size-10"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium truncate">
              {getBaseName(pokemon.name)}
            </h3>
            <div className="flex gap-1">
              {pokemon.types?.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
              {(() => {
                const variant = getVariantFromName(pokemon.name);
                if (variant) {
                  return <VariantBadge variant={variant} size="sm" />;
                }
                const region = getRegionFromDexNumber(pokemon.id);
                return region ? (
                  <RegionBadge region={region} size="sm" />
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// =============================================================================
// Default Variant
// =============================================================================

function DefaultCard({
  pokemon,
  showFavorite,
  isFavorite,
  onFavoriteClick,
  isInComparison,
  onCompareClick,
  meta,
  className,
}: {
  pokemon: Pokemon | PokemonCardData;
  showFavorite: boolean;
  isFavorite: boolean;
  onFavoriteClick: (e: React.MouseEvent) => void;
  isInComparison: boolean;
  onCompareClick: (e: React.MouseEvent) => void;
  meta?: React.ReactNode;
  className?: string;
}) {
  const href = `/pokemon/${toID(pokemon.name) || pokemon.id}`;
  return (
    <Card
      className={cn(
        "group relative p-0 hover:bg-muted/50 transition-colors",
        className,
      )}
    >
      <Link href={href} className="block p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground tabular-nums">
              #{pokemon.id.toString().padStart(3, "0")}
            </span>
            {meta ? (
              <span className="text-[10px] text-muted-foreground tabular-nums truncate">
                {meta}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onCompareClick}
              className={cn(
                "transition-colors",
                isInComparison
                  ? "text-blue-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={
                isInComparison ? "Remove from comparison" : "Add to comparison"
              }
            >
              <GitCompareArrows
                className={cn("size-3.5", isInComparison && "fill-current")}
              />
            </button>
            {showFavorite && (
              <button type="button" onClick={onFavoriteClick}>
                <Heart
                  className={cn("size-3.5", isFavorite && "fill-current")}
                />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center py-2 md:py-3">
          <PokemonImage
            src={pokemon.sprite}
            alt={pokemon.name}
            pokemonId={pokemon.id}
            width={96}
            height={96}
            className="size-16 md:size-20 lg:size-24"
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium truncate">
            {getBaseName(pokemon.name)}
          </h3>
          <div className="flex gap-1">
            {pokemon.types?.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
            ))}
            {(() => {
              const variant = getVariantFromName(pokemon.name);
              if (variant) {
                return <VariantBadge variant={variant} size="sm" />;
              }
              const region = getRegionFromDexNumber(pokemon.id);
              return region ? <RegionBadge region={region} size="sm" /> : null;
            })()}
          </div>
        </div>
      </Link>
    </Card>
  );
}

// =============================================================================
// Detail Variant
// =============================================================================

function DetailCard({
  pokemon,
  typeEffectiveness,
  showFavorite,
  isFavorite,
  onFavoriteClick,
  isInComparison,
  onCompareClick,
  className,
}: {
  pokemon: Pokemon;
  typeEffectiveness: TypeEffectiveness;
  showFavorite: boolean;
  isFavorite: boolean;
  onFavoriteClick: (e: React.MouseEvent) => void;
  isInComparison: boolean;
  onCompareClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const href = `/pokemon/${toID(pokemon.name) || pokemon.id}`;
  return (
    <Card className={cn("p-4 md:p-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs text-muted-foreground tabular-nums">
          #{pokemon.id.toString().padStart(3, "0")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCompareClick}
            className={cn(
              "transition-colors",
              isInComparison
                ? "text-blue-500"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={
              isInComparison ? "Remove from comparison" : "Add to comparison"
            }
          >
            <GitCompareArrows
              className={cn("size-4", isInComparison && "fill-current")}
            />
          </button>
          {showFavorite && (
            <button
              type="button"
              onClick={onFavoriteClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart className={cn("size-4", isFavorite && "fill-current")} />
            </button>
          )}
        </div>
      </div>

      {/* Pokemon Image & Name */}
      <Link href={href} className="block">
        <div className="flex flex-col items-center mb-4">
          <PokemonImage
            src={pokemon.sprite}
            alt={pokemon.name}
            pokemonId={pokemon.id}
            width={128}
            height={128}
            className="size-24 md:size-32"
          />
          <h3 className="text-lg font-medium mt-2">
            {getBaseName(pokemon.name)}
          </h3>
          <div className="flex gap-2 mt-2 justify-center">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
            {(() => {
              const variant = getVariantFromName(pokemon.name);
              if (variant) {
                return <VariantBadge variant={variant} />;
              }
              const region = getRegionFromDexNumber(pokemon.id);
              return region ? <RegionBadge region={region} /> : null;
            })()}
          </div>
        </div>
      </Link>

      {/* Stats */}
      <div className="mb-4">
        <Label>base stats</Label>
        <StatsGrid stats={pokemon.stats} showTotal size="sm" className="mt-2" />
      </div>

      {/* Abilities */}
      <div className="mb-4">
        <Label>abilities</Label>
        <div className="flex flex-wrap gap-1 mt-2">
          {pokemon.abilities.map((ability) => (
            <span
              key={ability.name}
              className={cn(
                "text-xs px-2 py-0.5 border rounded",
                ability.isHidden && "text-muted-foreground border-dashed",
              )}
            >
              {ability.name}
              {ability.isHidden && " (H)"}
            </span>
          ))}
        </div>
      </div>

      {/* Type Effectiveness */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>weaknesses</Label>
          <div className="flex flex-wrap gap-1 mt-2">
            {typeEffectiveness.weaknesses.length > 0 ? (
              typeEffectiveness.weaknesses.map(({ type, multiplier }) => (
                <TypeBadge
                  key={type}
                  type={type}
                  multiplier={multiplier}
                  size="sm"
                />
              ))
            ) : (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
        </div>
        <div>
          <Label>resistances</Label>
          <div className="flex flex-wrap gap-1 mt-2">
            {typeEffectiveness.resistances.length > 0 ||
            typeEffectiveness.immunities.length > 0 ? (
              <>
                {typeEffectiveness.resistances.map(({ type, multiplier }) => (
                  <TypeBadge
                    key={type}
                    type={type}
                    multiplier={multiplier}
                    size="sm"
                  />
                ))}
                {typeEffectiveness.immunities.map((type) => (
                  <TypeBadge key={type} type={type} multiplier={0} size="sm" />
                ))}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
      {children}
    </span>
  );
}

// =============================================================================
// Skeletons
// =============================================================================

export function PokemonCardSkeleton({
  variant = "default",
}: {
  variant?: PokemonCardVariant;
}) {
  if (variant === "compact") {
    return (
      <Card className="p-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-10" />
          <div className="flex-1">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </Card>
    );
  }

  if (variant === "detail") {
    return (
      <Card className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-4" />
        </div>
        <div className="flex flex-col items-center mb-4">
          <Skeleton className="size-24 md:size-32" />
          <Skeleton className="h-5 w-24 mt-2" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
        <div className="mb-4">
          <Skeleton className="h-3 w-16 mb-2" />
          {DETAIL_STAT_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-3 w-full mb-1" />
          ))}
        </div>
        <div className="mb-4">
          <Skeleton className="h-3 w-14 mb-2" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-3 w-16 mb-2" />
            <div className="flex flex-wrap gap-1">
              {DETAIL_BADGE_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-4 w-12" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-3 w-16 mb-2" />
            <div className="flex flex-wrap gap-1">
              {DETAIL_BADGE_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-4 w-12" />
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default skeleton
  return (
    <Card className="p-3 md:p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="flex flex-col items-center py-2 md:py-3">
        <Skeleton className="size-16 md:size-20 lg:size-24" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </Card>
  );
}
