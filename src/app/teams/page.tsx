"use client";

import {
  ChevronRight,
  Download,
  GitCompareArrows,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TypeCoverageCompact } from "@/components/pokemon/team-type-coverage";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useComparison } from "@/hooks/use-comparison";
import { usePokemon } from "@/hooks/use-pokemon";
import { useTeams } from "@/hooks/use-teams";
import { pokemonSpriteById } from "@/lib/sprites";
import type { PokemonType } from "@/types/pokemon";
import type { Generation, Team, TeamMember } from "@/types/team";
import { GENERATION_INFO, GENERATIONS_LIST } from "@/types/team";

export default function TeamsPage() {
  const { teams, isLoaded, createTeam, deleteTeam } = useTeams();
  const { addToComparison, isInComparison } = useComparison();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamGeneration, setNewTeamGeneration] =
    useState<Generation>("generation-i");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newTeamName.trim()) return;
    const team = createTeam(newTeamName.trim(), newTeamGeneration);
    setNewTeamName("");
    setNewTeamGeneration("generation-i");
    setIsCreateOpen(false);
    router.push(`/teams/${team.id}`);
  };

  const handleCompareTeam = (team: Team) => {
    for (const member of team.members) {
      if (!isInComparison(member.id)) {
        addToComparison(member.id);
      }
    }
    router.push("/comparison");
  };

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => b.updatedAt - a.updatedAt),
    [teams],
  );

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">teams</h1>
          <p className="text-xs text-muted-foreground">
            {teams.length} team{teams.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsImportOpen(true)}
            title="Import team"
          >
            <Upload className="size-4" />
            <span className="hidden sm:inline ml-1">import</span>
          </Button>
          {teams.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExportOpen(true)}
              title="Export teams"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline ml-1">export</span>
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4 mr-1" />
                new team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>create new team</DialogTitle>
                <DialogDescription>
                  Choose a name and generation for your team. Pokemon will be
                  limited to that generation&apos;s range.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="team-name" className="text-sm font-medium">
                    team name
                  </label>
                  <Input
                    id="team-name"
                    placeholder="My Awesome Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="team-generation"
                    className="text-sm font-medium"
                  >
                    generation
                  </label>
                  <Select
                    value={newTeamGeneration}
                    onValueChange={(value) =>
                      setNewTeamGeneration(value as Generation)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENERATIONS_LIST.map((gen) => {
                        const info = GENERATION_INFO[gen];
                        return (
                          <SelectItem key={gen} value={gen}>
                            {info.name} - {info.label} (#{info.pokemonRange[0]}-
                            {info.pokemonRange[1]})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  cancel
                </Button>
                <Button onClick={handleCreate} disabled={!newTeamName.trim()}>
                  create team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Teams List */}
      {!isLoaded ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={`sprite-${j}`} className="size-10 rounded" />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">no teams yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            create a team to start building your dream roster
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4 mr-1" />
            create your first team
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onDelete={() => setConfirmDelete(team.id)}
              onCompare={() => handleCompareTeam(team)}
            />
          ))}
        </div>
      )}

      {/* Import/Export Dialogs */}
      <TeamImportExportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        mode="import"
      />
      <TeamImportExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        mode="export"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDelete !== null}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>delete team?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this team? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) {
                  deleteTeam(confirmDelete);
                  setConfirmDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamCard({
  team,
  onDelete,
  onCompare,
}: {
  team: Team;
  onDelete: () => void;
  onCompare: () => void;
}) {
  const genInfo = GENERATION_INFO[team.generation];

  return (
    <Card className="group hover:bg-muted/30 transition-colors">
      <Link href={`/teams/${team.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Team Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-medium truncate">{team.name}</h2>
              <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-muted-foreground">
              {genInfo.name} • {team.members.length}/6 pokemon
            </p>

            {/* Team member sprites */}
            {team.members.length > 0 && (
              <div className="flex gap-1 mt-3">
                {team.members.map((member) => (
                  <TeamMemberSprite key={member.id} member={member} />
                ))}
                {Array.from({ length: 6 - team.members.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="size-10 rounded-md border border-dashed border-muted-foreground/20"
                  />
                ))}
              </div>
            )}

            {/* Type coverage preview */}
            {team.members.length > 0 && (
              <div className="mt-3">
                <TeamTypeCoveragePreview members={team.members} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {team.members.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCompare();
                }}
                className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Compare team members"
              >
                <GitCompareArrows className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              title="Delete team"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function TeamMemberSprite({ member }: { member: TeamMember }) {
  const { data: pokemon } = usePokemon(member.id);

  return (
    <div
      className="size-10 rounded-md bg-muted flex items-center justify-center relative group/sprite"
      title={member.name}
    >
      {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
      <img
        src={pokemonSpriteById(member.id)}
        alt={member.name}
        className="size-8 pixelated"
      />
      {/* Type indicator on hover */}
      {pokemon && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover/sprite:opacity-100 transition-opacity">
          {pokemon.types.map((type) => (
            <div
              key={type}
              className="size-2 rounded-full"
              style={{
                backgroundColor: getTypeColor(type),
              }}
              title={type}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamTypeCoveragePreview({ members }: { members: TeamMember[] }) {
  // Fetch Pokemon data for all members
  // biome-ignore lint/correctness/useHookAtTopLevel: members array is stable
  const pokemonQueries = members.map((m) => usePokemon(m.id));
  const allLoaded = pokemonQueries.every((q) => q.data);

  if (!allLoaded) {
    return <Skeleton className="h-8 w-32" />;
  }

  const pokemonData = pokemonQueries
    .map((q) => q.data)
    .filter(Boolean) as NonNullable<(typeof pokemonQueries)[0]["data"]>[];

  const pokemonTypes = pokemonData.map((p) => p.types);

  return <TypeCoverageCompact pokemonTypes={pokemonTypes} />;
}

function getTypeColor(type: PokemonType): string {
  const colors: Record<PokemonType, string> = {
    Normal: "#A8A77A",
    Fire: "#EE8130",
    Water: "#6390F0",
    Electric: "#F7D02C",
    Grass: "#7AC74C",
    Ice: "#96D9D6",
    Fighting: "#C22E28",
    Poison: "#A33EA1",
    Ground: "#E2BF65",
    Flying: "#A98FF3",
    Psychic: "#F95587",
    Bug: "#A6B91A",
    Rock: "#B6A136",
    Ghost: "#735797",
    Dragon: "#6F35FC",
    Dark: "#705746",
    Steel: "#B7B7CE",
    Fairy: "#D685AD",
  };
  return colors[type] || "#A8A77A";
}
