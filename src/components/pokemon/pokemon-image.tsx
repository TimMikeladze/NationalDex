"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PokemonImageProps {
  src: string;
  alt: string;
  pokemonId: number;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Generate fallback sprite URLs for a Pokemon.
 * Tries multiple sources to ensure something always displays.
 */
function getFallbackUrls(name: string, id: number): string[] {
  // Convert name to slug format (lowercase, no special chars)
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "");

  return [
    // 1. Pokemon Showdown animated (primary - already tried)
    // 2. Pokemon Showdown gen5ani (animated gen5 style)
    `https://play.pokemonshowdown.com/sprites/gen5ani/${slug}.gif`,
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
}: PokemonImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
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
      loading="lazy"
      unoptimized
      onError={handleError}
    />
  );
}
