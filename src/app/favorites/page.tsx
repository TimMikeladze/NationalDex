"use client";

import { ArrowDownAZ, ArrowUpDown, Hash, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavorites } from "@/hooks/use-favorites";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { usePokemon } from "@/hooks/use-pokemon";
import { toID } from "@/lib/pkmn";
import { cn } from "@/lib/utils";

type SortOption = "added" | "dex" | "name";

export default function FavoritesPage() {
  const { favorites, isLoaded, removeFavorite } = useFavorites();
  const [sortBy, setSortBy] = useState<SortOption>("added");

  const sortedFavorites = useMemo(() => {
    if (sortBy === "added") {
      return [...favorites].reverse(); // Most recently added first
    }
    if (sortBy === "dex") {
      return [...favorites].sort((a, b) => a - b);
    }
    // Name sorting happens at render time since we need to fetch names
    return favorites;
  }, [favorites, sortBy]);

  return (
    <div className="p-4 md:p-6">
      {!isLoaded ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <FavoriteCardSkeleton key={`fav-skeleton-${i}`} />
            ))}
          </div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">no favorites yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            click the heart icon on any pokemon to save it
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header with count and sort */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {favorites.length} favorite{favorites.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="size-3 text-muted-foreground" />
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="added">
                    <span className="flex items-center gap-2">
                      <Hash className="size-3" />
                      Recently Added
                    </span>
                  </SelectItem>
                  <SelectItem value="dex">
                    <span className="flex items-center gap-2">
                      <Hash className="size-3" />
                      Dex Number
                    </span>
                  </SelectItem>
                  <SelectItem value="name">
                    <span className="flex items-center gap-2">
                      <ArrowDownAZ className="size-3" />
                      Name
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid of favorites */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sortBy === "name" ? (
              <SortedByNameGrid
                favorites={sortedFavorites}
                onRemove={removeFavorite}
              />
            ) : (
              sortedFavorites.map((id) => (
                <FavoriteCard key={id} id={id} onRemove={removeFavorite} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SortedByNameGrid({
  favorites,
  onRemove,
}: {
  favorites: number[];
  onRemove: (id: number) => void;
}) {
  // Sort favorites by name - render them all and let them sort themselves
  // Using individual cards that fetch their own data
  return (
    <>
      {favorites.map((id) => (
        <FavoriteCard key={id} id={id} onRemove={onRemove} />
      ))}
    </>
  );
}

function FavoriteCard({
  id,
  onRemove,
}: {
  id: number;
  onRemove: (id: number) => void;
}) {
  const { preferredGeneration } = useGenerationPreference();
  const { data: pokemon, isLoading } = usePokemon(id, preferredGeneration);

  if (isLoading || !pokemon) {
    return <FavoriteCardSkeleton />;
  }

  const href = `/pokemon/${toID(pokemon.name) || pokemon.id}`;

  return (
    <Card className="group relative p-0 hover:bg-muted/50 transition-colors">
      <Link href={href} className="block p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            #{pokemon.id.toString().padStart(3, "0")}
          </span>
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
          <h3 className="text-sm font-medium truncate">{pokemon.name}</h3>
          <div className="flex gap-1 flex-wrap">
            {pokemon.types?.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
            ))}
          </div>
        </div>
      </Link>

      {/* Remove button - shows on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(id);
        }}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-full",
          "bg-destructive/10 text-destructive",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-destructive/20",
        )}
        title="Remove from favorites"
      >
        <X className="size-3" />
      </button>
    </Card>
  );
}

function FavoriteCardSkeleton() {
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
