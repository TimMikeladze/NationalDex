"use client";

import type { AmbientPalette } from "@/hooks/use-ambient-palette";
import { cn } from "@/lib/utils";

interface AmbientBackdropProps {
  palette: AmbientPalette;
  /**
   * How far past its subject the glow reaches. Positioned by the page that
   * owns it, because only that page knows what it is lighting.
   */
  className?: string;
}

/**
 * The colour an item brings with it, thrown on the wall behind it.
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
        "ambient-backdrop absolute -inset-16 md:-inset-24",
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
