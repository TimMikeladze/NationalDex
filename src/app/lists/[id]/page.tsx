"use client";

import { Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLists } from "@/hooks/use-lists";
import { pokemonSpriteById } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type { ListItem, ListItemType } from "@/types/list";
import { LIST_ITEM_TYPE_COLORS, LIST_ITEM_TYPE_LABELS } from "@/types/list";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ListDetailPage({ params }: PageProps) {
  const { id: listId } = use(params);
  const router = useRouter();
  const { isLoaded, getList, updateList, removeItem } = useLists();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  const list = useMemo(() => getList(listId), [getList, listId]);

  // Group items by type - must be called before any early returns
  const groupedItems = useMemo(() => {
    if (!list) return {};
    const groups: Partial<Record<ListItemType, ListItem[]>> = {};
    for (const item of list.items) {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      groups[item.type]?.push(item);
    }
    return groups;
  }, [list]);

  useEffect(() => {
    if (isLoaded && !list) {
      router.push("/lists");
    }
  }, [isLoaded, list, router]);

  useEffect(() => {
    if (list) {
      setEditedName(list.name);
      setEditedDescription(list.description || "");
    }
  }, [list]);

  if (!isLoaded) {
    return (
      <div className="p-4 md:p-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!list) {
    return null;
  }

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== list.name) {
      updateList(listId, { name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleSaveDescription = () => {
    const newDesc = editedDescription.trim() || undefined;
    if (newDesc !== list.description) {
      updateList(listId, { description: newDesc });
    }
    setIsEditingDescription(false);
  };

  const getItemLink = (item: ListItem): string => {
    switch (item.type) {
      case "pokemon":
        return `/pokemon/${item.id}`;
      case "move":
        return `/moves/${item.id}`;
      case "ability":
        return `/abilities/${item.id}`;
      case "item":
        return `/items/${item.id}`;
      case "type":
        return `/types/${item.id}`;
      default:
        return "#";
    }
  };

  const getItemSprite = (item: ListItem): string | null => {
    if (item.sprite) return item.sprite;
    if (item.type === "pokemon") {
      const numId = Number.parseInt(item.id, 10);
      if (!Number.isNaN(numId)) {
        return pokemonSpriteById(numId);
      }
    }
    return null;
  };

  const typeOrder: ListItemType[] = [
    "pokemon",
    "move",
    "ability",
    "item",
    "type",
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        {isEditingName ? (
          <div className="flex gap-2 items-center">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setEditedName(list.name);
                  setIsEditingName(false);
                }
              }}
              onBlur={handleSaveName}
              autoFocus
              className="text-lg font-medium h-8"
            />
          </div>
        ) : (
          <h1
            className="text-lg font-medium cursor-pointer hover:text-muted-foreground inline-flex items-center gap-2"
            onClick={() => setIsEditingName(true)}
            title="Click to edit name"
          >
            {list.name}
            <Pencil className="size-3 text-muted-foreground" />
          </h1>
        )}

        {isEditingDescription ? (
          <div className="mt-2">
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditedDescription(list.description || "");
                  setIsEditingDescription(false);
                }
              }}
              onBlur={handleSaveDescription}
              autoFocus
              rows={2}
              placeholder="Add a description..."
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={handleSaveDescription}
            >
              Save
            </Button>
          </div>
        ) : (
          <p
            className="text-xs text-muted-foreground mt-1 cursor-pointer hover:text-foreground"
            onClick={() => setIsEditingDescription(true)}
            title="Click to edit description"
          >
            {list.description || "Click to add description..."}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          {list.items.length} {list.items.length === 1 ? "item" : "items"}
        </p>
      </div>

      {list.items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">this list is empty</p>
          <p className="text-xs text-muted-foreground mt-1">
            add items from pokemon, move, ability, or item pages
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {typeOrder.map((type) => {
            const items = groupedItems[type];
            if (!items || items.length === 0) return null;

            return (
              <div key={type}>
                <h2
                  className="text-xs font-medium uppercase tracking-wider mb-3"
                  style={{ color: LIST_ITEM_TYPE_COLORS[type] }}
                >
                  {LIST_ITEM_TYPE_LABELS[type]} ({items.length})
                </h2>
                <div className="space-y-1">
                  {items
                    .sort((a, b) => b.addedAt - a.addedAt)
                    .map((item) => {
                      const sprite = getItemSprite(item);
                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors group"
                        >
                          <Link
                            href={getItemLink(item)}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            {sprite ? (
                              <div className="size-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                                {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
                                <img
                                  src={sprite}
                                  alt={item.name}
                                  className={cn(
                                    "size-8",
                                    item.type === "pokemon" && "pixelated",
                                  )}
                                />
                              </div>
                            ) : (
                              <div
                                className="size-10 rounded-md flex items-center justify-center shrink-0 text-xs font-medium"
                                style={{
                                  backgroundColor: `${LIST_ITEM_TYPE_COLORS[item.type]}20`,
                                  color: LIST_ITEM_TYPE_COLORS[item.type],
                                }}
                              >
                                {item.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.name}
                              </p>
                              {item.type === "pokemon" && (
                                <p className="text-[10px] text-muted-foreground">
                                  #{item.id.padStart(3, "0")}
                                </p>
                              )}
                            </div>
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(listId, item.type, item.id)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                            title="Remove from list"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
