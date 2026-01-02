"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, ListPlus } from "lucide-react"
import { useLists } from "@/hooks/use-lists"
import { LIST_ITEM_TYPE_LABELS, LIST_ITEM_TYPE_COLORS } from "@/types/list"
import type { ListItemType } from "@/types/list"
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
import { Textarea } from "@/components/ui/textarea"

export default function ListsPage() {
  const { lists, isLoaded, createList, deleteList } = useLists()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [newListDescription, setNewListDescription] = useState("")

  const handleCreate = () => {
    if (!newListName.trim()) return
    createList(newListName.trim(), newListDescription.trim() || undefined)
    setNewListName("")
    setNewListDescription("")
    setIsCreateOpen(false)
  }

  // Count items by type for each list
  const getItemTypeCounts = (items: { type: ListItemType }[]) => {
    const counts: Partial<Record<ListItemType, number>> = {}
    for (const item of items) {
      counts[item.type] = (counts[item.type] || 0) + 1
    }
    return counts
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4 mr-1" />
              new list
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>create new list</DialogTitle>
              <DialogDescription>
                Create a list to organize Pokemon, moves, abilities, items, and types.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">list name</label>
                <Input
                  placeholder="My Favorite Pokemon"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) handleCreate()
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">description (optional)</label>
                <Textarea
                  placeholder="A collection of..."
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newListName.trim()}>
                create list
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
      ) : lists.length === 0 ? (
        <div className="py-16 text-center">
          <ListPlus className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">no lists yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            create a list to organize your favorite pokemon, moves, and more
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lists
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((list) => {
              const typeCounts = getItemTypeCounts(list.items)
              return (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-medium truncate">{list.name}</h2>
                      {list.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {list.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {list.items.length} {list.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (confirm("Delete this list?")) {
                          deleteList(list.id)
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {list.items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(Object.entries(typeCounts) as [ListItemType, number][]).map(
                        ([type, count]) => (
                          <span
                            key={type}
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${LIST_ITEM_TYPE_COLORS[type]}20`,
                              color: LIST_ITEM_TYPE_COLORS[type],
                            }}
                          >
                            {count} {LIST_ITEM_TYPE_LABELS[type]}
                          </span>
                        )
                      )}
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
