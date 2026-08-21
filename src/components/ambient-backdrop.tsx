"use client";

import type { AmbientPalette } from "@/hooks/use-ambient-palette";
import { cn } from "@/lib/utils";

interface AmbientBackdropProps {
  palette: AmbientPalette;
  /**
   * How far down the page the colour reaches. `tall` for a page led by a card
   * scan, which stands several times the height of a sprite and would
   * otherwise run out of wash before it ran out of artwork.
   */
  size?: "default" | "tall";
  /** Placement only — the page owns the stacking order it needs. */
  className?: string;
}

/**
 * The colour an item brings with it, poured down the top of its page.
 *
 * The reference is the album page in Spotify: the artwork's own colour fills
 * the full width of the screen from the very top, then falls away down the
 * page until it is gone by the time you reach anything you have to read. No
 * edges. What was here before was a rectangle of colour hung around the
 * artwork, and a rectangle is a thing with a boundary — you saw the boundary
 * first and the colour second, which is backwards. A wash that runs off both
 * sides of the screen has nothing to notice, so what registers is the page
 * being the colour of the Pokemon, which was always the point.
 *
 * One colour carries it, the way one colour carries a sleeve; the artwork's
 * second colour blooms in from a top corner behind it. Not four — four colours
 * split across four corners was the other half of what read as a graphic
 * rather than as light.
 *
 * It stays invisible until `palette.isReady`, then fades in once. The colours
 * belong to the artwork, so there is nothing honest to show before the artwork
 * has loaded, and guessing first means correcting yourself in front of the
 * reader. `useAmbientPalette` also returns an empty palette when the wash is
 * switched off in settings, which lands here as nothing rendered at all.
 */
export function AmbientBackdrop({
  palette,
  size = "default",
  className,
}: AmbientBackdropProps) {
  const { colors, isReady } = palette;
  if (colors.length === 0) return null;

  const [dominant, accent] = colors;

  return (
    <div
      aria-hidden="true"
      data-size={size}
      className={cn("ambient-backdrop", className)}
    >
      <div
        className="ambient-layer"
        data-visible={isReady}
        style={
          {
            "--ambient-dominant": dominant,
            // A sprite with a single colour in it gets its own colour twice,
            // which is a plain wash — correct for something that is one colour.
            "--ambient-accent": accent ?? dominant,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
