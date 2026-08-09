"use client";

import { ChevronDown, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TeamTypeCoverage } from "@/components/pokemon/team-type-coverage";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { calculateTypeEffectiveness, usePokemon } from "@/hooks/use-pokemon";
import { useTeams } from "@/hooks/use-teams";
import { LATEST_GEN, toID } from "@/lib/pkmn";
import { pokemonSpriteById } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type { PokemonStat, TypeEffectiveness } from "@/types/pokemon";
import type { TeamMember } from "@/types/team";
import { GENERATION_INFO } from "@/types/team";

export type SortOption =
  | "id"
  | "total"
  | "hp"
  | "attack"
  | "defense"
  | "spatk"
  | "spdef"
  | "speed";

/**
 * "compact" is the minimized/expanded comparison drawer (ComparisonDrawer);
 * "full" is the dedicated /comparison page. They show the same data at two
 * different densities, so the shared components below take a variant
 * instead of being duplicated per call site.
 */
export type ComparisonCardVariant = "compact" | "full";

export function ComparisonCard({
  pokemonName,
  variant,
  onRemove,
}: {
  pokemonName: string;
  variant: ComparisonCardVariant;
  onRemove: () => void;
}) {
  const { preferredGeneration } = useGenerationPreference();
  const { data: pokemon, isLoading } = usePokemon(
    pokemonName,
    preferredGeneration,
  );
  const { teams, addMember } = useTeams();
  const [showAddToTeam, setShowAddToTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const typeEffectiveness = useMemo(() => {
    if (!pokemon) return null;
    return calculateTypeEffectiveness(
      pokemon.types,
      preferredGeneration ?? LATEST_GEN,
    );
  }, [pokemon, preferredGeneration]);

  if (isLoading || !pokemon) {
    return <ComparisonCardSkeleton variant={variant} />;
  }

  const compact = variant === "compact";
  const total = pokemon.stats.reduce((sum, s) => sum + s.value, 0);
  const maxStat = Math.max(...pokemon.stats.map((s) => s.value));

  const availableTeams = teams.filter((team) => {
    if (team.members.length >= 6) return false;
    // Keyed on dex id (not name) to match addMember's dedup key in
    // use-teams.ts, which also dedupes by id. Comparing by name here would
    // let a team show as "available" for a form (e.g. Charizard-Mega-X)
    // whose base species (Charizard) is already on the team, only for
    // addMember to silently reject it afterward.
    if (team.members.some((m) => m.id === pokemon.id)) return false;
    return true;
  });

  const handleAddToTeam = () => {
    if (!selectedTeamId) return;
    const member: TeamMember = {
      id: pokemon.id,
      name: pokemon.name,
      sprite: pokemonSpriteById(pokemon.id),
    };
    addMember(selectedTeamId, member);
    setShowAddToTeam(false);
    setSelectedTeamId(null);
  };

  return (
    <>
      <Card
        className={cn(
          "flex-shrink-0 relative",
          compact ? "w-64 p-3" : "w-72 p-4",
        )}
      >
        <div className="absolute top-2 right-2 flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                  compact ? "p-1" : "p-1.5",
                )}
              >
                <ChevronDown className={compact ? "size-3" : "size-4"} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddToTeam(true)}>
                <Users className="size-4 mr-2" />
                Add to team
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemove} className="text-destructive">
                <X className="size-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link href={`/pokemon/${toID(pokemon.name)}`} className="block">
          <div
            className={cn(
              "flex flex-col items-center",
              compact ? "mb-3" : "mb-4",
            )}
          >
            <span
              className={cn(
                "text-muted-foreground tabular-nums",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              #{pokemon.id.toString().padStart(3, "0")}
            </span>
            {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className={cn("pixelated", compact ? "size-16" : "size-24")}
              loading="lazy"
            />
            <h3
              className={cn(
                "font-medium mt-1",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {pokemon.name}
            </h3>
            <div className="flex gap-1 mt-1">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
            </div>
          </div>
        </Link>

        {!compact && (
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="text-center p-2 bg-muted rounded">
              <div className="text-muted-foreground">Height</div>
              <div className="font-medium">
                {(pokemon.height / 10).toFixed(1)}m
              </div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="text-muted-foreground">Weight</div>
              <div className="font-medium">
                {(pokemon.weight / 10).toFixed(1)}kg
              </div>
            </div>
          </div>
        )}

        <div className={compact ? "mb-2" : "mb-3"}>
          <Label variant={variant}>base stats</Label>
          <div className={cn("mt-1", compact ? "space-y-0.5" : "space-y-1")}>
            {pokemon.stats.map((stat) => (
              <StatRow
                key={stat.name}
                stat={stat}
                maxStat={maxStat}
                variant={variant}
              />
            ))}
            <div
              className={cn(
                "flex justify-between pt-1 border-t",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium tabular-nums">{total}</span>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mb-3">
            <Label variant={variant}>abilities</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {pokemon.abilities.map((ability) => (
                <span
                  key={ability.name}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 border rounded",
                    ability.isHidden && "text-muted-foreground border-dashed",
                  )}
                >
                  {ability.name}
                  {ability.isHidden && " (H)"}
                </span>
              ))}
            </div>
          </div>
        )}

        {typeEffectiveness && (
          <TypeEffectivenessGrid
            typeEffectiveness={typeEffectiveness}
            variant={variant}
          />
        )}
      </Card>

      {/* Add to Team Dialog */}
      <Dialog open={showAddToTeam} onOpenChange={setShowAddToTeam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>add {pokemon.name} to team</DialogTitle>
            <DialogDescription>
              Select a team to add this Pokemon to.
            </DialogDescription>
          </DialogHeader>
          {availableTeams.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              <p>No available teams.</p>
              <p className="text-xs mt-1">
                Create a new team or make room in an existing one.
              </p>
              <Link href="/teams">
                <Button variant="outline" size="sm" className="mt-3">
                  <Users className="size-4 mr-2" />
                  Go to Teams
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {availableTeams.map((team) => {
                  const genInfo = GENERATION_INFO[team.generation];
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeamId(team.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                        selectedTeamId === team.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted",
                      )}
                    >
                      <div className="text-left">
                        <div className="font-medium">{team.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {genInfo.name} {compact ? "-" : "•"}{" "}
                          {team.members.length}/6
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 3).map((m) => (
                          // biome-ignore lint/performance/noImgElement: external sprite URLs
                          <img
                            key={m.id}
                            src={pokemonSpriteById(m.id)}
                            alt={m.name}
                            className="size-8 pixelated rounded-full bg-muted border-2 border-background"
                          />
                        ))}
                        {team.members.length > 3 && (
                          <span className="size-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                            +{team.members.length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddToTeam(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddToTeam} disabled={!selectedTeamId}>
                  Add to Team
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Label({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: ComparisonCardVariant;
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground uppercase tracking-wider",
        variant === "compact" ? "text-[9px]" : "text-[10px] block",
      )}
    >
      {children}
    </span>
  );
}

function NoneLabel({ variant }: { variant: ComparisonCardVariant }) {
  return (
    <span
      className={cn(
        "text-muted-foreground",
        variant === "full" && "text-[10px]",
      )}
    >
      None
    </span>
  );
}

function TypeEffectivenessGrid({
  typeEffectiveness,
  variant,
}: {
  typeEffectiveness: TypeEffectiveness;
  variant: ComparisonCardVariant;
}) {
  const compact = variant === "compact";
  const weaknesses = compact
    ? typeEffectiveness.weaknesses.slice(0, 4)
    : typeEffectiveness.weaknesses;
  const resistEntries = [
    ...typeEffectiveness.resistances,
    ...typeEffectiveness.immunities.map((type) => ({ type, multiplier: 0 })),
  ];
  const resists = compact ? resistEntries.slice(0, 4) : resistEntries;

  return (
    <div className={cn("grid grid-cols-2 gap-2", compact && "text-[9px]")}>
      <div>
        <Label variant={variant}>{compact ? "weak" : "weak to"}</Label>
        <div className="flex flex-wrap gap-0.5 mt-0.5">
          {typeEffectiveness.weaknesses.length > 0 ? (
            weaknesses.map(({ type, multiplier }) => (
              <TypeBadge
                key={type}
                type={type}
                multiplier={multiplier}
                size="sm"
              />
            ))
          ) : (
            <NoneLabel variant={variant} />
          )}
          {compact && typeEffectiveness.weaknesses.length > 4 && (
            <span className="text-muted-foreground">
              +{typeEffectiveness.weaknesses.length - 4}
            </span>
          )}
        </div>
      </div>
      <div>
        <Label variant={variant}>{compact ? "resist" : "resists"}</Label>
        <div className="flex flex-wrap gap-0.5 mt-0.5">
          {resistEntries.length > 0 ? (
            resists.map(({ type, multiplier }) => (
              <TypeBadge
                key={type}
                type={type}
                multiplier={multiplier}
                size="sm"
              />
            ))
          ) : (
            <NoneLabel variant={variant} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  stat,
  maxStat,
  variant,
}: {
  stat: PokemonStat;
  maxStat: number;
  variant: ComparisonCardVariant;
}) {
  const compact = variant === "compact";
  const percentage = Math.min((stat.value / 255) * 100, 100);
  const isHighest = stat.value === maxStat;

  const getBarColor = (value: number) => {
    if (value >= 150) return "#22c55e";
    if (value >= 100) return "#84cc16";
    if (value >= 75) return "#eab308";
    if (value >= 50) return "#f97316";
    return "#ef4444";
  };

  return (
    <div
      className={cn(
        "flex items-center",
        compact ? "gap-1.5 text-[9px]" : "gap-2 text-[10px]",
      )}
    >
      <span
        className={cn(
          "shrink-0 truncate",
          compact ? "w-10" : "w-12",
          isHighest ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {stat.name}
      </span>
      <span
        className={cn(
          "shrink-0 text-right tabular-nums",
          compact ? "w-6" : "w-7 whitespace-nowrap",
          isHighest && "font-medium text-green-600 dark:text-green-400",
        )}
      >
        {stat.value}
      </span>
      <div
        className={cn(
          "flex-1 bg-muted rounded-full overflow-hidden",
          compact ? "h-1.5" : "h-2",
        )}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            backgroundColor: getBarColor(stat.value),
          }}
        />
      </div>
    </div>
  );
}

export function ComparisonCardSkeleton({
  variant,
}: {
  variant: ComparisonCardVariant;
}) {
  const compact = variant === "compact";
  return (
    <Card className={cn("flex-shrink-0", compact ? "w-64 p-3" : "w-72 p-4")}>
      <div
        className={cn("flex flex-col items-center", compact ? "mb-3" : "mb-4")}
      >
        <Skeleton className={compact ? "h-2 w-6" : "h-3 w-8"} />
        <Skeleton className={cn("mt-2", compact ? "size-16" : "size-24")} />
        <Skeleton className={cn("mt-2", compact ? "h-3 w-16" : "h-4 w-20")} />
        <div className="flex gap-1 mt-1">
          <Skeleton className={compact ? "h-4 w-10" : "h-4 w-12"} />
        </div>
      </div>
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={`row-skeleton-${i}`}
            className={compact ? "h-2 w-full" : "h-3 w-full"}
          />
        ))}
      </div>
    </Card>
  );
}

export function StatsComparisonTable({
  pokemonNames,
  variant,
}: {
  pokemonNames: string[];
  variant: ComparisonCardVariant;
}) {
  return (
    <Card className="p-4 overflow-x-auto">
      <h2 className="text-sm font-medium mb-4">stats comparison</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 text-muted-foreground font-normal">
              Stat
            </th>
            {pokemonNames.map((name) => (
              <PokemonTableHeader
                key={name}
                pokemonName={name}
                variant={variant}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          <StatsComparisonRows pokemonNames={pokemonNames} />
        </tbody>
      </table>
    </Card>
  );
}

function PokemonTableHeader({
  pokemonName,
  variant,
}: {
  pokemonName: string;
  variant: ComparisonCardVariant;
}) {
  const { preferredGeneration } = useGenerationPreference();
  const { data: pokemon } = usePokemon(pokemonName, preferredGeneration);
  const compact = variant === "compact";

  if (!pokemon) {
    return (
      <th className="text-center py-2 px-2">
        <Skeleton className="h-4 w-16 mx-auto" />
      </th>
    );
  }

  return (
    <th className="text-center py-2 px-2 font-normal">
      <div className="flex flex-col items-center gap-1">
        {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
        <img
          src={pokemon.sprite}
          alt={pokemon.name}
          className={cn("pixelated", compact ? "size-8" : "size-10")}
        />
        <span className={cn("font-medium", compact && "text-[10px]")}>
          {pokemon.name}
        </span>
        <div className="flex gap-0.5">
          {pokemon.types.map((type) => (
            <TypeBadge key={type} type={type} size="sm" />
          ))}
        </div>
      </div>
    </th>
  );
}

function StatsComparisonRows({ pokemonNames }: { pokemonNames: string[] }) {
  const { preferredGeneration } = useGenerationPreference();
  const pokemonQueries = pokemonNames.map(
    // biome-ignore lint/correctness/useHookAtTopLevel: pokemonNames array is stable from localStorage state
    (name) => usePokemon(name, preferredGeneration),
  );
  const allLoaded = pokemonQueries.every((q) => q.data);

  // Gen I reports a single Special stat, so the rows come from the data.
  const statNames = (pokemonQueries[0]?.data?.stats ?? []).map((s) => s.name);

  if (!allLoaded) {
    return (
      <>
        {statNames.map((stat) => (
          <tr key={stat} className="border-b last:border-0">
            <td className="py-2 pr-4 text-muted-foreground">{stat}</td>
            {pokemonNames.map((name) => (
              <td key={name} className="text-center py-2 px-2">
                <Skeleton className="h-4 w-8 mx-auto" />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  const pokemonData = pokemonQueries
    .map((q) => q.data)
    .filter(Boolean) as NonNullable<(typeof pokemonQueries)[0]["data"]>[];

  const getStatExtremes = (statIndex: number) => {
    const values = pokemonData.map((p) => p.stats[statIndex].value);
    return {
      max: Math.max(...values),
      min: Math.min(...values),
    };
  };

  const totals = pokemonData.map((p) =>
    p.stats.reduce((sum, s) => sum + s.value, 0),
  );
  const maxTotalIdx = totals.indexOf(Math.max(...totals));
  const minTotalIdx = totals.indexOf(Math.min(...totals));

  return (
    <>
      {statNames.map((statName, statIndex) => {
        const { max, min } = getStatExtremes(statIndex);
        return (
          <tr key={statName} className="border-b">
            <td className="py-2 pr-4 text-muted-foreground">{statName}</td>
            {pokemonData.map((pokemon) => {
              const value = pokemon.stats[statIndex].value;
              const isMax = value === max && max !== min;
              const isMin = value === min && max !== min;
              return (
                <td
                  key={pokemon.name}
                  className={cn(
                    "text-center py-2 px-2 tabular-nums",
                    isMax && "font-medium text-green-600 dark:text-green-400",
                    isMin && "text-red-500 dark:text-red-400",
                  )}
                >
                  {value}
                </td>
              );
            })}
          </tr>
        );
      })}
      <tr className="border-t-2">
        <td className="py-2 pr-4 font-medium">Total</td>
        {pokemonData.map((pokemon, idx) => (
          <td
            key={pokemon.name}
            className={cn(
              "text-center py-2 px-2 tabular-nums font-medium",
              idx === maxTotalIdx &&
                maxTotalIdx !== minTotalIdx &&
                "text-green-600 dark:text-green-400",
              idx === minTotalIdx &&
                maxTotalIdx !== minTotalIdx &&
                "text-red-500 dark:text-red-400",
            )}
          >
            {totals[idx]}
          </td>
        ))}
      </tr>
    </>
  );
}

export function TeamCoverageSection({
  pokemonNames,
  variant,
}: {
  pokemonNames: string[];
  variant: ComparisonCardVariant;
}) {
  const compact = variant === "compact";
  const { preferredGeneration } = useGenerationPreference();
  const pokemonQueries = pokemonNames.map(
    // biome-ignore lint/correctness/useHookAtTopLevel: pokemonNames array is stable from localStorage state
    (name) => usePokemon(name, preferredGeneration),
  );
  const allLoaded = pokemonQueries.every((q) => q.data);

  if (!allLoaded) {
    return (
      <Card className="p-4">
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  const pokemonData = pokemonQueries
    .map((q) => q.data)
    .filter(Boolean) as NonNullable<(typeof pokemonQueries)[0]["data"]>[];

  const pokemonTypes = pokemonData.map((p) => p.types);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-medium">
          team type coverage{compact ? "" : " analysis"}
        </h2>
        <span className="text-xs text-muted-foreground">
          {pokemonData.length} pokemon
        </span>
      </div>

      <div className={cn("flex gap-2 mb-6", compact && "overflow-x-auto pb-2")}>
        {pokemonData.map((pokemon) => (
          <div
            key={pokemon.name}
            className={cn("flex flex-col items-center", compact && "shrink-0")}
          >
            {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className={cn("pixelated", compact ? "size-10" : "size-12")}
            />
            <div className="flex gap-0.5 mt-1">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <TeamTypeCoverage pokemonTypes={pokemonTypes} />
    </Card>
  );
}
