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
 * Two layers, never one: the type colours light the page immediately, the
 * colours read off the artwork cross-fade in over them a moment later. The
 * alternative — waiting for the scan, then snapping the page from grey to
 * red — is the version you notice.
 */
export function AmbientBackdrop({
  palette,
  size = "default",
  className,
}: AmbientBackdropProps) {
  const { base, extracted } = palette;
  if (base.length === 0 && !extracted?.length) return null;

  return (
    <div
      aria-hidden="true"
      data-size={size}
      className={cn("ambient-backdrop", className)}
    >
      <AmbientLayer colors={base} visible={!extracted?.length} />
      <AmbientLayer
        colors={extracted ?? []}
        visible={Boolean(extracted?.length)}
      />
    </div>
  );
}

function AmbientLayer({
  colors,
  visible,
}: {
  colors: string[];
  visible: boolean;
}) {
  if (colors.length === 0) return null;

  const [dominant, accent] = colors;

  return (
    <div
      className="ambient-layer"
      data-visible={visible}
      style={
        {
          "--ambient-dominant": dominant,
          // A sprite with a single colour in it gets its own colour twice,
          // which is a plain wash — correct for something that is one colour.
          "--ambient-accent": accent ?? dominant,
        } as React.CSSProperties
      }
    />
  );
}
