"use client";

import { ChevronDown, MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useLocationAreas } from "@/hooks/use-pokemon";
import {
  extractIdFromUrl,
  formatConditionName,
  formatLocationName,
  formatMethodName,
} from "@/lib/pokeapi";

const REGION_COLORS: Record<string, string> = {
  kanto: "#EF4444",
  johto: "#F59E0B",
  hoenn: "#22C55E",
  sinnoh: "#3B82F6",
  unova: "#8B5CF6",
  kalos: "#EC4899",
  alola: "#F97316",
  galar: "#14B8A6",
  hisui: "#6366F1",
  paldea: "#A855F7",
};

function formatVersionName(version: string): string {
  return version
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function LocationDetailClient({ name }: { name: string }) {
  const { data: location, isLoading, error } = useLocation(name);

  const areaNames = useMemo(() => {
    if (!location) return [];
    return location.areas.map((a) => a.name);
  }, [location]);

  const { data: areas, isLoading: areasLoading } = useLocationAreas(areaNames);

  // Collect all unique versions across all areas
  const allVersions = useMemo(() => {
    if (!areas) return [];
    const versions = new Set<string>();
    for (const area of areas) {
      for (const enc of area.pokemon_encounters) {
        for (const vd of enc.version_details) {
          versions.add(vd.version.name);
        }
      }
    }
    return [...versions].sort();
  }, [areas]);

  const hasEncounters = areas?.some((a) => a.pokemon_encounters.length > 0);

  if (isLoading) {
    return <LocationDetailSkeleton />;
  }

  if (error || !location) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="text-center py-12">
          <MapPin
            className="size-12 text-muted-foreground mb-4 mx-auto"
            strokeWidth={1}
          />
          <p className="text-muted-foreground">Location not found</p>
          <Link
            href="/locations"
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            Back to locations
          </Link>
        </div>
      </div>
    );
  }

  const englishName =
    location.names.find((n) => n.language.name === "en")?.name ??
    formatLocationName(location.name);

  const regionName = location.region?.name ?? null;
  const regionColor = regionName
    ? (REGION_COLORS[regionName] ?? "#9CA3AF")
    : null;
  const regionDisplayName = regionName ? formatLocationName(regionName) : null;

  const generations = location.game_indices.map((gi) =>
    formatLocationName(gi.generation.name),
  );

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <section className="space-y-2">
          <Link
            href="/locations"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; All locations
          </Link>
          <div className="flex items-start gap-3">
            <MapPin className="size-6 text-muted-foreground mt-1 shrink-0" />
            <div>
              <h1 className="text-xl font-medium">{englishName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  #{location.id.toString().padStart(3, "0")}
                </span>
                {regionName && regionColor && regionDisplayName && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${regionColor}20`,
                      color: regionColor,
                    }}
                  >
                    {regionDisplayName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Generations */}
        {generations.length > 0 && (
          <section className="space-y-2">
            <Label>appears in</Label>
            <div className="flex flex-wrap gap-2">
              {generations.map((gen) => (
                <span key={gen} className="px-2 py-1 text-xs bg-muted rounded">
                  {gen}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Areas */}
        <section className="space-y-3">
          <Label>
            areas{" "}
            <span className="text-muted-foreground">
              ({location.areas.length})
            </span>
          </Label>

          {areasLoading ? (
            <AreasSkeleton count={Math.min(location.areas.length, 3)} />
          ) : hasEncounters && areas ? (
            <EncounterAreas areas={areas} allVersions={allVersions} />
          ) : location.areas.length > 0 ? (
            <div className="space-y-2">
              {location.areas.map((area) => (
                <div key={area.name} className="p-3 border rounded-lg">
                  <p className="text-sm">
                    {formatAreaName(area.name, location.name)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No encounter data available
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No areas in this location
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Encounter Areas
// =============================================================================

interface AreaData {
  id: number;
  name: string;
  location: { name: string; url: string };
  names: { name: string; language: { name: string } }[];
  pokemon_encounters: {
    pokemon: { name: string; url: string };
    version_details: {
      version: { name: string; url: string };
      max_chance: number;
      encounter_details: {
        min_level: number;
        max_level: number;
        chance: number;
        method: { name: string; url: string };
        condition_values: { name: string; url: string }[];
      }[];
    }[];
  }[];
}

function EncounterAreas({
  areas,
  allVersions,
}: {
  areas: AreaData[];
  allVersions: string[];
}) {
  const [selectedVersion, setSelectedVersion] = useState<string>(
    allVersions[0] ?? "",
  );

  return (
    <div className="space-y-4">
      {/* Version Filter */}
      {allVersions.length > 1 && (
        <div className="space-y-2">
          <Label>game version</Label>
          <div className="relative w-fit">
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {allVersions.map((v) => (
                <option key={v} value={v}>
                  {formatVersionName(v)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}

      {/* Area Cards */}
      {areas.map((area) => (
        <AreaCard key={area.id} area={area} selectedVersion={selectedVersion} />
      ))}
    </div>
  );
}

// =============================================================================
// Area Card
// =============================================================================

interface EncounterItem {
  pokemonId: number;
  pokemonName: string;
  sprite: string;
  method: string;
  minLevel: number;
  maxLevel: number;
  chance: number;
  conditions: string[];
}

function AreaCard({
  area,
  selectedVersion,
}: {
  area: AreaData;
  selectedVersion: string;
}) {
  const englishName =
    area.names.find((n) => n.language.name === "en")?.name ??
    formatAreaName(area.name, area.location.name);

  // Filter encounters for the selected version
  const encounters = useMemo(() => {
    const result: EncounterItem[] = [];

    for (const enc of area.pokemon_encounters) {
      const pokemonId = extractIdFromUrl(enc.pokemon.url);
      const versionDetail = enc.version_details.find(
        (vd) => vd.version.name === selectedVersion,
      );
      if (!versionDetail) continue;

      for (const detail of versionDetail.encounter_details) {
        result.push({
          pokemonId,
          pokemonName: formatLocationName(enc.pokemon.name),
          sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
          method: formatMethodName(detail.method.name),
          minLevel: detail.min_level,
          maxLevel: detail.max_level,
          chance: detail.chance,
          conditions: detail.condition_values.map((c) =>
            formatConditionName(c.name),
          ),
        });
      }
    }

    // Sort by chance descending, then by pokemon name
    return result.sort(
      (a, b) =>
        b.chance - a.chance || a.pokemonName.localeCompare(b.pokemonName),
    );
  }, [area.pokemon_encounters, selectedVersion]);

  // Group encounters by method
  const encountersByMethod = useMemo(() => {
    const groups = new Map<string, EncounterItem[]>();
    for (const enc of encounters) {
      const existing = groups.get(enc.method) ?? [];
      existing.push(enc);
      groups.set(enc.method, existing);
    }
    return groups;
  }, [encounters]);

  if (encounters.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/50 border-b">
        <h3 className="text-sm font-medium">{englishName}</h3>
      </div>

      <div className="divide-y">
        {[...encountersByMethod.entries()].map(([method, encs]) => (
          <div key={method} className="px-4 py-3 space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {method}
            </span>
            <div className="space-y-1">
              {encs.map((enc, i) => (
                <EncounterRow
                  key={`${enc.pokemonId}-${enc.minLevel}-${enc.maxLevel}-${enc.chance}-${i}`}
                  encounter={enc}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Encounter Row
// =============================================================================

function EncounterRow({ encounter }: { encounter: EncounterItem }) {
  const levelText =
    encounter.minLevel === encounter.maxLevel
      ? `Lv. ${encounter.minLevel}`
      : `Lv. ${encounter.minLevel}-${encounter.maxLevel}`;

  return (
    <Link
      href={`/pokemon/${encounter.pokemonId}`}
      className="flex items-center gap-3 py-1 group hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
    >
      <PokemonImage
        src={encounter.sprite}
        alt={encounter.pokemonName}
        pokemonId={encounter.pokemonId}
        width={40}
        height={40}
        className="size-8 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm group-hover:text-primary transition-colors truncate block">
          {encounter.pokemonName}
        </span>
        {encounter.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {encounter.conditions.map((c) => (
              <span
                key={c}
                className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {levelText}
      </span>
      <span className="text-xs tabular-nums shrink-0 w-10 text-right">
        {encounter.chance}%
      </span>
    </Link>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatAreaName(areaName: string, locationName: string): string {
  // Remove the location name prefix from the area name for cleaner display
  let cleanName = areaName;
  if (cleanName.startsWith(locationName)) {
    cleanName = cleanName.slice(locationName.length);
    // Remove leading dash
    if (cleanName.startsWith("-")) {
      cleanName = cleanName.slice(1);
    }
  }

  if (!cleanName || cleanName === "area") {
    return formatLocationName(areaName);
  }

  return formatLocationName(cleanName);
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

const SKEL_GENS = Array.from({ length: 3 }, (_, i) => `gen-skel-${i}`);
const SKEL_ENCOUNTERS = Array.from({ length: 5 }, (_, i) => `enc-skel-${i}`);

function AreasSkeleton({ count }: { count: number }) {
  const keys = Array.from({ length: count }, (_, i) => `area-skel-${i}`);
  return (
    <div className="space-y-4">
      {keys.map((key) => (
        <div key={key} className="border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/50 border-b">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="px-4 py-3 space-y-2">
            <Skeleton className="h-3 w-16" />
            {SKEL_ENCOUNTERS.map((k) => (
              <div key={k} className="flex items-center gap-3 py-1">
                <Skeleton className="size-8 rounded" />
                <Skeleton className="h-4 w-24 flex-1" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LocationDetailSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="space-y-6">
        {/* Back link */}
        <Skeleton className="h-3 w-20" />

        {/* Header */}
        <section className="space-y-2">
          <div className="flex items-start gap-3">
            <Skeleton className="size-6 mt-1" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </section>

        {/* Generations */}
        <section className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-2">
            {SKEL_GENS.map((key) => (
              <Skeleton key={key} className="h-6 w-24" />
            ))}
          </div>
        </section>

        {/* Areas */}
        <section className="space-y-3">
          <Skeleton className="h-3 w-12" />
          <AreasSkeleton count={2} />
        </section>
      </div>
    </div>
  );
}
