"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import {
  PokemonCard,
  PokemonCardSkeleton,
} from "@/components/pokemon/pokemon-card";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFullMoveDetail } from "@/hooks/use-pokemon";
import { cn } from "@/lib/utils";
import type { MovePokemon } from "@/types/pokemon";

// Pokemon ID ranges by generation
const GEN_RANGES = [
  { id: "gen-1", name: "Gen I", min: 1, max: 151 },
  { id: "gen-2", name: "Gen II", min: 152, max: 251 },
  { id: "gen-3", name: "Gen III", min: 252, max: 386 },
  { id: "gen-4", name: "Gen IV", min: 387, max: 493 },
  { id: "gen-5", name: "Gen V", min: 494, max: 649 },
  { id: "gen-6", name: "Gen VI", min: 650, max: 721 },
  { id: "gen-7", name: "Gen VII", min: 722, max: 809 },
  { id: "gen-8", name: "Gen VIII", min: 810, max: 905 },
  { id: "gen-9", name: "Gen IX", min: 906, max: 1025 },
] as const;

function getGeneration(pokemonId: number): string | null {
  for (const gen of GEN_RANGES) {
    if (pokemonId >= gen.min && pokemonId <= gen.max) {
      return gen.id;
    }
  }
  return null;
}

export function MoveDetailClient({ name }: { name: string }) {
  const { data: move, isLoading, error } = useFullMoveDetail(name);

  if (isLoading) {
    return <MoveDetailSkeleton />;
  }

  if (error || !move) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Move not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium">{move.name}</h1>
            <TypeBadge type={move.type} size="default" />
            <AddToListDialog
              itemType="move"
              itemId={name}
              itemName={move.name}
            />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {move.description}
          </p>
        </section>

        {/* Stats Grid */}
        <section className="space-y-3">
          <Label>stats</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Power" value={move.power?.toString() ?? "—"} />
            <StatCard
              label="Accuracy"
              value={move.accuracy ? `${move.accuracy}%` : "—"}
            />
            <StatCard label="PP" value={move.pp.toString()} />
            <StatCard label="Priority" value={move.priority.toString()} />
            <StatCard
              label="Category"
              value={move.damageClass}
              className="capitalize"
            />
            <StatCard label="Target" value={move.target} />
          </div>
        </section>

        {/* Additional Info */}
        <section className="space-y-3">
          <Label>details</Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <DetailRow label="Generation" value={move.generation} />
            {move.effectChance && (
              <DetailRow
                label="Effect Chance"
                value={`${move.effectChance}%`}
              />
            )}
          </div>
        </section>

        {/* Pokemon that learn this move */}
        <PokemonSection pokemon={move.pokemon} moveName={move.name} />
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

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="p-3 border rounded-lg">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
        {label}
      </span>
      <span className={cn("text-lg font-medium tabular-nums", className)}>
        {value}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </>
  );
}

function PokemonSection({
  pokemon,
  moveName,
}: {
  pokemon: MovePokemon[];
  moveName: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedGens, setSelectedGens] = useState<string[]>([]);

  const filteredPokemon = useMemo(() => {
    return pokemon.filter((poke) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = poke.name.toLowerCase().includes(searchLower);
        const matchesId = poke.id.toString().includes(search);
        if (!matchesName && !matchesId) {
          return false;
        }
      }

      // Generation filter
      if (selectedGens.length > 0) {
        const pokeGen = getGeneration(poke.id);
        if (!pokeGen || !selectedGens.includes(pokeGen)) {
          return false;
        }
      }

      return true;
    });
  }, [pokemon, search, selectedGens]);

  const sortedPokemon = useMemo(() => {
    return [...filteredPokemon].sort((a, b) => a.id - b.id);
  }, [filteredPokemon]);

  const toggleGen = (genId: string) => {
    setSelectedGens((prev) =>
      prev.includes(genId) ? prev.filter((g) => g !== genId) : [...prev, genId],
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedGens([]);
  };

  const hasFilters = search || selectedGens.length > 0;

  return (
    <section className="space-y-4">
      <Label>pokemon that can learn {moveName}</Label>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Generation filters */}
        <div className="flex flex-wrap gap-1.5">
          {GEN_RANGES.map((gen) => (
            <button
              key={gen.id}
              type="button"
              onClick={() => toggleGen(gen.id)}
              className={cn(
                "px-2 py-1 text-[10px] border rounded transition-colors",
                selectedGens.includes(gen.id)
                  ? "bg-foreground text-background border-foreground"
                  : "hover:bg-muted",
              )}
            >
              {gen.name}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {hasFilters ? (
          <>
            Showing {filteredPokemon.length} of {pokemon.length} Pokémon
          </>
        ) : (
          <>{pokemon.length} Pokémon can learn this move</>
        )}
      </p>

      {/* Pokemon grid */}
      {sortedPokemon.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {sortedPokemon.map((poke) => (
            <PokemonCard key={poke.id} id={poke.id} name={poke.name} />
          ))}
        </div>
      ) : hasFilters ? (
        <p className="text-sm text-muted-foreground py-4">
          No Pokémon match your filters
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No Pokémon learn this move.
        </p>
      )}
    </section>
  );
}

function MoveDetailSkeleton() {
  const statSkeletonKeys = Array.from(
    { length: 6 },
    (_, i) => `stats-skeleton-${i}`,
  );
  const pokemonSkeletonKeys = Array.from(
    { length: 24 },
    (_, i) => `pokemon-skeleton-${i}`,
  );
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </section>

        <section className="space-y-3">
          <Skeleton className="h-3 w-12" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statSkeletonKeys.map((key) => (
              <Skeleton key={key} className="h-20 w-full" />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {pokemonSkeletonKeys.map((key) => (
              <PokemonCardSkeleton key={key} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
