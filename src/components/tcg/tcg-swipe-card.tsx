"use client";

import { Heart, ListPlus, X } from "lucide-react";
import {
  animate,
  type MotionValue,
  motion,
  type PanInfo,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { TcgCardBrief, TcgGame } from "@/types/tcg";
import { formatLocalId } from "@/types/tcg";
import { GameBadge } from "./game-badge";
import { TcgCardImage } from "./tcg-card-image";

// =============================================================================
// Feel
//
// The numbers a swipe is judged by. They are deliberately generous: a card
// should leave because it was thrown, not because it was dragged far enough.
// =============================================================================

/** Commit distance, as a share of the card's width. */
const COMMIT_RATIO = 0.32;
const MIN_COMMIT = 72;
const MAX_COMMIT = 168;

/**
 * Seconds of travel added to the released offset before deciding. A short,
 * fast flick reads as intent just as much as a long, slow drag does.
 */
const VELOCITY_WEIGHT = 0.18;

/** Degrees of tilt once a card is a full commit-distance across. */
const MAX_TILT = 15;

/** A vertical throw has to beat the horizontal one by this much to count as up. */
const UP_BIAS = 1.25;

/** Peak opacity of the verdict colour laid over the artwork. */
const WASH_MAX = 0.16;

/** Pixels of travel that still count as a tap rather than a swipe. */
const TAP_SLOP = 6;

/** Springs back when a swipe is abandoned — quick, with just enough life. */
const RETURN_SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.85,
} as const;

export type SwipeAction = "pass" | "keep" | "list";

