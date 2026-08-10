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
  className,
}: {
  game: TcgGame;
  className?: string;
}) {
  const color = TCG_GAME_COLORS[game];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
        className,
      )}
      style={{ backgroundColor: `${color}20`, color }}
      title={TCG_GAME_FULL_LABELS[game]}
    >
      {TCG_GAME_LABELS[game]}
    </span>
  );
}
