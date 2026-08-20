"use client";

import { useEffect, useState } from "react";
import {
  extractPalette,
  PALETTE_SAMPLE_WIDTH,
  paletteSourceUrl,
  toAmbientColors,
} from "@/lib/palette";

export interface AmbientPalette {
  /**
   * What we can colour the page with before a single byte of artwork has
   * arrived — the Pokemon's types, the card's energy. Wrong in the details,
   * right in the mood, and there instantly.
   */
  base: string[];
  /** The colours the artwork is actually made of, once they are known. */
  extracted: string[] | null;
}

/**
 * Sampled palettes, kept for the life of the tab. Walking a set with the arrow
 * keys revisits the same cards constantly, and the answer never changes.
 */
const cache = new Map<string, string[]>();
const inFlight = new Map<string, Promise<string[]>>();

/** Enough for the extractor; small enough that sampling costs nothing. */
const SAMPLE_SIZE = PALETTE_SAMPLE_WIDTH;

function loadImage(
  src: string,
  crossOrigin: boolean,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function samplePixels(image: HTMLImageElement): Uint8ClampedArray | null {
  const ratio = image.naturalHeight / (image.naturalWidth || 1);
  const width = Math.max(1, Math.min(SAMPLE_SIZE, image.naturalWidth));
  const height = Math.max(1, Math.round(width * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, width, height);
  try {
    return context.getImageData(0, 0, width, height).data;
  } catch {
    // A cross-origin draw taints the canvas and reading it throws. Nothing to
    // recover here — the caller falls back to the type colours.
    return null;
  }
}

async function samplePalette(src: string): Promise<string[]> {
  // The optimizer copy is same-origin, so the canvas stays readable. If it is
  // unavailable — an export build, a host outside `remotePatterns` — the
  // original is worth one attempt: some CDNs do send the CORS header.
  const attempts: Array<[string, boolean]> = [
    [paletteSourceUrl(src), false],
    [src, true],
  ];

  for (const [url, crossOrigin] of attempts) {
    try {
      const image = await loadImage(url, crossOrigin);
      const pixels = samplePixels(image);
      if (!pixels) continue;
      const colors = toAmbientColors(extractPalette(pixels));
      if (colors.length > 0) return colors;
    } catch {
      // Try the next source.
    }
  }

  return [];
}

function readPalette(src: string): Promise<string[]> {
  const pending = inFlight.get(src);
  if (pending) return pending;

  const promise = samplePalette(src)
    .then((colors) => {
      cache.set(src, colors);
      return colors;
    })
    .finally(() => {
      inFlight.delete(src);
    });

  inFlight.set(src, promise);
  return promise;
}

/**
 * The colours to paint a detail page with: the ones its artwork is made of,
 * with its type colours standing in until they are read.
 *
 * `seed` is a list of raw hex colours (type or energy colours). Both lists come
 * back as `oklch()` and through the same treatment, so the stand-in is as vivid
 * as what replaces it and the cross-fade is a change of hue, not of intensity.
 */
export function useAmbientPalette(
  src: string | null | undefined,
  seed: string[] = [],
): AmbientPalette {
  const [extracted, setExtracted] = useState<string[] | null>(() =>
    src ? (cache.get(src) ?? null) : null,
  );

  useEffect(() => {
    if (!src) {
      setExtracted(null);
      return;
    }

    const cached = cache.get(src);
    if (cached) {
      setExtracted(cached.length > 0 ? cached : null);
      return;
    }

    // Sprites change under the reader — shiny, back, female, a different
    // generation's graphics — so the previous palette stays on screen until
    // the new one is ready rather than dropping back to the type colours.
    let active = true;
    readPalette(src).then((colors) => {
      if (active) setExtracted(colors.length > 0 ? colors : null);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return {
    base: toAmbientColors(seed),
    extracted,
  };
}
