"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TcgImageQuality } from "@/types/tcg";
import { cardImageUrl } from "@/types/tcg";

interface TcgCardImageProps {
  /** Image base URL from the API, without quality or extension. */
  image?: string | null;
  alt: string;
  quality?: TcgImageQuality;
  className?: string;
  /** Rendered width hint for the image loader. */
  width?: number;
  height?: number;
  priority?: boolean;
}

/**
 * A trading card's artwork, at the 63x88mm aspect every card shares. Plenty of
 * cards — promos especially — have no scan, so the placeholder is a normal
 * state rather than an error.
 */
export function TcgCardImage({
  image,
  alt,
  quality = "low",
  className,
  width = 245,
  height = 342,
  priority = false,
}: TcgCardImageProps) {
  const src = cardImageUrl(image, quality);
  const [failed, setFailed] = useState(false);
  const prevSrc = useRef(src);

  useEffect(() => {
    if (src !== prevSrc.current) {
      prevSrc.current = src;
      setFailed(false);
    }
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex aspect-[63/88] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/40 p-2 text-center",
          className,
        )}
      >
        <ImageOff className="size-4 text-muted-foreground" />
        <span className="line-clamp-2 text-[10px] text-muted-foreground">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn(
        "aspect-[63/88] w-full rounded-lg object-contain",
        className,
      )}
      loading={priority ? undefined : "lazy"}
      priority={priority}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
