"use client";

import { type MotionValue, motion } from "motion/react";
import type { TcgCardBrief, TcgGame } from "@/types/tcg";
import { formatLocalId } from "@/types/tcg";
import { GameBadge } from "./game-badge";
import { TcgCardImage } from "./tcg-card-image";

/**
 * A trading card as the swipe deck deals it: the scan edge to edge, with the
 * game, name and number laid over it for whichever card is being read.
 */
export function TcgSwipeFace({
  card,
  game,
  priority,
  captionFade,
}: {
  card: TcgCardBrief;
  game?: TcgGame;
  priority: boolean;
  captionFade: MotionValue<number>;
}) {
  return (
    <>
      <TcgCardImage
        image={card.image}
        alt={card.name}
        localId={card.localId}
        quality="high"
        width={600}
        height={825}
        priority={priority}
        className="size-full select-none object-contain"
      />

      {/* The caption belongs to whichever card is being read. On the ones
          behind, only a sliver shows, and a row of stacked scrims turns into
          one heavy dark band along the bottom of the deck. */}
      <motion.div style={{ opacity: captionFade }}>
        {game && (
          <GameBadge
            game={game}
            variant="overlay"
            className="absolute left-2 top-2"
          />
        )}

        {/* The name and number, legible over any artwork */}
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-2.5 pt-10">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">
            {card.name}
          </p>
          <span className="shrink-0 text-[10px] tabular-nums text-white/70">
            {formatLocalId(card.localId)}
          </span>
        </div>
      </motion.div>
    </>
  );
}
