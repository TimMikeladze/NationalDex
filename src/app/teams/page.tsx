"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Users } from "lucide-react"
import { useTeams } from "@/hooks/use-teams"
import { GENERATION_INFO, GENERATIONS_LIST } from "@/types/team"
import type { Generation } from "@/types/team"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getSpriteUrl } from "@/lib/pokeapi"

export default function TeamsPage() {
  const { teams, isLoaded, createTeam, deleteTeam } = useTeams()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamGeneration, setNewTeamGeneration] = useState<Generation>("generation-i")

  const handleCreate = () => {
    if (!newTeamName.trim()) return
    createTeam(newTeamName.trim(), newTeamGeneration)
    setNewTeamName("")
    setNewTeamGeneration("generation-i")
    setIsCreateOpen(false)
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-end">
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
                Choose a name and generation for your team. Pokemon will be limited to that generation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">team name</label>
                <Input
                  placeholder="My Awesome Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate()
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">generation</label>
                <Select
                  value={newTeamGeneration}
                  onValueChange={(value) => setNewTeamGeneration(value as Generation)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATIONS_LIST.map((gen) => {
                      const info = GENERATION_INFO[gen]
                      return (
                        <SelectItem key={gen} value={gen}>
                          {info.name} - {info.label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newTeamName.trim()}>
                create team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!isLoaded ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">no teams yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            create a team to start building your dream roster
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((team) => {
              const genInfo = GENERATION_INFO[team.generation]
              return (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-medium">{team.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {genInfo.name} • {team.members.length}/6 pokemon
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (confirm("Delete this team?")) {
                          deleteTeam(team.id)
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {team.members.length > 0 && (
                    <div className="flex gap-1 mt-3">
                      {team.members.map((member) => (
                        <div
                          key={member.id}
                          className="size-10 rounded-md bg-muted flex items-center justify-center"
                        >
                          <img
                            src={getSpriteUrl(member.id)}
                            alt={member.name}
                            className="size-8 pixelated"
                          />
                        </div>
                      ))}
                      {Array.from({ length: 6 - team.members.length }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="size-10 rounded-md border border-dashed border-muted-foreground/30"
                        />
                      ))}
                    </div>
                  )}
                </Link>
              )
            })}
        </div>
      )}
    </div>
  )
}
