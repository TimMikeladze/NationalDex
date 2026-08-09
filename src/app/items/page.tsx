"use client";

import { Filter, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { GENERATIONS, getAllItems, LATEST_GEN, toID } from "@/lib/pkmn";
import { cn } from "@/lib/utils";
import type { ItemListItem, ItemPocket } from "@/types/pokemon";
import { ITEM_POCKET_COLORS, ITEM_POCKET_LABELS } from "@/types/pokemon";

interface Filters {
  search: string;
  pockets: ItemPocket[];
  generations: string[];
}

const ITEMS_PER_PAGE = 100;

const ALL_ITEM_POCKETS: ItemPocket[] = [
  "medicine",
  "pokeballs",
  "machines",
  "berries",
  "battle",
  "key",
  "mail",
  "misc",
];

// Categorize items based on their name patterns
function categorizeItem(name: string, desc: string): ItemPocket {
  const lowerName = name.toLowerCase();
  const lowerDesc = desc.toLowerCase();

  if (lowerName.includes("berry")) return "berries";
  if (lowerName.includes("ball") && !lowerName.includes("iron"))
    return "pokeballs";
  if (
    lowerName.includes("tm") ||
    lowerName.includes("tr") ||
    lowerName.includes("hm")
  )
    return "machines";
  if (
    lowerName.includes("potion") ||
    lowerName.includes("heal") ||
    lowerName.includes("elixir") ||
    lowerName.includes("ether") ||
    lowerName.includes("revive") ||
    lowerName.includes("antidote") ||
    lowerName.includes("awakening") ||
    lowerName.includes("remedy") ||
    lowerName.includes("restore")
  )
    return "medicine";
  if (
    lowerDesc.includes("raises") ||
    lowerDesc.includes("battle") ||
    lowerDesc.includes("attack") ||
    lowerDesc.includes("defense") ||
    lowerDesc.includes("speed") ||
    lowerName.includes("x ") ||
    lowerName.includes("dire hit")
  )
    return "battle";
  if (lowerName.includes("mail")) return "mail";
  if (
    lowerName.includes("key") ||
    lowerName.includes("ticket") ||
    lowerName.includes("pass") ||
    lowerName.includes("card")
  )
    return "key";

  return "misc";
}

export default function ItemsPage() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    pockets: [],
    generations: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { preferredGeneration } = useGenerationPreference();

  // Items as they exist in the generation being viewed
  const allItems = useMemo(() => {
    return getAllItems(preferredGeneration ?? LATEST_GEN).map((i) => {
      const desc = i.desc || i.shortDesc || "";
      return {
        id: i.num,
        name: i.name,
        sprite: `https://play.pokemonshowdown.com/sprites/itemicons/${toID(i.name)}.png`,
        category: desc.split(".")[0] || "Item",
        pocket: categorizeItem(i.name, desc),
        cost: 0,
        generation: i.gen || 1,
      };
    });
  }, [preferredGeneration]);

  // Apply filters client-side
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!item.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Pocket filter
      if (
        filters.pockets.length > 0 &&
        !filters.pockets.includes(item.pocket)
      ) {
        return false;
      }

      // Generation filter
      if (filters.generations.length > 0) {
        const itemGenId = `generation-${["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"][item.generation - 1]}`;
        if (!filters.generations.includes(itemGenId)) {
          return false;
        }
      }

      return true;
    });
  }, [allItems, filters.search, filters.pockets, filters.generations]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && displayCount < filteredItems.length) {
        setDisplayCount((prev) =>
          Math.min(prev + ITEMS_PER_PAGE, filteredItems.length),
        );
      }
    },
    [displayCount, filteredItems.length],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0,
      rootMargin: "200px",
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  const filtersKey = useMemo(() => {
    return `${filters.search}|${filters.pockets.join(",")}|${filters.generations.join(",")}`;
  }, [filters.search, filters.pockets, filters.generations]);

  // Reset display count when filters change
  useEffect(() => {
    void filtersKey;
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filtersKey]);

  const activeFilterCount = filters.pockets.length + filters.generations.length;

  const togglePocket = (pocket: ItemPocket) => {
    setFilters((prev) => ({
      ...prev,
      pockets: prev.pockets.includes(pocket)
        ? prev.pockets.filter((p) => p !== pocket)
        : [...prev.pockets, pocket],
    }));
  };

  const toggleGeneration = (gen: string) => {
    setFilters((prev) => ({
      ...prev,
      generations: prev.generations.includes(gen)
        ? prev.generations.filter((g) => g !== gen)
        : [...prev.generations, gen],
    }));
  };

  const clearFilters = () => {
    setFilters({ search: "", pockets: [], generations: [] });
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Search & Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors",
              showFilters && "bg-muted",
            )}
          >
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 border rounded-lg space-y-4">
            {/* Pockets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pocket</Label>
                {filters.pockets.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, pockets: [] }))
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {ALL_ITEM_POCKETS.map((pocket) => (
                  <PocketFilterButton
                    key={pocket}
                    pocket={pocket}
                    selected={filters.pockets.includes(pocket)}
                    onClick={() => togglePocket(pocket)}
                  />
                ))}
              </div>
            </div>

            {/* Generation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Generation</Label>
                {filters.generations.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, generations: [] }))
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {GENERATIONS.filter(
                  (gen) => gen.num <= (preferredGeneration ?? LATEST_GEN),
                ).map((gen) => (
                  <button
                    key={gen.id}
                    type="button"
                    onClick={() => toggleGeneration(gen.id)}
                    className={cn(
                      "px-3 py-1 text-xs border rounded-full transition-colors",
                      filters.generations.includes(gen.id)
                        ? "bg-foreground text-background border-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {gen.name}
                  </button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">
          Showing {Math.min(displayCount, filteredItems.length)} of{" "}
          {filteredItems.length} items
        </p>
      </div>

      {/* Items List */}
      <div>
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[40px,1fr,120px] gap-2 px-4 py-2 bg-muted text-xs text-muted-foreground font-medium">
            <span />
            <span>Name</span>
            <span>Category</span>
          </div>

          {/* Rows */}
          {filteredItems.slice(0, displayCount).map((item) => (
            <ItemRow key={item.name} item={item} />
          ))}

          {filteredItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No items found matching your filters
            </div>
          )}
        </div>

        {/* Infinite scroll trigger */}
        {displayCount < filteredItems.length && (
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            <span className="text-xs text-muted-foreground">
              Loading more...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

function PocketFilterButton({
  pocket,
  selected,
  onClick,
}: {
  pocket: ItemPocket;
  selected: boolean;
  onClick: () => void;
}) {
  const color = ITEM_POCKET_COLORS[pocket];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[10px] px-2 py-0.5 uppercase tracking-wider rounded transition-all",
        selected
          ? "ring-2 ring-offset-1 ring-offset-background"
          : "opacity-60 hover:opacity-100",
      )}
      style={{
        backgroundColor: `${color}20`,
        color,
        // @ts-expect-error - CSS custom property for Tailwind ring color
        "--tw-ring-color": color,
      }}
    >
      {ITEM_POCKET_LABELS[pocket]}
    </button>
  );
}

function ItemRow({ item }: { item: ItemListItem }) {
  const slug = toID(item.name);

  return (
    <Link
      href={`/items/${slug}`}
      className="grid grid-cols-[40px,1fr,120px] gap-2 px-4 py-2 text-sm border-t hover:bg-muted/50 transition-colors items-center"
    >
      <div className="size-8 relative">
        {item.sprite ? (
          <Image
            src={item.sprite}
            alt={item.name}
            fill
            className="object-contain pixelated"
            unoptimized
          />
        ) : (
          <div className="size-8 bg-muted rounded" />
        )}
      </div>
      <span className="font-medium truncate">{item.name}</span>
      <span className="text-xs text-muted-foreground truncate">
        {item.category}
      </span>
    </Link>
  );
}
