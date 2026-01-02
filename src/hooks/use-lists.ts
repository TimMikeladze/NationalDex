"use client"

import { useCallback, useEffect, useState } from "react"
import type { List, ListItem, ListItemType } from "@/types/list"

const STORAGE_KEY = "pokedex-lists"

function generateId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useLists() {
  const [lists, setLists] = useState<List[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setLists(JSON.parse(stored))
      } catch {
        setLists([])
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
    }
  }, [lists, isLoaded])

  const createList = useCallback((name: string, description?: string): List => {
    const now = Date.now()
    const newList: List = {
      id: generateId(),
      name,
      description,
      items: [],
      createdAt: now,
      updatedAt: now,
    }
    setLists((prev) => [...prev, newList])
    return newList
  }, [])

  const updateList = useCallback(
    (id: string, updates: Partial<Pick<List, "name" | "description">>) => {
      setLists((prev) =>
        prev.map((list) =>
          list.id === id ? { ...list, ...updates, updatedAt: Date.now() } : list
        )
      )
    },
    []
  )

  const deleteList = useCallback((id: string) => {
    setLists((prev) => prev.filter((list) => list.id !== id))
  }, [])

  const getList = useCallback(
    (id: string): List | undefined => lists.find((list) => list.id === id),
    [lists]
  )

  const addItem = useCallback(
    (
      listId: string,
      item: { type: ListItemType; id: string; name: string; sprite?: string | null }
    ) => {
      setLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list
          // Check if item already exists in the list
          if (list.items.some((i) => i.type === item.type && i.id === item.id)) {
            return list
          }
          const newItem: ListItem = {
            ...item,
            addedAt: Date.now(),
          }
          return {
            ...list,
            items: [...list.items, newItem],
            updatedAt: Date.now(),
          }
        })
      )
    },
    []
  )

  const removeItem = useCallback(
    (listId: string, itemType: ListItemType, itemId: string) => {
      setLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list
          return {
            ...list,
            items: list.items.filter(
              (item) => !(item.type === itemType && item.id === itemId)
            ),
            updatedAt: Date.now(),
          }
        })
      )
    },
    []
  )

  const isInList = useCallback(
    (listId: string, itemType: ListItemType, itemId: string): boolean => {
      const list = lists.find((l) => l.id === listId)
      if (!list) return false
      return list.items.some((item) => item.type === itemType && item.id === itemId)
    },
    [lists]
  )

  const getListsContainingItem = useCallback(
    (itemType: ListItemType, itemId: string): List[] => {
      return lists.filter((list) =>
        list.items.some((item) => item.type === itemType && item.id === itemId)
      )
    },
    [lists]
  )

  return {
    lists,
    isLoaded,
    createList,
    updateList,
    deleteList,
    getList,
    addItem,
    removeItem,
    isInList,
    getListsContainingItem,
  }
}
