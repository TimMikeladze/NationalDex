"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TcgImageQuality } from "@/types/tcg";
import { cardImageUrl, formatLocalId } from "@/types/tcg";

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
  /** Printed on the stand-in when a card has no scan. */
  setName?: string;
  localId?: string;
}

/**
 * A trading card's artwork, at the 63x88mm aspect every card shares. Plenty of
 * cards — promos especially — have no scan, so the stand-in is drawn as a card
 * back rather than a broken image: the grid keeps its rhythm and the card still
 * says which one it is.
 */
export function TcgCardImage({
  image,
  alt,
  quality = "low",
  className,
  width = 245,
  height = 342,
  priority = false,
  setName,
  localId,
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
          "flex aspect-[63/88] w-full items-center justify-center bg-muted/50 p-[6%]",
          className,
        )}
      >
        <div className="flex size-full flex-col items-center justify-center gap-1 border border-dashed px-2 text-center">
          {localId && (
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatLocalId(localId)}
            </span>
          )}
          <span className="line-clamp-3 text-[10px] font-medium leading-tight">
            {alt}
          </span>
          {setName && (
            <span className="line-clamp-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              {setName}
            </span>
          )}
          <span className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground/70">
            no scan
          </span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("aspect-[63/88] w-full object-contain", className)}
      loading={priority ? undefined : "lazy"}
      priority={priority}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
