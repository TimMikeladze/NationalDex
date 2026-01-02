"use client"

import { useState } from "react"
import { ListPlus, Plus, Check } from "lucide-react"
import { useLists } from "@/hooks/use-lists"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface AddToListDialogProps {
  itemType: ListItemType
  itemId: string
  itemName: string
  itemSprite?: string | null
  trigger?: React.ReactNode
}

export function AddToListDialog({
  itemType,
  itemId,
  itemName,
  itemSprite,
  trigger,
}: AddToListDialogProps) {
  const { lists, isLoaded, createList, addItem, removeItem, isInList } = useLists()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newListName, setNewListName] = useState("")

  const handleCreateList = () => {
    if (!newListName.trim()) return
    const newList = createList(newListName.trim())
    addItem(newList.id, { type: itemType, id: itemId, name: itemName, sprite: itemSprite })
    setNewListName("")
    setIsCreating(false)
  }

  const handleToggleList = (listId: string) => {
    if (isInList(listId, itemType, itemId)) {
      removeItem(listId, itemType, itemId)
    } else {
      addItem(listId, { type: itemType, id: itemId, name: itemName, sprite: itemSprite })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Add to list"
          >
            <ListPlus className="size-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>add to list</DialogTitle>
          <DialogDescription>
            Add {itemName} to one or more lists
          </DialogDescription>
        </DialogHeader>

        {!isLoaded ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {lists.length > 0 && (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {lists
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((list) => {
                      const inList = isInList(list.id, itemType, itemId)
                      return (
                        <button
                          key={list.id}
                          type="button"
                          onClick={() => handleToggleList(list.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                            inList
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <span className="truncate">{list.name}</span>
                          {inList && <Check className="size-4 shrink-0 ml-2" />}
                        </button>
                      )
                    })}
                </div>
              </ScrollArea>
            )}

            {isCreating ? (
              <div className="flex gap-2">
                <Input
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateList()
                    if (e.key === "Escape") {
                      setNewListName("")
                      setIsCreating(false)
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateList} disabled={!newListName.trim()}>
                  Add
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="size-4 mr-1" />
                new list
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
