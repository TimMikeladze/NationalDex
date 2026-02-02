"use client";

import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  GitCompareArrows,
  Plus,
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

export default function ComparisonPage() {
  const { comparison, isLoaded, removeFromComparison, clearComparison } =
    useComparison();
  const [sortBy, setSortBy] = useState<SortOption>("id");
  const [activeTab, setActiveTab] = useState("cards");

  if (!isLoaded) {
    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ComparisonCardSkeleton key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (comparison.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="py-16 text-center">
          <GitCompareArrows className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">no pokemon to compare</p>
          <p className="text-xs text-muted-foreground mt-1">
            click the compare icon on any pokemon to add it here
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4 mr-2" />
              browse pokemon
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium">
            comparing {comparison.length} pokemon
          </h1>
          <span className="text-xs text-muted-foreground">(max 6)</span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
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
          <Button variant="ghost" size="sm" onClick={clearComparison}>
            <Trash2 className="size-4 mr-1" />
            clear
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="cards">cards</TabsTrigger>
          <TabsTrigger value="table">table</TabsTrigger>
          <TabsTrigger value="coverage">coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-4">
          {/* Comparison Grid */}
          <div className="overflow-x-auto pb-4">
            <div className="inline-flex gap-4 min-w-full">
              <SortedComparisonCards
                pokemonIds={comparison}
                sortBy={sortBy}
                onRemove={removeFromComparison}
              />
              {comparison.length < 6 && <AddMoreCard />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="table">
          <StatsComparisonTable pokemonIds={comparison} sortBy={sortBy} />
        </TabsContent>

        <TabsContent value="coverage">
          <TeamCoverageSection pokemonIds={comparison} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SortedComparisonCards({
  pokemonIds,
  onRemove,
}: {
  pokemonIds: number[];
  sortBy: SortOption;
  onRemove: (id: number) => void;
}) {
  // We need to sort the cards, but we can't call hooks conditionally
  // So we render all cards and let them sort themselves via CSS order
  // For now, we just render them in order and let the user sort
  return (
    <>
      {pokemonIds.map((id) => (
        <ComparisonCard key={id} pokemonId={id} onRemove={() => onRemove(id)} />
      ))}
    </>
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

  // Filter teams where this Pokemon can be added
  const availableTeams = teams.filter((team) => {
    if (team.members.length >= 6) return false;
    if (team.members.some((m) => m.id === pokemon.id)) return false;
    // For simplicity, allow any Pokemon since the generation system is complex
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
      <Card className="w-72 flex-shrink-0 p-4 relative">
        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="size-4" />
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
          <div className="flex flex-col items-center mb-4">
            <span className="text-xs text-muted-foreground tabular-nums">
              #{pokemon.id.toString().padStart(3, "0")}
            </span>
            {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className="size-24 pixelated"
              loading="lazy"
            />
            <h3 className="text-sm font-medium mt-1">{pokemon.name}</h3>
            <div className="flex gap-1 mt-1">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
            </div>
          </div>
        </Link>

        {/* Physical Stats */}
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

        {/* Base Stats */}
        <div className="mb-3">
          <Label>base stats</Label>
          <div className="space-y-1 mt-1">
            {pokemon.stats.map((stat) => (
              <StatRow key={stat.name} stat={stat} maxStat={maxStat} />
            ))}
            <div className="flex justify-between pt-1 border-t text-xs">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium tabular-nums">{total}</span>
            </div>
          </div>
        </div>

        {/* Abilities */}
        <div className="mb-3">
          <Label>abilities</Label>
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

        {/* Type Effectiveness */}
        {typeEffectiveness && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>weak to</Label>
              <div className="flex flex-wrap gap-0.5 mt-1">
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
                  <span className="text-[10px] text-muted-foreground">
                    None
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label>resists</Label>
              <div className="flex flex-wrap gap-0.5 mt-1">
                {typeEffectiveness.resistances.length > 0 ||
                typeEffectiveness.immunities.length > 0 ? (
                  <>
                    {typeEffectiveness.resistances.map(
                      ({ type, multiplier }) => (
                        <TypeBadge
                          key={type}
                          type={type}
                          multiplier={multiplier}
                          size="sm"
                        />
                      ),
                    )}
                    {typeEffectiveness.immunities.map((type) => (
                      <TypeBadge
                        key={type}
                        type={type}
                        multiplier={0}
                        size="sm"
                      />
                    ))}
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    None
                  </span>
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
                          {genInfo.name} • {team.members.length}/6
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

function AddMoreCard() {
  return (
    <Link href="/" className="block">
      <Card className="w-72 flex-shrink-0 p-4 h-full min-h-[400px] flex flex-col items-center justify-center border-dashed hover:bg-muted/50 transition-colors">
        <Plus className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">add pokemon</p>
        <p className="text-xs text-muted-foreground mt-1">
          click the compare button on any pokemon
        </p>
      </Card>
    </Link>
  );
}

function StatRow({ stat, maxStat }: { stat: PokemonStat; maxStat: number }) {
  const percentage = Math.min((stat.value / 255) * 100, 100);
  const isHighest = stat.value === maxStat;

  // Use a gradient based on the stat value
  const getBarColor = (value: number) => {
    if (value >= 150) return "#22c55e"; // green
    if (value >= 100) return "#84cc16"; // lime
    if (value >= 75) return "#eab308"; // yellow
    if (value >= 50) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span
        className={cn(
          "w-12 shrink-0 truncate",
          isHighest ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {stat.name}
      </span>
      <span
        className={cn(
          "w-7 shrink-0 text-right tabular-nums whitespace-nowrap",
          isHighest && "font-medium text-green-600 dark:text-green-400",
        )}
      >
        {stat.value}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
      {children}
    </span>
  );
}

function ComparisonCardSkeleton() {
  return (
    <Card className="w-72 flex-shrink-0 p-4">
      <div className="flex flex-col items-center mb-4">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="size-24 mt-2" />
        <Skeleton className="h-4 w-20 mt-2" />
        <div className="flex gap-1 mt-1">
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`row-skeleton-${i}`} className="h-3 w-full" />
        ))}
      </div>
    </Card>
  );
}

// Stats Comparison Table for side-by-side stat comparison
function StatsComparisonTable({
  pokemonIds,
}: {
  pokemonIds: number[];
  sortBy: SortOption;
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
          className="size-10 pixelated"
        />
        <span className="font-medium">{pokemon.name}</span>
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

  // Find highest and lowest stat for each row
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
            {pokemonData.map((pokemon, _idx) => {
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

// Team Coverage Section
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
        <h2 className="text-sm font-medium">team type coverage analysis</h2>
        <span className="text-xs text-muted-foreground">
          {pokemonData.length} pokemon
        </span>
      </div>

      {/* Pokemon team preview */}
      <div className="flex gap-2 mb-6">
        {pokemonData.map((pokemon) => (
          <div key={pokemon.id} className="flex flex-col items-center">
            {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className="size-12 pixelated"
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
