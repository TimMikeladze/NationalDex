"use client";

import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Trash2,
  Users,
  X,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComparison } from "@/hooks/use-comparison";
import { calculateTypeEffectiveness, usePokemon } from "@/hooks/use-pokemon";
import { useTeams } from "@/hooks/use-teams";
import { pokemonSpriteById } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type { PokemonStat } from "@/types/pokemon";
import type { TeamMember } from "@/types/team";
import { GENERATION_INFO } from "@/types/team";

type SortOption =
  | "id"
  | "total"
  | "hp"
  | "attack"
  | "defense"
  | "spatk"
  | "spdef"
  | "speed";

export function ComparisonDrawer() {
  const {
    comparison,
    isLoaded,
    removeFromComparison,
    clearComparison,
    panelState,
    expandPanel,
    minimizePanel,
    closePanel,
  } = useComparison();
  const [sortBy, setSortBy] = useState<SortOption>("id");
  const [activeTab, setActiveTab] = useState("cards");

  // Don't render until loaded or if panel is closed
  if (!isLoaded || panelState === "closed" || comparison.length === 0) {
    return null;
  }

  const isExpanded = panelState === "expanded";

  return (
    <div
      className={cn(
        "fixed z-40 transition-all duration-300 ease-in-out",
        // Position: bottom on mobile with padding for nav, full screen on desktop when expanded
        "left-0 right-0",
        isExpanded
          ? "bottom-0 lg:bottom-0 top-0 lg:top-14"
          : "bottom-12 lg:bottom-0",
      )}
    >
      {/* Backdrop when expanded */}
      {isExpanded && (
        <button
          type="button"
          className="absolute inset-0 bg-black/50 lg:hidden cursor-default"
          onClick={minimizePanel}
          aria-label="Close comparison panel"
        />
      )}

      {/* Main Panel */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-0 bg-background border-t shadow-lg transition-all duration-300 ease-in-out",
          isExpanded
            ? "h-full lg:h-[70vh] max-h-[calc(100vh-3rem)] lg:max-h-[70vh] rounded-t-xl"
            : "h-auto",
        )}
      >
        {/* Header - always visible */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive header */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-2 border-b",
            !isExpanded && "cursor-pointer hover:bg-muted/50",
          )}
          onClick={!isExpanded ? expandPanel : undefined}
          onKeyDown={
            !isExpanded ? (e) => e.key === "Enter" && expandPanel() : undefined
          }
          role={!isExpanded ? "button" : undefined}
          tabIndex={!isExpanded ? 0 : undefined}
        >
          <div className="flex items-center gap-3">
            <GitCompareArrows className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              comparing {comparison.length} pokemon
            </span>

            {/* Preview sprites when minimized */}
            {!isExpanded && (
              <div className="flex -space-x-2 ml-2">
                {comparison.slice(0, 4).map((id) => (
                  // biome-ignore lint/performance/noImgElement: external sprite URLs
                  <img
                    key={id}
                    src={pokemonSpriteById(id)}
                    alt=""
                    className="size-8 pixelated rounded-full bg-muted border-2 border-background"
                  />
                ))}
                {comparison.length > 4 && (
                  <span className="size-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{comparison.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isExpanded && (
              <>
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortOption)}
                >
                  <SelectTrigger className="w-[110px] h-7 text-xs">
                    <ArrowUpDown className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">By ID</SelectItem>
                    <SelectItem value="total">By Total</SelectItem>
                    <SelectItem value="hp">By HP</SelectItem>
                    <SelectItem value="attack">By Attack</SelectItem>
                    <SelectItem value="defense">By Defense</SelectItem>
                    <SelectItem value="spatk">By Sp. Atk</SelectItem>
                    <SelectItem value="spdef">By Sp. Def</SelectItem>
                    <SelectItem value="speed">By Speed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearComparison();
                  }}
                  className="h-7 text-xs"
                >
                  <Trash2 className="size-3 mr-1" />
                  clear
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation();
                isExpanded ? minimizePanel() : expandPanel();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation();
                closePanel();
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="flex-1 overflow-hidden h-[calc(100%-3rem)]">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              <div className="px-4 py-2 border-b">
                <TabsList>
                  <TabsTrigger value="cards">cards</TabsTrigger>
                  <TabsTrigger value="table">table</TabsTrigger>
                  <TabsTrigger value="coverage">coverage</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="cards"
                className="flex-1 overflow-auto p-4 m-0"
              >
                <div className="flex gap-4 pb-4 overflow-x-auto">
                  {comparison.map((id) => (
                    <ComparisonCard
                      key={id}
                      pokemonId={id}
                      onRemove={() => removeFromComparison(id)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="table"
                className="flex-1 overflow-auto p-4 m-0"
              >
                <StatsComparisonTable pokemonIds={comparison} />
              </TabsContent>

              <TabsContent
                value="coverage"
                className="flex-1 overflow-auto p-4 m-0"
              >
                <TeamCoverageSection pokemonIds={comparison} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonCard({
  pokemonId,
  onRemove,
}: {
  pokemonId: number;
  onRemove: () => void;
}) {
  const { data: pokemon, isLoading } = usePokemon(pokemonId.toString());
  const { teams, addMember } = useTeams();
  const [showAddToTeam, setShowAddToTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const typeEffectiveness = useMemo(() => {
    if (!pokemon) return null;
    return calculateTypeEffectiveness(pokemon.types);
  }, [pokemon]);

  if (isLoading || !pokemon) {
    return <ComparisonCardSkeleton />;
  }

  const total = pokemon.stats.reduce((sum, s) => sum + s.value, 0);
  const maxStat = Math.max(...pokemon.stats.map((s) => s.value));

  const availableTeams = teams.filter((team) => {
    if (team.members.length >= 6) return false;
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
      <Card className="w-64 flex-shrink-0 p-3 relative">
        <div className="absolute top-2 right-2 flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="size-3" />
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

        <Link href={`/pokemon/${pokemon.id}`} className="block">
          <div className="flex flex-col items-center mb-3">
            <span className="text-[10px] text-muted-foreground tabular-nums">
              #{pokemon.id.toString().padStart(3, "0")}
            </span>
            {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className="size-16 pixelated"
              loading="lazy"
            />
            <h3 className="text-xs font-medium mt-1">{pokemon.name}</h3>
            <div className="flex gap-1 mt-1">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
            </div>
          </div>
        </Link>

        {/* Base Stats */}
        <div className="mb-2">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
            base stats
          </span>
          <div className="space-y-0.5 mt-1">
            {pokemon.stats.map((stat) => (
              <StatRow key={stat.name} stat={stat} maxStat={maxStat} />
            ))}
            <div className="flex justify-between pt-1 border-t text-[10px]">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium tabular-nums">{total}</span>
            </div>
          </div>
        </div>

        {/* Type Effectiveness - compact */}
        {typeEffectiveness && (
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div>
              <span className="text-muted-foreground uppercase tracking-wider">
                weak
              </span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {typeEffectiveness.weaknesses.length > 0 ? (
                  typeEffectiveness.weaknesses
                    .slice(0, 4)
                    .map(({ type, multiplier }) => (
                      <TypeBadge
                        key={type}
                        type={type}
                        multiplier={multiplier}
                        size="sm"
                      />
                    ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
                {typeEffectiveness.weaknesses.length > 4 && (
                  <span className="text-muted-foreground">
                    +{typeEffectiveness.weaknesses.length - 4}
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground uppercase tracking-wider">
                resist
              </span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {typeEffectiveness.resistances.length > 0 ||
                typeEffectiveness.immunities.length > 0 ? (
                  [
                    ...typeEffectiveness.resistances,
                    ...typeEffectiveness.immunities.map((type) => ({
                      type,
                      multiplier: 0,
                    })),
                  ]
                    .slice(0, 4)
                    .map(({ type, multiplier }) => (
                      <TypeBadge
                        key={type}
                        type={type}
                        multiplier={multiplier}
                        size="sm"
                      />
                    ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>
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
                          {genInfo.name} - {team.members.length}/6
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

function StatRow({ stat, maxStat }: { stat: PokemonStat; maxStat: number }) {
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
    <div className="flex items-center gap-1.5 text-[9px]">
      <span
        className={cn(
          "w-10 shrink-0 truncate",
          isHighest ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {stat.name}
      </span>
      <span
        className={cn(
          "w-6 shrink-0 text-right tabular-nums",
          isHighest && "font-medium text-green-600 dark:text-green-400",
        )}
      >
        {stat.value}
      </span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
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

function ComparisonCardSkeleton() {
  return (
    <Card className="w-64 flex-shrink-0 p-3">
      <div className="flex flex-col items-center mb-3">
        <Skeleton className="h-2 w-6" />
        <Skeleton className="size-16 mt-2" />
        <Skeleton className="h-3 w-16 mt-2" />
        <div className="flex gap-1 mt-1">
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`row-skeleton-${i}`} className="h-2 w-full" />
        ))}
      </div>
    </Card>
  );
}

function StatsComparisonTable({ pokemonIds }: { pokemonIds: number[] }) {
  return (
    <Card className="p-4 overflow-x-auto">
      <h2 className="text-sm font-medium mb-4">stats comparison</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 text-muted-foreground font-normal">
              Stat
            </th>
            {pokemonIds.map((id) => (
              <PokemonTableHeader key={id} pokemonId={id} />
            ))}
          </tr>
        </thead>
        <tbody>
          <StatsComparisonRows pokemonIds={pokemonIds} />
        </tbody>
      </table>
    </Card>
  );
}

function PokemonTableHeader({ pokemonId }: { pokemonId: number }) {
  const { data: pokemon } = usePokemon(pokemonId.toString());

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
          className="size-8 pixelated"
        />
        <span className="font-medium text-[10px]">{pokemon.name}</span>
        <div className="flex gap-0.5">
          {pokemon.types.map((type) => (
            <TypeBadge key={type} type={type} size="sm" />
          ))}
        </div>
      </div>
    </th>
  );
}

function StatsComparisonRows({ pokemonIds }: { pokemonIds: number[] }) {
  // biome-ignore lint/correctness/useHookAtTopLevel: pokemonIds array is stable from localStorage state
  const pokemonQueries = pokemonIds.map((id) => usePokemon(id.toString()));
  const allLoaded = pokemonQueries.every((q) => q.data);

  const statNames = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];

  if (!allLoaded) {
    return (
      <>
        {statNames.map((stat) => (
          <tr key={stat} className="border-b last:border-0">
            <td className="py-2 pr-4 text-muted-foreground">{stat}</td>
            {pokemonIds.map((id) => (
              <td key={id} className="text-center py-2 px-2">
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
                  key={pokemon.id}
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
            key={pokemon.id}
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

function TeamCoverageSection({ pokemonIds }: { pokemonIds: number[] }) {
  // biome-ignore lint/correctness/useHookAtTopLevel: pokemonIds array is stable from localStorage state
  const pokemonQueries = pokemonIds.map((id) => usePokemon(id.toString()));
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
        <h2 className="text-sm font-medium">team type coverage</h2>
        <span className="text-xs text-muted-foreground">
          {pokemonData.length} pokemon
        </span>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {pokemonData.map((pokemon) => (
          <div key={pokemon.id} className="flex flex-col items-center shrink-0">
            {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className="size-10 pixelated"
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
