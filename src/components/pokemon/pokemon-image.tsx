"use client";

import Image from "next/image";
import { useState } from "react";
import { pokemonSpriteById } from "@/lib/sprites";
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
 * Pokemon image component with automatic fallback.
 * If the primary sprite fails to load, falls back to PokeAPI sprites.
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
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      // Fall back to PokeAPI sprite
      setImgSrc(pokemonSpriteById(pokemonId));
      setHasError(true);
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
