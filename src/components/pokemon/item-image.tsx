"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ItemImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Generate fallback sprite URLs for an item.
 * Tries multiple sources to ensure something displays.
 */
function getItemFallbackUrls(name: string): string[] {
  // Convert name to slug formats for different sources
  const showdownSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const pokeapiSlug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return [
    // 1. Pokemon Showdown itemicons
    `https://play.pokemonshowdown.com/sprites/itemicons/${showdownSlug}.png`,
    // 2. PokeAPI item sprites
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${pokeapiSlug}.png`,
    // 3. Alternative PokeAPI format (with dashes)
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${showdownSlug}.png`,
  ];
}

/**
 * Item image component with automatic fallback.
 * If a sprite fails to load, tries multiple fallback sources,
 * then shows a package icon placeholder.
 */
export function ItemImage({
  src,
  alt,
  width = 32,
  height = 32,
  className,
}: ItemImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const fallbacks = getItemFallbackUrls(alt);

  const handleError = () => {
    if (fallbackIndex < fallbacks.length) {
      setImgSrc(fallbacks[fallbackIndex]);
      setFallbackIndex(fallbackIndex + 1);
    } else {
      setExhausted(true);
    }
  };

  // All fallbacks exhausted, show placeholder
  if (exhausted) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded",
          className,
        )}
        style={{ width, height }}
      >
        <Package className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={cn("pixelated", className)}
      loading="lazy"
      onError={handleError}
    />
  );
}
