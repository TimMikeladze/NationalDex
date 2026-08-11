"use client";

import { Filter, MapPin, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllRegions } from "@/hooks/use-pokemon";
import { cn } from "@/lib/utils";

interface Filters {
  search: string;
  regions: string[];
}

const ITEMS_PER_PAGE = 100;

const REGION_COLORS: Record<string, string> = {
  kanto: "#EF4444",
  johto: "#F59E0B",
  hoenn: "#22C55E",
  sinnoh: "#3B82F6",
  unova: "#8B5CF6",
  kalos: "#EC4899",
  alola: "#F97316",
  galar: "#14B8A6",
  hisui: "#6366F1",
  paldea: "#A855F7",
};

export function LocationsPageClient() {
  const { data: regions, isLoading } = useAllRegions();
  const [filters, setFilters] = useState<Filters>({
    search: "",
    regions: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Flatten all locations from all regions
  const allLocations = useMemo(() => {
    if (!regions) return [];
    return regions.flatMap((region) =>
      region.locations.map((loc) => ({
        ...loc,
        regionDisplayName: region.displayName,
      })),
    );
  }, [regions]);

  // Apply filters
  const filteredLocations = useMemo(() => {
    return allLocations.filter((location) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !location.displayName.toLowerCase().includes(searchLower) &&
          !location.name.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Region filter
      if (
        filters.regions.length > 0 &&
        location.region &&
        !filters.regions.includes(location.region)
      ) {
        return false;
      }

      return true;
    });
  }, [allLocations, filters.search, filters.regions]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && displayCount < filteredLocations.length) {
        setDisplayCount((prev) =>
          Math.min(prev + ITEMS_PER_PAGE, filteredLocations.length),
        );
      }
    },
    [displayCount, filteredLocations.length],
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

  // Reset display count when filters change
  const filtersKey = useMemo(() => {
    return [filters.search, filters.regions.join(",")].join("|");
  }, [filters.search, filters.regions]);

  useEffect(() => {
    void filtersKey;
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filtersKey]);

  const activeFilterCount = filters.regions.length;

  const toggleRegion = (region: string) => {
    setFilters((prev) => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter((r) => r !== region)
        : [...prev.regions, region],
    }));
  };

  const clearFilters = () => {
    setFilters({ search: "", regions: [] });
  };

  if (isLoading) {
    return <LocationsPageSkeleton />;
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Search & Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search locations..."
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
            {/* Regions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Region</Label>
                {filters.regions.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, regions: [] }))
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {regions?.map((region) => (
                  <RegionFilterButton
                    key={region.name}
                    region={region.name}
                    displayName={region.displayName}
                    selected={filters.regions.includes(region.name)}
                    onClick={() => toggleRegion(region.name)}
                  />
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
          Showing {Math.min(displayCount, filteredLocations.length)} of{" "}
          {filteredLocations.length} locations
        </p>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredLocations.slice(0, displayCount).map((location) => (
          <LocationCard
            key={`${location.region}-${location.id}`}
            location={location}
          />
        ))}
      </div>

      {filteredLocations.length === 0 && (
        <div className="py-16 text-center">
          <MapPin
            className="size-12 text-muted-foreground mb-4 mx-auto"
            strokeWidth={1}
          />
          <p className="text-sm text-muted-foreground">
            No locations found matching your filters
          </p>
        </div>
      )}

      {/* Infinite scroll trigger */}
      {displayCount < filteredLocations.length && (
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          <span className="text-xs text-muted-foreground">Loading more...</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

function RegionFilterButton({
  region,
  displayName,
  selected,
  onClick,
}: {
  region: string;
  displayName: string;
  selected: boolean;
  onClick: () => void;
}) {
  const color = REGION_COLORS[region] ?? "#9CA3AF";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-3 py-1 rounded-full transition-all border",
        selected
          ? "ring-2 ring-offset-1 ring-offset-background"
          : "opacity-60 hover:opacity-100",
      )}
      style={{
        backgroundColor: `${color}20`,
        color,
        borderColor: color,
        // @ts-expect-error - CSS custom property for Tailwind ring color
        "--tw-ring-color": color,
      }}
    >
      {displayName}
    </button>
  );
}

function LocationCard({
  location,
}: {
  location: {
    id: number;
    name: string;
    displayName: string;
    region: string | null;
    regionDisplayName: string;
  };
}) {
  const color = location.region
    ? (REGION_COLORS[location.region] ?? "#9CA3AF")
    : "#9CA3AF";

  return (
    <Link
      href={`/locations/${location.name}`}
      className="group flex flex-col p-3 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {location.displayName}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            #{location.id.toString().padStart(3, "0")}
          </p>
        </div>
        <MapPin className="size-4 text-muted-foreground shrink-0" />
      </div>
      {location.region && (
        <div className="mt-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${color}20`,
              color,
            }}
          >
            {location.regionDisplayName}
          </span>
        </div>
      )}
    </Link>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

const SKELETON_KEYS = Array.from({ length: 12 }, (_, i) => `skel-${i}`);

function LocationsPageSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Search */}
      <div className="mb-6">
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
