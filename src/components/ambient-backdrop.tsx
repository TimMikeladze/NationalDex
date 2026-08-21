"use client";

import type { AmbientPalette } from "@/hooks/use-ambient-palette";
import { cn } from "@/lib/utils";

interface AmbientBackdropProps {
  palette: AmbientPalette;
  /**
   * The rectangle the glow occupies, given as insets from its subject.
   * Positioned by the page that owns it, because only that page knows what it
   * is lighting and how much room there is around it. Worth keeping inside the
   * viewport on a phone: the shape is the point, and a rectangle running off
   * both sides of the screen is only ever seen as a band.
   */
  className?: string;
}

/**
 * The colour an item brings with it, thrown on the wall behind it.
 *
 * A rectangle, always. The artwork is rectangular, the sprite sits in a square
 * box, every surface in the app has square corners — an oval of colour behind
 * any of them was the one shape in here disagreeing with all of that. Squared
 * off, it stops reading as a halo stuck to the artwork and starts reading as a
 * lit panel the artwork is mounted on. The geometry lives in `globals.css`:
 * four rectangular fields of colour, one to a quadrant, under a mask that
 * feathers four straight edges rather than dissolving them into an ellipse.
 *
 * It belongs to the artwork, not to the page — it sits around the card or the
 * sprite the way light off a screen falls on the wall behind it, and stops
 * there. A wash spread over the whole width would land on the moves table and
 * the printings list too, which are things to read, not things to light.
 *
 * Two layers, never one: the type colours light the page immediately, the
 * colours read off the artwork cross-fade in over them a moment later. The
 * alternative — waiting for the scan, then snapping the page from grey to
 * red — is the version you notice.
 */
export function AmbientBackdrop({ palette, className }: AmbientBackdropProps) {
  const { base, extracted } = palette;
  if (base.length === 0 && !extracted?.length) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "ambient-backdrop absolute -inset-x-6 -inset-y-8",
        className,
      )}
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

  return (
    <div
      className="ambient-layer"
      data-visible={visible}
      style={{ "--ambient-base": colors[0] } as React.CSSProperties}
    >
      {colors.map((color, index) => (
        <span
          key={`${color}-${index}`}
          style={{ "--ambient-color": color } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
