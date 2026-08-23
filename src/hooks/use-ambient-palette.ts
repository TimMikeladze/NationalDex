"use client";

import { useEffect, useState } from "react";
import { useAmbientPreference } from "@/hooks/use-ambient-preference";
import {
  extractPalette,
  PALETTE_SAMPLE_WIDTH,
  paletteSourceUrl,
  toAmbientColors,
} from "@/lib/palette";

export interface AmbientPalette {
  /**
   * What to paint the page with: the colours the artwork is made of, or the
   * type colours when the artwork could not be read at all.
   */
  colors: string[];
  /**
   * False until the artwork has been read — or has failed to be read. Nothing
   * paints before this.
   *
   * The page used to light up in its type colours the instant it rendered and
   * then swap to the artwork's a moment later, which is a flash of the wrong
   * colour on every single page load. Waiting costs the fraction of a second
   * the sprite takes to arrive and buys a page that is only ever one colour.
   */
  isReady: boolean;
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
 * The colours to paint a detail page with, once the artwork they come from has
 * loaded — see `AmbientPalette.isReady`.
 *
 * `seed` is a list of raw hex colours (type or energy colours), used only when
 * the artwork cannot be read: an export build, a host outside `remotePatterns`,
 * a canvas the browser refuses to hand back. It goes through the same treatment
 * as an extracted palette, so the fallback is as vivid as the thing it stands
 * in for.
 */
export function useAmbientPalette(
  src: string | null | undefined,
  seed: string[] = [],
): AmbientPalette {
  const { ambientEnabled } = useAmbientPreference();

  const [extracted, setExtracted] = useState<string[] | null>(() =>
    src ? (cache.get(src) ?? null) : null,
  );
  // A palette already in the cache — the same card walked back to, a sprite
  // toggled and toggled back — is ready on the first frame, with no fade.
  const [isSettled, setIsSettled] = useState(() =>
    src ? cache.has(src) : true,
  );

  useEffect(() => {
    // Nothing is sampled while the wash is switched off. The work is an image
    // decode and a canvas read per sprite, and there is nothing to spend it on.
    if (!ambientEnabled) return;

    if (!src) {
      setExtracted(null);
      setIsSettled(true);
      return;
    }

    const cached = cache.get(src);
    if (cached) {
      setExtracted(cached.length > 0 ? cached : null);
      setIsSettled(true);
      return;
    }

    // Sprites change under the reader — shiny, back, female, a different
    // generation's graphics. `isSettled` is deliberately not cleared here: the
    // palette on screen stays until its replacement is read, rather than the
    // page dropping to nothing and lighting up again.
    let active = true;
    readPalette(src).then((colors) => {
      if (!active) return;
      setExtracted(colors.length > 0 ? colors : null);
      setIsSettled(true);
    });
    return () => {
      active = false;
    };
  }, [src, ambientEnabled]);

  // Switched off is not "no colours yet" — it is no colours, ever, which lands
  // in `AmbientBackdrop` as nothing rendered.
  if (!ambientEnabled) return { colors: [], isReady: false };

  return {
    colors: extracted ?? toAmbientColors(seed),
    isReady: isSettled,
  };
}
