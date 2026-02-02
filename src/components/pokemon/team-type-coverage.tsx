"use client";

import { useMemo } from "react";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { ALL_TYPES, gens } from "@/lib/pkmn";
import { cn } from "@/lib/utils";
import type { PokemonType } from "@/types/pokemon";

interface TeamTypeCoverageProps {
  /** Array of Pokemon, each with their types */
  pokemonTypes: PokemonType[][];
  /** Display mode - compact for previews, full for detailed view */
  mode?: "compact" | "full";
  /** Show offensive coverage analysis */
  showOffensive?: boolean;
  /** Show defensive coverage analysis */
  showDefensive?: boolean;
  className?: string;
}

interface TypeCoverage {
  type: PokemonType;
  /** For defensive: how many Pokemon are weak to this type */
  weakCount: number;
  /** For defensive: how many Pokemon resist this type */
  resistCount: number;
  /** For defensive: how many Pokemon are immune to this type */
  immuneCount: number;
  /** For offensive: true if at least one Pokemon can hit super-effectively */
  hasCoverage: boolean;
  /** For offensive: how many Pokemon types can hit this super-effectively */
  coverageCount: number;
}

function calculateDefensiveCoverage(
  pokemonTypes: PokemonType[][],
): TypeCoverage[] {
  const gen = gens.get(9);
  const coverage: TypeCoverage[] = [];

  for (const typeName of ALL_TYPES) {
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;

    for (const types of pokemonTypes) {
      if (types.length === 0) continue;
      // Calculate how effective this attacking type is against this Pokemon
      // biome-ignore lint/suspicious/noExplicitAny: library typing
      const eff = gen.types.totalEffectiveness(typeName, types as any);

      if (eff > 1) weakCount++;
      else if (eff < 1 && eff > 0) resistCount++;
      else if (eff === 0) immuneCount++;
    }

    coverage.push({
      type: typeName as PokemonType,
      weakCount,
      resistCount,
      immuneCount,
      hasCoverage: false,
      coverageCount: 0,
    });
  }

  return coverage;
}

function calculateOffensiveCoverage(
  pokemonTypes: PokemonType[][],
): TypeCoverage[] {
  const gen = gens.get(9);
  const coverage: TypeCoverage[] = [];

  for (const targetTypeName of ALL_TYPES) {
    let coverageCount = 0;

    // For each Pokemon in the team, check if any of their types hit the target super-effectively
    for (const types of pokemonTypes) {
      for (const attackType of types) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eff = gen.types.totalEffectiveness(
          attackType as any,
          [targetTypeName] as any,
        );
        if (eff > 1) {
          coverageCount++;
          break; // Only count once per Pokemon
        }
      }
    }

    coverage.push({
      type: targetTypeName as PokemonType,
      weakCount: 0,
      resistCount: 0,
      immuneCount: 0,
      hasCoverage: coverageCount > 0,
      coverageCount,
    });
  }

  return coverage;
}

