"use client";

import { Filter, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TrainersIcon } from "@/components/navigation/app-icons";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { getGenerationName, resolveSpecies } from "@/lib/pkmn";
import { pokemonSprite } from "@/lib/sprites";
import {
  formatTrainerRole,
  getAllTrainers,
  getTrainerGenerations,
  TRAINER_REGION_LABELS,
  TRAINER_ROLES,
} from "@/lib/trainers";
import { cn } from "@/lib/utils";
import type { Trainer, TrainerRole } from "@/types/trainer";

interface Filters {
  search: string;
  generations: number[];
  roles: TrainerRole[];
}

const EMPTY_FILTERS: Filters = { search: "", generations: [], roles: [] };

export function TrainersPageClient() {
  const trainers = getAllTrainers();
  const generations = getTrainerGenerations();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return trainers.filter((trainer) => {
      if (search) {
        const haystack = [
          trainer.name,
          trainer.location,
          trainer.badge ?? "",
          trainer.type ?? "",
          trainer.ace ?? "",
          trainer.games,
          formatTrainerRole(trainer.role),
          TRAINER_REGION_LABELS[trainer.region],
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (
        filters.generations.length > 0 &&
        !filters.generations.includes(trainer.generation)
      ) {
        return false;
      }
      if (filters.roles.length > 0 && !filters.roles.includes(trainer.role)) {
        return false;
      }
      return true;
    });
  }, [trainers, filters]);

  const activeFilterCount = filters.generations.length + filters.roles.length;

  const toggleGeneration = (gen: number) =>
    setFilters((prev) => ({
      ...prev,
      generations: prev.generations.includes(gen)
        ? prev.generations.filter((g) => g !== gen)
        : [...prev.generations, gen],
    }));

  const toggleRole = (role: TrainerRole) =>
    setFilters((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search trainers, badges, cities..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {filters.search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors",
              showFilters && "bg-muted",
            )}
          >
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label>Generation</Label>
              <div className="flex flex-wrap gap-2">
                {generations.map((gen) => (
                  <FilterChip
                    key={gen}
                    selected={filters.generations.includes(gen)}
                    onClick={() => toggleGeneration(gen)}
                  >
                    {getGenerationName(gen)}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex flex-wrap gap-2">
                {TRAINER_ROLES.map((role) => (
                  <FilterChip
                    key={role}
                    selected={filters.roles.includes(role)}
                    onClick={() => toggleRole(role)}
                  >
                    {formatTrainerRole(role)}
                  </FilterChip>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...EMPTY_FILTERS,
                    search: prev.search,
                  }))
                }
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {trainers.length} trainers
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((trainer) => (
          <TrainerCard key={trainer.slug} trainer={trainer} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <TrainersIcon
            className="size-12 text-muted-foreground mb-4 mx-auto"
            strokeWidth={1}
          />
          <p className="text-sm text-muted-foreground">
            No trainers found matching your filters
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "text-xs px-3 py-1 rounded-full border transition-colors",
        selected
          ? "bg-foreground text-background border-foreground"
          : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function TrainerCard({ trainer }: { trainer: Trainer }) {
  const ace = trainer.ace ? resolveSpecies(trainer.ace) : undefined;

  return (
    <Link
      href={`/trainers/${trainer.slug}`}
      className="group flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="size-14 shrink-0 flex items-center justify-center">
        {ace ? (
          <PokemonImage
            src={pokemonSprite(ace.name)}
            alt={ace.name}
            pokemonId={ace.num}
            width={56}
            height={56}
          />
        ) : (
          <TrainersIcon
            className="size-8 text-muted-foreground"
            strokeWidth={1}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {trainer.name}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {formatTrainerRole(trainer.role)} ·{" "}
          {TRAINER_REGION_LABELS[trainer.region]} ·{" "}
          {getGenerationName(trainer.generation)}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {trainer.type ? (
            <TypeBadge type={trainer.type} size="sm" />
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Mixed
            </span>
          )}
          {trainer.badge && (
            <span className="text-[10px] text-muted-foreground truncate">
              {trainer.badge}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
