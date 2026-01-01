"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "pokedex-favorites"

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setFavorites(JSON.parse(stored))
      } catch {
        setFavorites([])
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    }
  }, [favorites, isLoaded])

  const addFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
  }, [])

  const removeFavorite = useCallback((id: number) => {
    setFavorites((prev) => prev.filter((fav) => fav !== id))
  }, [])

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      if (prev.includes(id)) {
        return prev.filter((fav) => fav !== id)
      }
      return [...prev, id]
    })
  }, [])

  const isFavorite = useCallback(
    (id: number) => favorites.includes(id),
    [favorites]
  )

  const clearFavorites = useCallback(() => {
    setFavorites([])
  }, [])

  return {
    favorites,
    isLoaded,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
  }
}