/** Where a card was, and how fast it was moving, the moment it was let go. */
export interface SwipeThrow {
  action: SwipeAction;
  x: number;
  y: number;
  rotate: number;
  velocityX: number;
  velocityY: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** How far a card must travel before a release counts, for a deck this wide. */
export function commitThreshold(width: number) {
  return clamp(width * COMMIT_RATIO, MIN_COMMIT, MAX_COMMIT);
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  navigator.vibrate?.(pattern);
}

// =============================================================================
// The card itself
// =============================================================================

interface CardFaceProps {
  card: TcgCardBrief;
  game?: TcgGame;
  priority?: boolean;
  className?: string;
}

/**
 * The artwork as it looks in the deck, shared by the card being dragged and the
 * one flying away — they have to be pixel-identical or the hand-off shows.
 */
export function SwipeCardFace({
  card,
  game,
  priority = false,
  className,
}: CardFaceProps) {
  return (
    // Inert on purpose: a browser starts its own image-drag from an `img`,
    // which cancels the pointer stream the swipe is built on. The card around
    // this is the only thing that takes a pointer.
    <div
      className={cn(
        "pointer-events-none relative size-full overflow-hidden rounded-xl",
        className,
      )}
    >
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

      {game && (
        <GameBadge
          game={game}
          variant="overlay"
          className="pointer-events-none absolute left-2 top-2 backdrop-blur"
        />
      )}

      {/* The name and number, legible over any artwork */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2.5 pt-10">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">
          {card.name}
        </p>
        <span className="shrink-0 text-[10px] tabular-nums text-white/70">
          {formatLocalId(card.localId)}
        </span>
      </div>
    </div>
  );
}

interface StampProps {
  label: string;
  icon: React.ReactNode;
  opacity: MotionValue<number>;
  scale: MotionValue<number>;
  /** Degrees, so the stamp reads as pressed on by hand rather than typeset. */
  rotate?: number;
  className?: string;
}

/** The verdict written across the artwork while a swipe is in progress. */
function Stamp({ label, icon, opacity, scale, rotate, className }: StampProps) {
  return (
    <motion.div
      aria-hidden
      style={{ opacity, scale, rotate }}
      // Solid, not tinted: a stamp has to read the same over a white Trainer
      // card and a black holo, and artwork here is anything at all.
      className={cn(
        "pointer-events-none absolute flex items-center gap-1.5 rounded-lg border-[3px] border-white/80 px-2.5 py-1 text-white shadow-lg",
        className,
      )}
    >
      {icon}
      <span className="text-lg font-bold uppercase tracking-[0.18em]">
        {label}
      </span>
    </motion.div>
  );
}

interface TcgSwipeCardProps {
  card: TcgCardBrief;
  game?: TcgGame;
  /** Shared with the deck, so the stack behind can react to this card's drag. */
  x: MotionValue<number>;
  y: MotionValue<number>;
  /**
   * +1 when the card was grabbed above its middle, -1 below — a card pivots
   * around the hand holding it, so grabbing the bottom tilts it the other way.
   */
  grabDir: MotionValue<number>;
  threshold: number;
  onCommit: (thrown: SwipeThrow) => void;
  onOpen: () => void;
  /**
   * Where this card should fly in from, for a card brought back by undo. It has
   * to be started from inside the card rather than by the deck: mounting a
   * dragging component takes ownership of the values it is given, so an
   * animation begun before the mount is dropped on the way in.
   */
  enterFrom?: { x: number; y: number } | null;
  /** Disables rotation and the sheen for `prefers-reduced-motion`. */
  reduceMotion: boolean;
}

/**
 * The top card of the deck: dragged in two dimensions, tilted by how far it has
 * travelled, and released into one of three verdicts. It reports the throw and
 * lets the deck decide what happens next — the card that actually flies off is
 * a separate, non-interactive copy, so nothing has to fight the drag gesture on
 * its way out.
 */
export function TcgSwipeCard({
  card,
  game,
  x,
  y,
  grabDir,
  threshold,
  onCommit,
  onOpen,
  enterFrom,
  reduceMotion,
}: TcgSwipeCardProps) {
  const armed = useRef<SwipeAction | null>(null);
  /**
   * Whether this gesture has travelled far enough to be a drag rather than a
   * tap. Cleared on press, never on release — the release is exactly when the
   * two have to be told apart.
   */
  const moved = useRef(false);

  // Runs once per card, since a new card id remounts this component.
  useEffect(() => {
    if (!enterFrom) return;
    x.set(enterFrom.x);
    y.set(enterFrom.y);
    const returnX = animate(x, 0, RETURN_SPRING);
    const returnY = animate(y, 0, RETURN_SPRING);
    return () => {
      returnX.stop();
      returnY.stop();
    };
  }, [enterFrom, x, y]);

  const tilt = useTransform<number, number>([x, grabDir], ([latestX, dir]) =>
    reduceMotion ? 0 : clamp((latestX / threshold) * MAX_TILT, -30, 30) * dir,
  );

  // A whisper of Y-rotation reads as the card catching the light as it turns.
  const lean = useTransform(x, [-threshold * 2, 0, threshold * 2], [7, 0, -7]);

  const keepOpacity = useTransform(
    x,
    [threshold * 0.15, threshold * 0.8],
    [0, 1],
  );
  const passOpacity = useTransform(
    x,
    [-threshold * 0.8, -threshold * 0.15],
    [1, 0],
  );
  const listOpacity = useTransform(
    y,
    [-threshold * 0.9, -threshold * 0.3],
    [1, 0],
  );

  const keepScale = useTransform(keepOpacity, [0, 1], [0.8, 1]);
  const passScale = useTransform(passOpacity, [0, 1], [0.8, 1]);
  const listScale = useTransform(listOpacity, [0, 1], [0.8, 1]);

  // A colour wash over the whole card, so the verdict is readable at a glance
  // even when the stamp is over busy holo artwork.
  const keepWash = useTransform(x, [0, threshold], [0, WASH_MAX]);
  const passWash = useTransform(x, [-threshold, 0], [WASH_MAX, 0]);
  const listWash = useTransform(y, [-threshold, 0], [WASH_MAX, 0]);

  const sheenX = useTransform(
    x,
    [-threshold * 2, threshold * 2],
    ["-60%", "60%"],
  );
  const sheenOpacity = useTransform(
    x,
    [-threshold * 1.5, -threshold * 0.2, 0, threshold * 0.2, threshold * 1.5],
    [0.5, 0, 0, 0, 0.5],
  );

  /** Which verdict the card is currently sitting in, if any. */
  const verdictAt = (offsetX: number, offsetY: number): SwipeAction | null => {
    const up = -offsetY;
    if (up > threshold && up > Math.abs(offsetX) * UP_BIAS) return "list";
    if (offsetX > threshold) return "keep";
    if (offsetX < -threshold) return "pass";
    return null;
  };

  const handleDragStart = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const target = event.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    if (rect) {
      grabDir.set(info.point.y < rect.top + rect.height / 2 ? 1 : -1);
    }
  };

  const handleDrag = (_event: unknown, info: PanInfo) => {
    if (Math.hypot(info.offset.x, info.offset.y) > TAP_SLOP) {
      moved.current = true;
    }

    // A tick as the card crosses into a verdict, and nothing while it sits
    // there — the buzz marks the boundary, not the region.
    const verdict = verdictAt(info.offset.x, info.offset.y);
    if (verdict !== armed.current) {
      armed.current = verdict;
      if (verdict) vibrate(6);
    }
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    armed.current = null;

    const projectedX = info.offset.x + info.velocity.x * VELOCITY_WEIGHT;
    const projectedY = info.offset.y + info.velocity.y * VELOCITY_WEIGHT;
    const action = verdictAt(projectedX, projectedY);

    if (!action) {
      animate(x, 0, RETURN_SPRING);
      animate(y, 0, RETURN_SPRING);
      return;
    }

    vibrate(12);
    onCommit({
      action,
      x: x.get(),
      y: y.get(),
      rotate: tilt.get(),
      velocityX: info.velocity.x,
      velocityY: info.velocity.y,
    });
  };

  return (
    <motion.div
      // A fresh card for every id, so the drag gesture never carries over.
      key={card.id}
      drag
      dragMomentum={false}
      dragElastic={1}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={() => {
        moved.current = false;
      }}
      onTap={() => {
        if (!moved.current) onOpen();
      }}
      style={{
        x,
        y,
        rotate: tilt,
        rotateY: reduceMotion ? 0 : lean,
        transformPerspective: 1400,
      }}
      // A card dealt off the stack rises into place; a card brought back by
      // undo is already whole and only has to travel.
      initial={enterFrom ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      whileTap={{ cursor: "grabbing" }}
      className="absolute inset-0 cursor-grab touch-none rounded-xl bg-background shadow-2xl shadow-black/30 will-change-transform"
    >
      <SwipeCardFace card={card} game={game} priority />

      {/* Verdict washes, then the stamps on top of them */}
      <motion.div
        aria-hidden
        style={{ opacity: keepWash }}
        className="pointer-events-none absolute inset-0 rounded-xl bg-emerald-500"
      />
      <motion.div
        aria-hidden
        style={{ opacity: passWash }}
        className="pointer-events-none absolute inset-0 rounded-xl bg-rose-500"
      />
      <motion.div
        aria-hidden
        style={{ opacity: listWash }}
        className="pointer-events-none absolute inset-0 rounded-xl bg-sky-500"
      />

      {!reduceMotion && (
        <motion.div
          aria-hidden
          style={{ x: sheenX, opacity: sheenOpacity }}
          className="pointer-events-none absolute -inset-y-4 -inset-x-1/2 rounded-xl bg-[linear-gradient(105deg,transparent_42%,rgba(255,255,255,0.65)_50%,transparent_58%)] mix-blend-overlay"
        />
      )}

      <Stamp
        label="keep"
        icon={<Heart className="size-4 fill-current" />}
        opacity={keepOpacity}
        scale={keepScale}
        rotate={-11}
        className="left-4 top-5 bg-emerald-500"
      />
      <Stamp
        label="pass"
        icon={<X className="size-4" />}
        opacity={passOpacity}
        scale={passScale}
        rotate={11}
        className="right-4 top-5 bg-rose-500"
      />
      <Stamp
        label="list"
        icon={<ListPlus className="size-4" />}
        opacity={listOpacity}
        scale={listScale}
        className="inset-x-0 bottom-16 mx-auto w-fit bg-sky-500"
      />
    </motion.div>
  );
}

// =============================================================================
// The card on its way out
// =============================================================================

/** Off-screen travel, plus enough margin that the corners clear at full tilt. */
const EXIT_MARGIN = 420;

interface FlyingCardProps {
  card: TcgCardBrief;
  game?: TcgGame;
  thrown: SwipeThrow;
  reduceMotion: boolean;
  onDone: () => void;
}

/**
 * A committed card, continuing along the line it was thrown on. It is a plain
 * copy rendered above the deck — the next card is already sliding forward
 * underneath it, which is what makes the stack feel like a stack.
 */
export function FlyingCard({
  card,
  game,
  thrown,
  reduceMotion,
  onDone,
}: FlyingCardProps) {
  const speed = Math.hypot(thrown.velocityX, thrown.velocityY);
  // A hard throw leaves faster than a nudged one, but never so fast it flickers.
  const duration = reduceMotion
    ? 0.14
    : clamp(520 / (600 + speed) + 0.2, 0.24, 0.44);

  const horizontal =
    thrown.action === "keep" ? 1 : thrown.action === "pass" ? -1 : 0;

  const target = reduceMotion
    ? {
        x: thrown.x + horizontal * 48,
        y: thrown.action === "list" ? thrown.y - 48 : thrown.y,
      }
    : thrown.action === "list"
      ? {
          x: thrown.x + thrown.velocityX * 0.12,
          y: -(EXIT_MARGIN + 900),
        }
      : {
          x: horizontal * (EXIT_MARGIN + 900),
          y: thrown.y + thrown.velocityY * 0.2,
        };

  return (
    <motion.div
      aria-hidden
      initial={{
        x: thrown.x,
        y: thrown.y,
        rotate: thrown.rotate,
        opacity: 1,
      }}
      animate={{
        ...target,
        rotate: reduceMotion ? thrown.rotate : thrown.rotate + horizontal * 12,
        opacity: 0,
      }}
      transition={{
        default: { duration, ease: [0.25, 0.6, 0.35, 1] },
        // The fade waits until the card is well clear, so it reads as leaving
        // rather than dissolving.
        opacity: {
          duration: duration * (reduceMotion ? 1 : 0.5),
          delay: duration * (reduceMotion ? 0 : 0.5),
          ease: "linear",
        },
      }}
      onAnimationComplete={onDone}
      className="pointer-events-none absolute inset-0 rounded-xl bg-background shadow-2xl shadow-black/30 will-change-transform"
    >
      <SwipeCardFace card={card} game={game} />
    </motion.div>
  );
}
