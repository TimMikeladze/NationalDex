import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/api-session";
import { toID } from "@/lib/pkmn";
import { getSharedList } from "@/lib/server/lists";
import { pokemonSpriteById } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type { ListItem, ListItemType } from "@/types/list";
import { LIST_ITEM_TYPE_COLORS, LIST_ITEM_TYPE_LABELS } from "@/types/list";
import { CloneListButton } from "./clone-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const shared = await getSharedList(slug);
  if (!shared) {
    return { title: "List not found" };
  }
  return {
    title: shared.list.name,
    description: shared.list.description ?? "A shared list on NationalDex.",
  };
}

function getItemLink(item: ListItem): string {
  switch (item.type) {
    case "pokemon":
      return `/pokemon/${toID(item.name)}`;
    case "move":
      return `/moves/${item.id}`;
    case "ability":
      return `/abilities/${item.id}`;
    case "item":
      return `/items/${item.id}`;
    case "type":
      return `/types/${item.id}`;
    case "card":
      return `/cards/${item.id.toLowerCase()}`;
    default:
      return "#";
  }
}

function getItemSprite(item: ListItem): string | null {
  if (item.sprite) return item.sprite;
  if (item.type === "pokemon") {
    const numId = Number.parseInt(item.id, 10);
    if (!Number.isNaN(numId)) {
      return pokemonSpriteById(numId);
    }
  }
  return null;
}

const TYPE_ORDER: ListItemType[] = [
  "pokemon",
  "card",
  "move",
  "ability",
  "item",
  "type",
];

export default async function SharedListPage({ params }: PageProps) {
  const { slug } = await params;
  const [shared, viewerId] = await Promise.all([
    getSharedList(slug),
    getSessionUserId(),
  ]);
  if (!shared) {
    notFound();
  }

  const { list: sharedList, ownerId } = shared;
  const { items } = sharedList;

  const groupedItems: Partial<Record<ListItemType, ListItem[]>> = {};
  for (const item of items) {
    const type = item.type;
    groupedItems[type] ??= [];
    groupedItems[type].push(item);
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">{sharedList.name}</h1>
          {sharedList.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {sharedList.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {items.length} {items.length === 1 ? "item" : "items"} · shared list
          </p>
        </div>
        {/* The owner following their own link gets sent home, not a duplicate. */}
        {viewerId === ownerId ? (
          <Button asChild variant="outline">
            <Link href={`/lists/${sharedList.id}`}>
              Open in your collection
            </Link>
          </Button>
        ) : (
          <CloneListButton slug={slug} />
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">this list is empty</p>
        </div>
      ) : (
        <div className="space-y-6">
          {TYPE_ORDER.map((type) => {
            const typeItems = groupedItems[type];
            if (!typeItems || typeItems.length === 0) return null;

            return (
              <div key={type}>
                <h2
                  className="text-xs font-medium uppercase tracking-wider mb-3"
                  style={{ color: LIST_ITEM_TYPE_COLORS[type] }}
                >
                  {LIST_ITEM_TYPE_LABELS[type]} ({typeItems.length})
                </h2>
                <div className="space-y-1">
                  {[...typeItems]
                    .sort((a, b) => b.addedAt - a.addedAt)
                    .map((item) => {
                      const sprite = getItemSprite(item);
                      return (
                        <Link
                          key={`${item.type}-${item.id}`}
                          href={getItemLink(item)}
                          className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          {sprite ? (
                            <div
                              className={cn(
                                "rounded-md bg-muted flex items-center justify-center shrink-0",
                                item.type === "card" ? "h-12 w-9" : "size-10",
                              )}
                            >
                              {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
                              <img
                                src={sprite}
                                alt={item.name}
                                className={cn(
                                  item.type === "card"
                                    ? "h-12 w-9 rounded-sm object-contain"
                                    : "size-8",
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
                            {item.type === "card" && (
                              <p className="text-[10px] text-muted-foreground">
                                {item.id}
                              </p>
                            )}
                          </div>
                        </Link>
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
