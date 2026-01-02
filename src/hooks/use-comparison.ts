"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "pokedex-comparison"
const MAX_COMPARISON_ITEMS = 6

export function useComparison() {
  const [comparison, setComparison] = useState<number[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setComparison(JSON.parse(stored))
      } catch {
        setComparison([])
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparison))
    }
  }, [comparison, isLoaded])

  const addToComparison = useCallback((id: number) => {
    setComparison((prev) => {
      if (prev.includes(id)) return prev
      if (prev.length >= MAX_COMPARISON_ITEMS) return prev
      return [...prev, id]
    })
  }, [])

  const removeFromComparison = useCallback((id: number) => {
    setComparison((prev) => prev.filter((item) => item !== id))
  }, [])

  const toggleComparison = useCallback((id: number) => {
    setComparison((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      if (prev.length >= MAX_COMPARISON_ITEMS) return prev
      return [...prev, id]
    })
  }, [])

  const isInComparison = useCallback(
    (id: number) => comparison.includes(id),
    [comparison]
  )

  const clearComparison = useCallback(() => {
    setComparison([])
  }, [])

  const canAddMore = comparison.length < MAX_COMPARISON_ITEMS

  return {
    comparison,
    isLoaded,
    addToComparison,
    removeFromComparison,
    toggleComparison,
    isInComparison,
    clearComparison,
    canAddMore,
    maxItems: MAX_COMPARISON_ITEMS,
  }
}
