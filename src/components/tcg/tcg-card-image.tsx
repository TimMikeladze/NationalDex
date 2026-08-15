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
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const prevSrc = useRef(src);

  useEffect(() => {
    if (src !== prevSrc.current) {
      prevSrc.current = src;
      setFailed(false);
      setLoaded(false);
    }
  }, [src]);

  // A cached scan can finish decoding before React attaches `onLoad`, which
  // would leave the card faded out for good.
  useEffect(() => {
    if (imageRef.current?.complete) setLoaded(true);
  }, []);

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
      ref={imageRef}
      src={src}
      alt={alt}
      width={width}
      height={height}
      // Scans come straight from TCGdex at their own pace, so the artwork fades
      // up over whatever plate it sits on instead of snapping in — a screenful
      // of cards arriving one by one reads as loading, not as broken.
      className={cn(
        "aspect-[63/88] w-full object-contain transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
      loading={priority ? undefined : "lazy"}
      priority={priority}
      unoptimized
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