export function TeamTypeCoverage({
  pokemonTypes,
  mode = "full",
  showOffensive = true,
  showDefensive = true,
  className,
}: TeamTypeCoverageProps) {
  const defensiveCoverage = useMemo(
    () => calculateDefensiveCoverage(pokemonTypes),
    [pokemonTypes],
  );

  const offensiveCoverage = useMemo(
    () => calculateOffensiveCoverage(pokemonTypes),
    [pokemonTypes],
  );

  // Calculate summary stats
  const teamSize = pokemonTypes.filter((t) => t.length > 0).length;

  const defensiveWeaknesses = defensiveCoverage.filter(
    (c) => c.weakCount > teamSize / 2,
  );
  const offensiveGaps = offensiveCoverage.filter((c) => !c.hasCoverage);
  const offensiveStrengths = offensiveCoverage.filter((c) => c.hasCoverage);

  if (mode === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        {showDefensive && defensiveWeaknesses.length > 0 && (
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              team weak to
            </span>
            <div className="flex flex-wrap gap-0.5 mt-0.5">
              {defensiveWeaknesses.slice(0, 4).map(({ type }) => (
                <TypeBadge
                  key={type}
                  type={type}
                  size="sm"
                  className="opacity-90"
                />
              ))}
              {defensiveWeaknesses.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{defensiveWeaknesses.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
        {showOffensive && offensiveGaps.length > 0 && (
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              no coverage
            </span>
            <div className="flex flex-wrap gap-0.5 mt-0.5">
              {offensiveGaps.slice(0, 4).map(({ type }) => (
                <TypeBadge
                  key={type}
                  type={type}
                  size="sm"
                  className="opacity-50"
                />
              ))}
              {offensiveGaps.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{offensiveGaps.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showDefensive && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">defensive coverage</h3>
            <span className="text-xs text-muted-foreground">
              {defensiveWeaknesses.length} major weakness
              {defensiveWeaknesses.length !== 1 ? "es" : ""}
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-9 gap-1">
            {defensiveCoverage.map(
              ({ type, weakCount, resistCount, immuneCount }) => {
                const isMajorWeakness = weakCount > teamSize / 2;
                const hasResistance = resistCount + immuneCount > 0;
                const isNeutral = weakCount === 0 && !hasResistance;

                return (
                  <div
                    key={type}
                    className={cn(
                      "relative flex flex-col items-center p-1.5 rounded border",
                      isMajorWeakness &&
                        "border-red-500/50 bg-red-500/10 dark:bg-red-500/20",
                      hasResistance &&
                        !isMajorWeakness &&
                        "border-green-500/50 bg-green-500/10 dark:bg-green-500/20",
                      isNeutral && "border-muted bg-muted/30",
                    )}
                    title={`${type}: ${weakCount} weak, ${resistCount} resist, ${immuneCount} immune`}
                  >
                    <TypeBadge type={type} size="sm" />
                    <div className="flex gap-0.5 mt-1 text-[9px] tabular-nums">
                      {weakCount > 0 && (
                        <span className="text-red-500 dark:text-red-400 font-medium">
                          -{weakCount}
                        </span>
                      )}
                      {(resistCount > 0 || immuneCount > 0) && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          +{resistCount + immuneCount}
                        </span>
                      )}
                      {weakCount === 0 &&
                        resistCount === 0 &&
                        immuneCount === 0 && (
                          <span className="text-muted-foreground">0</span>
                        )}
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <div className="flex gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="size-2 rounded-full bg-red-500/50" />
              <span>major weakness</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="size-2 rounded-full bg-green-500/50" />
              <span>has resistance</span>
            </div>
          </div>
        </div>
      )}

      {showOffensive && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">offensive coverage</h3>
            <span className="text-xs text-muted-foreground">
              {offensiveStrengths.length}/{ALL_TYPES.length} types covered
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-9 gap-1">
            {offensiveCoverage.map(({ type, hasCoverage, coverageCount }) => (
              <div
                key={type}
                className={cn(
                  "relative flex flex-col items-center p-1.5 rounded border",
                  hasCoverage
                    ? "border-green-500/50 bg-green-500/10 dark:bg-green-500/20"
                    : "border-red-500/30 bg-red-500/5 dark:bg-red-500/10",
                )}
                title={
                  hasCoverage
                    ? `${type}: ${coverageCount} Pokemon can hit super-effectively`
                    : `${type}: No super-effective coverage`
                }
              >
                <TypeBadge
                  type={type}
                  size="sm"
                  className={!hasCoverage ? "opacity-50" : ""}
                />
                <div className="mt-1 text-[9px] tabular-nums">
                  {hasCoverage ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {coverageCount}x
                    </span>
                  ) : (
                    <span className="text-red-400 dark:text-red-500">gap</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {offensiveGaps.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="text-red-400">Missing coverage:</span>{" "}
              {offensiveGaps.map((g) => g.type).join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TypeCoverageCompact({
  pokemonTypes,
  className,
}: {
  pokemonTypes: PokemonType[][];
  className?: string;
}) {
  return (
    <TeamTypeCoverage
      pokemonTypes={pokemonTypes}
      mode="compact"
      className={className}
    />
  );
}
