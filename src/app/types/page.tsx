"use client";

import { Grid3X3, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { useAllTypes } from "@/hooks/use-pokemon";
import {
  getAllTypes,
  getGenerationGames,
  getGenerationName,
  getOffensiveTypeMatchups,
  LATEST_GEN,
} from "@/lib/pkmn";
import { cn } from "@/lib/utils";
import type { PokemonType, TypeDetail } from "@/types/pokemon";
import { TYPE_COLORS } from "@/types/pokemon";

type ViewMode = "cards" | "matrix";

export default function TypesPage() {
  const { preferredGeneration } = useGenerationPreference();
  const { data: types, isLoading } = useAllTypes(preferredGeneration);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="space-y-6">
        <section className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-medium">Types</h1>
            <p className="text-sm text-muted-foreground">
              {preferredGeneration === null
                ? `All ${types?.length ?? 18} Pokemon types with their damage relations`
                : `The ${types?.length ?? 0} types of ${getGenerationName(preferredGeneration)} (${getGenerationGames(preferredGeneration)}) with that generation's damage relations`}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              title="Card view"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "matrix" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("matrix")}
              title="Matrix view"
            >
              <Grid3X3 className="size-4" />
            </Button>
          </div>
        </section>

        {isLoading ? (
          <TypesGridSkeleton />
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {types?.map((type) => (
              <TypeCard key={type.id} type={type} />
            ))}
          </div>
        ) : (
          <TypeEffectivenessMatrix generation={preferredGeneration} />
        )}
      </div>
    </div>
  );
}

function TypeEffectivenessMatrix({
  generation,
}: {
  generation: number | null;
}) {
  const typeNames = getAllTypes(generation ?? LATEST_GEN).map(
    (t) => t.name as PokemonType,
  );

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        <p>
          Rows = Attacking type, Columns = Defending type. Green = super
          effective (2x), Red = not very effective (0.5x), Black = immune (0x).
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="p-1 text-muted-foreground text-[9px] uppercase tracking-wider sticky left-0 bg-background z-10">
                Atk / Def
              </th>
              {typeNames.map((type) => (
                <th key={type} className="p-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/types/${type}`}
                        className="block size-6 rounded-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: TYPE_COLORS[type] }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{type}</TooltipContent>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {typeNames.map((attackingType) => (
              <tr key={attackingType}>
                <td className="p-0.5 sticky left-0 bg-background z-10">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/types/${attackingType}`}
                        className="block size-6 rounded-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: TYPE_COLORS[attackingType] }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{attackingType}</TooltipContent>
                  </Tooltip>
                </td>
                {typeNames.map((defendingType) => {
                  const matchups = getOffensiveTypeMatchups(
                    attackingType,
                    generation ?? LATEST_GEN,
                  );
                  let multiplier = 1;

                  if (matchups.superEffective.includes(defendingType)) {
                    multiplier = 2;
                  } else if (
                    matchups.notVeryEffective.includes(defendingType)
                  ) {
                    multiplier = 0.5;
                  } else if (matchups.noEffect.includes(defendingType)) {
                    multiplier = 0;
                  }

                  return (
                    <td key={defendingType} className="p-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "size-6 flex items-center justify-center rounded-sm font-bold text-[10px]",
                              multiplier === 2 &&
                                "bg-green-500/30 text-green-600 dark:text-green-400",
                              multiplier === 0.5 &&
                                "bg-red-500/30 text-red-600 dark:text-red-400",
                              multiplier === 0 &&
                                "bg-zinc-900 text-zinc-500 dark:bg-zinc-800",
                              multiplier === 1 &&
                                "bg-muted/50 text-muted-foreground",
                            )}
                          >
                            {multiplier === 2
                              ? "2"
                              : multiplier === 0.5
                                ? "½"
                                : multiplier === 0
                                  ? "0"
                                  : ""}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {attackingType} → {defendingType}:{" "}
                          {multiplier === 2
                            ? "Super effective (2x)"
                            : multiplier === 0.5
                              ? "Not very effective (0.5x)"
                              : multiplier === 0
                                ? "No effect (0x)"
                                : "Normal (1x)"}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm bg-green-500/30" />
          <span>Super effective (2x)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm bg-red-500/30" />
          <span>Not very effective (0.5x)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm bg-zinc-900 dark:bg-zinc-800" />
          <span>No effect (0x)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-sm bg-muted/50" />
          <span>Normal (1x)</span>
        </div>
      </div>
    </div>
  );
}

function TypeCard({ type }: { type: TypeDetail }) {
  const color = TYPE_COLORS[type.name];
  const weakCount = type.damageRelations.doubleDamageFrom.length;
  const resistCount =
    type.damageRelations.halfDamageFrom.length +
    type.damageRelations.noDamageFrom.length;

  return (
    <Link
      href={`/types/${type.name}`}
      className="group block p-4 rounded-lg border hover:border-transparent transition-all"
      style={{
        backgroundColor: `${color}10`,
        // @ts-expect-error - CSS custom property
        "--hover-bg": `${color}25`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${color}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = `${color}10`;
      }}
    >
      <div className="space-y-3">
        {/* Type name badge */}
        <span
          className="inline-block text-[11px] px-2 py-1 uppercase tracking-wider rounded font-medium"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          {type.name}
        </span>

        {/* Quick effectiveness summary */}
        <div className="space-y-1.5">
          <EffectivenessRow
            label="Weak to"
            types={type.damageRelations.doubleDamageFrom}
            count={weakCount}
          />
          <EffectivenessRow
            label="Resists"
            types={[
              ...type.damageRelations.halfDamageFrom,
              ...type.damageRelations.noDamageFrom,
            ]}
            count={resistCount}
          />
        </div>
      </div>
    </Link>
  );
}

function EffectivenessRow({
  label,
  types,
  count,
}: {
  label: string;
  types: PokemonType[];
  count: number;
}) {
  const displayTypes = types.slice(0, 3);
  const remaining = count - displayTypes.length;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">
        {label}
      </span>
      <div className="flex gap-0.5 flex-wrap">
        {displayTypes.map((t) => (
          <span
            key={t}
            className="size-4 rounded-sm"
            style={{ backgroundColor: TYPE_COLORS[t] }}
            title={t}
          />
        ))}
        {remaining > 0 && (
          <span className="text-[9px] text-muted-foreground">+{remaining}</span>
        )}
        {count === 0 && (
          <span className="text-[9px] text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

function TypesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 18 }).map((_, i) => (
        <Skeleton key={`type-skeleton-${i}`} className="h-28" />
      ))}
    </div>
  );
}
