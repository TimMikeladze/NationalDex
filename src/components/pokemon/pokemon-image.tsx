"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { spriteFallbackUrls } from "@/lib/sprites";
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

  const fallbacks = spriteFallbackUrls(alt, pokemonId);

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
