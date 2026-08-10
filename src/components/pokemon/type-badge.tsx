"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PokemonType } from "@/types/pokemon";
import { TYPE_COLORS, TYPE_TEXT_COLORS } from "@/types/pokemon";

export interface TypeBadgeProps {
  type: PokemonType;
  multiplier?: number;
  size?: "sm" | "default" | "lg";
  linkable?: boolean;
  className?: string;
}

export function TypeBadge({
  type,
  multiplier,
  size = "default",
  linkable = false,
  className,
}: TypeBadgeProps) {
  const bgColor = TYPE_COLORS[type];

  const multiplierLabel =
    multiplier !== undefined
      ? multiplier === 0
        ? "×0"
        : `×${multiplier}`
      : null;

  // The readable text colour differs per theme. Picking it in JS meant the
  // server and the client disagreed on first paint, so both colours ship as
  // custom properties and CSS chooses.
  const badgeClasses = cn(
    "inline-flex items-center gap-1 uppercase tracking-wider rounded font-medium",
    "text-(--type-fg) dark:text-(--type-fg-dark)",
    size === "sm" && "text-[10px] px-1.5 py-0.5",
    size === "default" && "text-xs px-2 py-0.5",
    size === "lg" && "text-sm px-2.5 py-1",
    linkable && "hover:opacity-80 transition-opacity",
    className,
  );

  const badgeStyle = {
    backgroundColor: `${bgColor}20`,
    "--type-fg": TYPE_TEXT_COLORS[type],
    "--type-fg-dark": bgColor,
  } as React.CSSProperties;

  const content = (
    <>
      {type}
      {multiplierLabel && <span className="opacity-75">{multiplierLabel}</span>}
    </>
  );

  if (linkable) {
    return (
      <Link
        href={`/types/${type.toLowerCase()}`}
        className={badgeClasses}
        style={badgeStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={badgeClasses} style={badgeStyle}>
      {content}
    </span>
  );
}
