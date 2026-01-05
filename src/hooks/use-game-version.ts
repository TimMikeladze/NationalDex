"use client"

import { useCallback, useEffect, useState } from "react"
import type { VersionGroup } from "@/lib/pokeapi"

const STORAGE_KEY = "pokedex-game-version"
const DEFAULT_VERSION: VersionGroup = "scarlet-violet"

export function useGameVersion() {
  const [gameVersion, setGameVersionState] = useState<VersionGroup>(DEFAULT_VERSION)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setGameVersionState(JSON.parse(stored))
      } catch {
        setGameVersionState(DEFAULT_VERSION)
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameVersion))
    }
  }, [gameVersion, isLoaded])

  const setGameVersion = useCallback((version: VersionGroup) => {
    setGameVersionState(version)
  }, [])

  return {
    gameVersion,
    setGameVersion,
    isLoaded,
  }
}
