"use client";

import { cn } from "@/lib/utils";
import type { TcgGame } from "@/types/tcg";
import {
  TCG_GAME_COLORS,
  TCG_GAME_FULL_LABELS,
  TCG_GAME_LABELS,
} from "@/types/tcg";

/** Marks whether something belongs to the physical TCG or to TCG Pocket. */
export function GameBadge({
  game,
  /** `overlay` sits on artwork, so it carries its own opaque background. */
  variant = "tint",
  className,
}: {
  game: TcgGame;
  variant?: "tint" | "overlay";
  className?: string;
}) {
  const color = TCG_GAME_COLORS[game];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        variant === "overlay" && "bg-background/85",
        className,
      )}
      style={
        variant === "overlay"
          ? { color }
          : { backgroundColor: `${color}20`, color }
      }
      title={TCG_GAME_FULL_LABELS[game]}
    >
      {TCG_GAME_LABELS[game]}
    </span>
  );
}
