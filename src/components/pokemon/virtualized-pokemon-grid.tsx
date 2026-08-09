"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { pokemonSprite, pokemonSpriteById } from "@/lib/sprites";
import type { PokemonType } from "@/types/pokemon";
import { PokemonCard } from "./pokemon-card";

interface PokemonItem {
  id: number;
  name: string;
  /**
   * When the caller already knows the types, the card renders straight from
   * them instead of firing a query per card — a grid of hundreds of cards
   * would otherwise open hundreds of subscriptions at once.
   */
  types?: PokemonType[];
}

interface VirtualizedPokemonGridProps {
  pokemon: PokemonItem[];
  className?: string;
}

// Breakpoints matching Tailwind's responsive columns
// grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8
function getColumnCount(containerWidth: number): number {
  // These thresholds are based on typical card widths to maintain good aspect ratios
  // Adjusted for container width (not viewport width)
  if (containerWidth >= 1400) return 8;
  if (containerWidth >= 1150) return 6;
  if (containerWidth >= 900) return 5;
  if (containerWidth >= 680) return 4;
  if (containerWidth >= 480) return 3;
  return 2;
}

// Estimate row height based on card content
// Cards have: padding + ID row + image + name + type badges
function getRowHeight(containerWidth: number): number {
  // Larger screens have larger images and padding
  if (containerWidth >= 768) return 195; // md+ breakpoint
  return 165; // mobile
}

// Get gap size based on breakpoint
function getGapSize(containerWidth: number): number {
  if (containerWidth >= 768) return 12; // md:gap-3
  return 8; // gap-2
}

export function VirtualizedPokemonGrid({
  pokemon,
  className,
}: VirtualizedPokemonGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    // Initial measurement
    setContainerWidth(container.clientWidth);

    return () => resizeObserver.disconnect();
  }, []);

  const columnCount = useMemo(
    () => getColumnCount(containerWidth),
    [containerWidth],
  );
  const rowHeight = useMemo(
    () => getRowHeight(containerWidth),
    [containerWidth],
  );
  const gap = useMemo(() => getGapSize(containerWidth), [containerWidth]);

  // Group pokemon into rows
  const rows = useMemo(() => {
    const result: PokemonItem[][] = [];
    for (let i = 0; i < pokemon.length; i += columnCount) {
      result.push(pokemon.slice(i, i + columnCount));
    }
    return result;
  }, [pokemon, columnCount]);

  // Find the scrollable parent (the main element from app-shell)
  const getScrollElement = useCallback(() => {
    return document.querySelector("main") as HTMLElement | null;
  }, []);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement,
    estimateSize: () => rowHeight + gap,
    overscan: 5,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Don't render until we have container width
  if (containerWidth === 0) {
    return (
      <div ref={containerRef} className={className}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {pokemon.slice(0, 16).map((p) => (
            <GridCard key={`${p.id}-${p.name}`} pokemon={p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  gap: `${gap}px`,
                  height: `${rowHeight}px`,
                }}
              >
                {row.map((pokemon) => (
                  <GridCard
                    key={`${pokemon.id}-${pokemon.name}`}
                    pokemon={pokemon}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One grid cell. Uses the data the list already has when it is complete, and
 * only falls back to fetching when the caller passed name/id alone.
 */
function GridCard({ pokemon }: { pokemon: PokemonItem }) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();

  if (!pokemon.types) {
    return <PokemonCard name={pokemon.name} id={pokemon.id} />;
  }

  return (
    <PokemonCard
      pokemon={{
        id: pokemon.id,
        name: pokemon.name,
        sprite:
          pokemonSprite(pokemon.name, { gen: defaultPokemonSpriteGen }) ||
          pokemonSpriteById(pokemon.id),
        types: pokemon.types,
      }}
    />
  );
}
