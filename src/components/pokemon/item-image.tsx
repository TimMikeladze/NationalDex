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
 * Item image component with fallback to a generic icon.
 * If the sprite fails to load, shows a package icon placeholder.
 */
export function ItemImage({
  src,
  alt,
  width = 32,
  height = 32,
  className,
}: ItemImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
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
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("pixelated", className)}
      loading="lazy"
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}
