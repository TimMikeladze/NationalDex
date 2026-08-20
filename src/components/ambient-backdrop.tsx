"use client";

import type { AmbientPalette } from "@/hooks/use-ambient-palette";
import { cn } from "@/lib/utils";

interface AmbientBackdropProps {
  palette: AmbientPalette;
  /**
   * Where the wash sits and how far it reaches. It is positioned by the page
   * that owns it, because only that page knows how far its own padding goes.
   */
  className?: string;
}

/**
 * The colour an item brings with it, spread out behind the top of its page.
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
        "ambient-backdrop absolute -inset-x-4 -top-4 h-80 md:-inset-x-6 md:-top-6 md:h-96",
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
