"use client"

import { useCallback, useEffect, useState } from "react"
import type { Team, Generation, TeamMember } from "@/types/team"

const STORAGE_KEY = "pokedex-teams"

function generateId(): string {
  return `team-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setTeams(JSON.parse(stored))
      } catch {
        setTeams([])
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teams))
    }
  }, [teams, isLoaded])

  const createTeam = useCallback((name: string, generation: Generation): Team => {
    const now = Date.now()
    const newTeam: Team = {
      id: generateId(),
      name,
      generation,
      members: [],
      createdAt: now,
      updatedAt: now,
    }
    setTeams((prev) => [...prev, newTeam])
    return newTeam
  }, [])

  const updateTeam = useCallback((id: string, updates: Partial<Pick<Team, "name" | "members">>) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === id
          ? { ...team, ...updates, updatedAt: Date.now() }
          : team
      )
    )
  }, [])

  const deleteTeam = useCallback((id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id))
  }, [])

  const getTeam = useCallback(
    (id: string): Team | undefined => teams.find((team) => team.id === id),
    [teams]
  )

  const addMember = useCallback((teamId: string, member: TeamMember) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) return team
        if (team.members.length >= 6) return team
        if (team.members.some((m) => m.id === member.id)) return team
        return {
          ...team,
          members: [...team.members, member],
          updatedAt: Date.now(),
        }
      })
    )
  }, [])

  const removeMember = useCallback((teamId: string, pokemonId: number) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) return team
        return {
          ...team,
          members: team.members.filter((m) => m.id !== pokemonId),
          updatedAt: Date.now(),
        }
      })
    )
  }, [])

  return {
    teams,
    isLoaded,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeam,
    addMember,
    removeMember,
  }
}
