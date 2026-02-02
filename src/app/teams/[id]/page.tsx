"use client";

import { ArrowLeft, GitCompareArrows, Plus, Share2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PokemonPickerResult } from "@/components/pokemon/pokemon-picker";
import { PokemonPicker } from "@/components/pokemon/pokemon-picker";
import { TeamTypeCoverage } from "@/components/pokemon/team-type-coverage";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { TeamImportExportDialog } from "@/components/team-import-export-dialog";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComparison } from "@/hooks/use-comparison";
import { usePokemon } from "@/hooks/use-pokemon";
import { useTeams } from "@/hooks/use-teams";
import { pokemonSpriteById } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types/team";
import { GENERATION_INFO } from "@/types/team";

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  const { isLoaded, getTeam, addMember, removeMember, updateTeam } = useTeams();
  const { addToComparison, isInComparison } = useComparison();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [activeTab, setActiveTab] = useState("team");
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const team = useMemo(() => getTeam(teamId), [getTeam, teamId]);

  useEffect(() => {
    if (isLoaded && !team) {
      router.push("/teams");
    }
  }, [isLoaded, team, router]);

  useEffect(() => {
    if (team) {
      setEditedName(team.name);
    }
  }, [team]);

  const handleAddPokemon = useCallback(
    (pokemon: PokemonPickerResult) => {
      const member: TeamMember = {
        id: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprite,
      };
      addMember(teamId, member);
      setIsAddOpen(false);
    },
    [addMember, teamId],
  );

  const handleSaveName = useCallback(() => {
    if (team && editedName.trim() && editedName !== team.name) {
      updateTeam(teamId, { name: editedName.trim() });
    }
    setIsEditingName(false);
  }, [team, editedName, updateTeam, teamId]);

  const handleCompareTeam = useCallback(() => {
    if (!team) return;
    for (const member of team.members) {
      if (!isInComparison(member.id)) {
        addToComparison(member.id);
      }
    }
    router.push("/comparison");
  }, [team, addToComparison, isInComparison, router]);

  if (!isLoaded) {
    return (
      <div className="p-4 md:p-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }, (_, i) => `team-skeleton-${i}`).map(
            (key) => (
              <div
                key={key}
                className="aspect-square rounded-lg bg-muted animate-pulse"
              />
            ),
          )}
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const genInfo = GENERATION_INFO[team.generation];
  const [startId, endId] = genInfo.pokemonRange;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link
              href="/teams"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="size-3" />
              back to teams
            </Link>
            {isEditingName ? (
              <div className="flex gap-2 items-center max-w-xs">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setEditedName(team.name);
                      setIsEditingName(false);
                    }
                  }}
                  onBlur={handleSaveName}
                  autoFocus
                  className="text-lg font-medium h-9"
                />
              </div>
            ) : (
              <button
                type="button"
                className="text-lg font-medium hover:text-muted-foreground text-left block"
                onClick={() => setIsEditingName(true)}
                title="Click to edit name"
              >
                {team.name}
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              {genInfo.name} ({genInfo.label}) • {team.members.length}/6 pokemon
            </p>
          </div>
          <div className="flex gap-2">
            {team.members.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCompareTeam}
                title="Compare team members"
              >
                <GitCompareArrows className="size-4" />
                <span className="hidden sm:inline ml-1">compare</span>
              </Button>
            )}
            {team.members.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExportOpen(true)}
                title="Export team"
              >
                <Share2 className="size-4" />
                <span className="hidden sm:inline ml-1">export</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="team">team</TabsTrigger>
          <TabsTrigger value="coverage" disabled={team.members.length === 0}>
            coverage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          {/* Team Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {team.members.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onRemove={() => setConfirmRemove(member.id)}
              />
            ))}

            {team.members.length < 6 && (
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors"
              >
                <Plus className="size-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">
                  add pokemon
                </span>
              </button>
            )}

            {/* Empty slots */}
            {Array.from(
              { length: Math.max(0, 5 - team.members.length) },
              (_, i) => `empty-${teamId}-${team.members.length}-${i}`,
            ).map((key) => (
              <div
                key={key}
                className="aspect-square rounded-lg border border-dashed border-muted-foreground/20"
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coverage">
          <TeamCoverageTab teamId={teamId} />
        </TabsContent>
      </Tabs>

      {/* Pokemon Picker Dialog */}
      <PokemonPicker
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSelect={handleAddPokemon}
        excludeIds={team.members.map((m) => m.id)}
        idRange={[startId, endId]}
        title="add pokemon"
        description={`Select a ${genInfo.name} pokemon (#${startId}-${endId}) to add to your team`}
      />

      {/* Export Dialog */}
      <TeamImportExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        mode="export"
        teamId={teamId}
      />

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={confirmRemove !== null}
        onOpenChange={() => setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>remove pokemon?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this Pokemon from your team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemove !== null) {
                  removeMember(teamId, confirmRemove);
                  setConfirmRemove(null);
                }
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamMemberCard({
  member,
  onRemove,
}: {
  member: TeamMember;
  onRemove: () => void;
}) {
  const { data: pokemon } = usePokemon(member.id);
  const { addToComparison, isInComparison, removeFromComparison } =
    useComparison();

  const inComparison = isInComparison(member.id);

  const handleToggleComparison = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inComparison) {
      removeFromComparison(member.id);
    } else {
      addToComparison(member.id);
    }
  };

  return (
    <Card className="relative group overflow-hidden">
      <Link href={`/pokemon/${member.id}`} className="block p-4">
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground tabular-nums">
            #{member.id.toString().padStart(3, "0")}
          </span>
          <Image
            src={pokemonSpriteById(member.id)}
            alt={member.name}
            width={80}
            height={80}
            className="size-20 pixelated"
            unoptimized
          />
          <span className="text-sm font-medium mt-1">{member.name}</span>
          {pokemon && (
            <div className="flex gap-0.5 mt-1">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleToggleComparison}
          className={cn(
            "p-1.5 rounded-full transition-colors",
            inComparison
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
          title={inComparison ? "Remove from comparison" : "Add to comparison"}
        >
          <GitCompareArrows className="size-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 rounded-full bg-background/80 hover:bg-destructive/10 transition-colors"
          title="Remove from team"
        >
          <X className="size-3 text-destructive" />
        </button>
      </div>
    </Card>
  );
}

function TeamCoverageTab({ teamId }: { teamId: string }) {
  const { getTeam } = useTeams();
  const team = useMemo(() => getTeam(teamId), [getTeam, teamId]);

  if (!team || team.members.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Add Pokemon to your team to see type coverage analysis
        </p>
      </Card>
    );
  }

  return <TeamCoverageContent members={team.members} />;
}

function TeamCoverageContent({ members }: { members: TeamMember[] }) {
  // Fetch Pokemon data for all members
  // biome-ignore lint/correctness/useHookAtTopLevel: members array is stable
  const pokemonQueries = members.map((m) => usePokemon(m.id));
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
          {members.length} pokemon
        </span>
      </div>

      {/* Team preview */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {pokemonData.map((pokemon) => (
          <div key={pokemon.id} className="flex flex-col items-center">
            {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className="size-12 pixelated"
            />
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {pokemon.name}
            </span>
            <div className="flex gap-0.5 mt-0.5">
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
