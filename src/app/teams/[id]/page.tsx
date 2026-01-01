"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, X, Search } from "lucide-react"
import { useTeams } from "@/hooks/use-teams"
import { GENERATION_INFO } from "@/types/team"
import type { TeamMember } from "@/types/team"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getSpriteUrl, getPokemon } from "@/lib/pokeapi"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  const { teams, isLoaded, getTeam, addMember, removeMember, updateTeam } = useTeams()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [isAddingPokemon, setIsAddingPokemon] = useState(false)

  const team = useMemo(() => getTeam(teamId), [getTeam, teamId, teams])

  useEffect(() => {
    if (isLoaded && !team) {
      router.push("/teams")
    }
  }, [isLoaded, team, router])

  useEffect(() => {
    if (team) {
      setEditedName(team.name)
    }
  }, [team])

  if (!isLoaded) {
    return (
      <div className="p-4 md:p-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!team) {
    return null
  }

  const genInfo = GENERATION_INFO[team.generation]
  const [startId, endId] = genInfo.pokemonRange

  // Generate list of available Pokemon IDs for this generation
  const availablePokemonIds: number[] = []
  for (let id = startId; id <= endId; id++) {
    if (!team.members.some((m) => m.id === id)) {
      availablePokemonIds.push(id)
    }
  }

  // Filter Pokemon based on search (by ID)
  const filteredPokemonIds = searchQuery.trim()
    ? availablePokemonIds.filter((id) => id.toString().includes(searchQuery.trim()))
    : availablePokemonIds

  const handleAddPokemon = async (id: number) => {
    if (isAddingPokemon) return
    setIsAddingPokemon(true)

    try {
      const pokemon = await getPokemon(id)
      const member: TeamMember = {
        id: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprite,
      }
      addMember(teamId, member)
      setIsAddOpen(false)
      setSearchQuery("")
    } catch (error) {
      console.error("Failed to fetch Pokemon:", error)
    } finally {
      setIsAddingPokemon(false)
    }
  }

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== team.name) {
      updateTeam(teamId, { name: editedName.trim() })
    }
    setIsEditingName(false)
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        {isEditingName ? (
          <div className="flex gap-2 items-center">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName()
                if (e.key === "Escape") {
                  setEditedName(team.name)
                  setIsEditingName(false)
                }
              }}
              onBlur={handleSaveName}
              autoFocus
              className="text-lg font-medium h-8"
            />
          </div>
        ) : (
          <h1
            className="text-lg font-medium cursor-pointer hover:text-muted-foreground"
            onClick={() => setIsEditingName(true)}
            title="Click to edit name"
          >
            {team.name}
          </h1>
        )}
        <p className="text-xs text-muted-foreground">
          {genInfo.name} ({genInfo.label}) • {team.members.length}/6 pokemon
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {team.members.map((member) => (
          <div
            key={member.id}
            className="relative aspect-square rounded-lg border bg-muted/30 flex flex-col items-center justify-center p-2 group"
          >
            <button
              type="button"
              onClick={() => removeMember(teamId, member.id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 rounded-full p-1"
            >
              <X className="size-3 text-destructive" />
            </button>
            <Link href={`/pokemon/${member.id}`} className="flex flex-col items-center">
              <img
                src={member.sprite}
                alt={member.name}
                className="size-16 sm:size-20 pixelated"
              />
              <span className="text-xs text-center mt-1">{member.name}</span>
              <span className="text-[10px] text-muted-foreground">#{member.id}</span>
            </Link>
          </div>
        ))}

        {team.members.length < 6 && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="aspect-square rounded-lg border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors"
              >
                <Plus className="size-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">add pokemon</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>add pokemon</DialogTitle>
                <DialogDescription>
                  Select a {genInfo.name} pokemon (#{startId}-{endId}) to add to your team
                </DialogDescription>
              </DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[300px] pr-4">
                <div className="grid grid-cols-4 gap-2">
                  {filteredPokemonIds.slice(0, 60).map((id) => (
                    <PokemonPickerButton
                      key={id}
                      id={id}
                      onSelect={handleAddPokemon}
                      disabled={isAddingPokemon}
                    />
                  ))}
                </div>
                {filteredPokemonIds.length > 60 && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Showing first 60 results. Use search to find more.
                  </p>
                )}
                {filteredPokemonIds.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery ? `No pokemon found matching "${searchQuery}"` : "All pokemon from this generation are in your team!"}
                  </p>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 5 - team.members.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square rounded-lg border border-dashed border-muted-foreground/20"
          />
        ))}
      </div>
    </div>
  )
}

function PokemonPickerButton({
  id,
  onSelect,
  disabled
}: {
  id: number
  onSelect: (id: number) => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      disabled={disabled}
      className="flex flex-col items-center p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
    >
      <img
        src={getSpriteUrl(id)}
        alt={`Pokemon #${id}`}
        className="size-10 pixelated"
      />
      <span className="text-[10px] text-muted-foreground">#{id}</span>
    </button>
  )
}
