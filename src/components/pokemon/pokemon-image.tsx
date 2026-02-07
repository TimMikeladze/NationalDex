"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PokemonImageProps {
  src: string;
  alt: string;
  pokemonId: number;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Generate fallback sprite URLs for a Pokemon.
 * Tries multiple sources to ensure something always displays.
 */
function getFallbackUrls(name: string, id: number): string[] {
  // Convert name to slug format (lowercase, keep dashes for forms)
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "");

  return [
    // 1. PokemonDB Home sprites (excellent form coverage)
    `https://img.pokemondb.net/sprites/home/normal/${slug}.png`,
    // 2. Pokemon Showdown animated
    `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`,
    // 3. Pokemon Showdown gen5 static
    `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`,
    // 4. PokeAPI official artwork (base Pokemon only)
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    // 5. PokeAPI default sprite (base Pokemon only)
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
  ];
}

/**
 * Pokemon image component with automatic fallback.
 * If a sprite fails to load, tries multiple fallback sources.
 */
export function PokemonImage({
  src,
  alt,
  pokemonId,
  width = 96,
  height = 96,
  className,
  priority = false,
}: PokemonImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const prevSrc = useRef(src);

  // Reset image state when the src prop changes (e.g., navigating between Pokemon)
  useEffect(() => {
    if (src !== prevSrc.current) {
      prevSrc.current = src;
      setImgSrc(src);
      setFallbackIndex(0);
    }
  }, [src]);

  const fallbacks = getFallbackUrls(alt, pokemonId);

  const handleError = () => {
    if (fallbackIndex < fallbacks.length) {
      setImgSrc(fallbacks[fallbackIndex]);
      setFallbackIndex(fallbackIndex + 1);
    }
  };

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={cn("pixelated", className)}
      loading={priority ? undefined : "lazy"}
      priority={priority}
      unoptimized
      onError={handleError}
    />
  );
}
