"use client";

import { Heart, ListPlus, X } from "lucide-react";
import {
  animate,
  type MotionValue,
  motion,
  type PanInfo,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
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
const COMMIT_RATIO = 0.18;
const MIN_COMMIT = 42;
const MAX_COMMIT = 104;

/**
 * Seconds of travel added to the released offset before deciding. A short,
 * fast flick reads as intent just as much as a long, slow drag does, and this
 * is the lever that decides how much a flick is worth: at a fifth of a second
 * of projected travel, a quick sweep commits from almost anywhere.
 */
const VELOCITY_WEIGHT = 0.28;

// -----------------------------------------------------------------------------
// How it looks, which is deliberately not how it commits.
//
// These are measured against the card's own width rather than the commit
// distance. Tying them together means making the deck more sensitive also makes
// it rotate faster per pixel — the card starts snapping about under a slow drag
// and reads as twitchy rather than responsive. A card should turn by the same
// amount for the same movement of your thumb, however little of it it now takes
// to let one go.
// -----------------------------------------------------------------------------

/** Travel, as a share of card width, that earns a full tilt. */
const TURN_RATIO = 0.3;
/** Travel, as a share of card width, that earns a full turn in depth. */
const YAW_RATIO = 0.6;

/** Degrees of tilt once a card is a full turn-distance across. */
const MAX_TILT = 14;
const MAX_TILT_CLAMP = 30;

/** Degrees the card turns in depth as it travels, so it reads as a solid. */
const MAX_YAW = 11;
const MAX_PITCH = 8;

/** A vertical throw has to beat the horizontal one by this much to count as up. */
const UP_BIAS = 1.25;

/** Peak opacity of the verdict colour laid over the artwork. */
const WASH_MAX = 0.15;

/** Pixels of travel that still count as a tap rather than a swipe. */
const TAP_SLOP = 6;

/**
 * A card's corner radius, as a share of its width. Trading cards are cut with a
 * ~3.2mm radius on a 63mm card, and the scans carry that curve as transparency.
 * The backing, the clip and the shadow all have to follow the same curve or the
 * artwork ends up sitting on a squarer box than itself — which is most obvious
 * at the sizes the deck actually draws cards at.
 */
export const CORNER_RATIO = 3.2 / 63;

// =============================================================================
// Depth
//
// The stack is real 3D rather than scaled copies: cards sit further back on the
// Z axis and the stage's perspective does the shrinking. That is what makes the
// front card look like it is genuinely lifted off the ones behind it.
// =============================================================================

/** Z distance between one card in the stack and the next. */
export const DEPTH_Z = 62;
/**
 * How far down each card behind is pushed. It has to beat the height the
 * perspective shrink already takes off the bottom edge, or the stack hides
 * perfectly behind its own front card and stops reading as a stack at all.
 */
export const DEPTH_Y = 34;

/** Z the card rises to under a finger — the "picked up" reading. */
const LIFT_Z = 46;
/** Z it rises to on hover alone, which is a smaller promise than a press. */
const HOVER_LIFT = 0.42;

/** Springs back when a swipe is abandoned — quick, with just enough life. */
const RETURN_SPRING = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 0.9,
} as const;

/** Carries the lift, so picking a card up and putting it down both settle. */
const LIFT_SPRING = {
  type: "spring",
  stiffness: 240,
  damping: 26,
  mass: 0.7,
} as const;

/**
 * Carries a card's place in the stack. It tracks a drag closely enough to feel
 * attached, and slowly enough that the stack reads as having weight — and it is
 * what turns a button press, where there is no drag to follow, into a move
 * rather than a jump.
 */
const DEPTH_SPRING = {
  stiffness: 300,
  damping: 34,
  mass: 0.8,
} as const;

/** Fast out, no bounce — a thrown card does not negotiate with the edge. */
const EXIT_EASE = [0.22, 0.55, 0.3, 1] as const;

export type SwipeAction = "pass" | "keep" | "list";

/** Where a card was, and how fast it was moving, the moment it was let go. */
export interface SwipeThrow {
  action: SwipeAction;
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
// Stamps
// =============================================================================

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
      // Lifted off the face in Z: with the card tilted, the stamp reads as
      // sitting above the artwork rather than printed on it.
      style={{ opacity, scale, rotate, z: 26 }}
      // Solid, not tinted: a stamp has to read the same over a white Trainer
      // card and a black holo, and artwork here is anything at all.
      className={cn(
        "pointer-events-none absolute flex items-center gap-1.5 rounded-lg border-[3px] border-white/85 px-2.5 py-1 text-white shadow-lg",
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

// =============================================================================
// The card
// =============================================================================

interface DeckCardProps {
  card: TcgCardBrief;
  game?: TcgGame;
  /** 0 is the card in hand; higher numbers sit further back in the stack. */
  depth: number;
  /** True for the one card that takes the gesture and drives the stack. */
  lead: boolean;
  /** Set once committed — the card then flies out and reports back. */
  thrown: SwipeThrow | null;
  /** Written by the lead card, read by the ones behind it. */
  progress: MotionValue<number>;
  /** Where an undone card flies back in from. */
  enterFrom?: { x: number; y: number } | null;
  width: number;
  height: number;
  threshold: number;
  onCommit: (thrown: SwipeThrow) => void;
  onOpen: () => void;
  onExited: () => void;
  /** Drops the tilt, the gloss and the flight for `prefers-reduced-motion`. */
  reduceMotion: boolean;
}

/**
 * One card, at every stage of its life: waiting in the stack, in hand under a
 * finger, and on its way off the screen. It is deliberately a single component
 * rather than three — a card that changed component as it was promoted or
 * thrown would remount, and remounting means a fresh `img` and a visible blink
 * at exactly the two moments the eye is following it most closely.
 */
export function DeckCard({
  card,
  game,
  depth,
  lead,
  thrown,
  progress,
  enterFrom,
  width,
  height,
  threshold,
  onCommit,
  onOpen,
  onExited,
  reduceMotion,
}: DeckCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const fade = useMotionValue(1);
  /**
   * +1 when the card was grabbed above its middle, -1 below — a card pivots
   * around the hand holding it, so grabbing the bottom turns it the other way.
   */
  const grabDir = useMotionValue(1);
  const liftTarget = useMotionValue(0);
  const lift = useSpring(liftTarget, LIFT_SPRING);

  const radius = width * CORNER_RATIO;
  const armed = useRef<SwipeAction | null>(null);
  /**
   * Whether this gesture has travelled far enough to be a drag rather than a
   * tap. Cleared on press, never on release — the release is exactly when the
   * two have to be told apart.
   */
  const moved = useRef(false);

  // --- Place in the stack ---------------------------------------------------

  // Each card behind advances toward the slot in front as the lead card is
  // dragged away, and the spring covers the case where there was no drag.
  const rawDepth = useTransform(progress, (p) => Math.max(0, depth - p));
  const stackDepth = useSpring(rawDepth, DEPTH_SPRING);
  const depthZ = useTransform(stackDepth, (d) => -d * DEPTH_Z);
  const depthY = useTransform(stackDepth, (d) => d * DEPTH_Y);
  // The buffer card at the back is invisible; it fades up as it comes forward,
  // so nothing ever appears out of nowhere.
  const depthFade = useTransform(stackDepth, [0, 1.6, 3], [1, 1, 0]);
  // The caption belongs to the card being read, and fades up as its card comes
  // forward rather than being stacked three deep along the bottom edge.
  const captionFade = useTransform(stackDepth, [0, 0.85], [1, 0]);
  const opacity = useTransform<number, number>(
    [depthFade, fade],
    ([d, f]) => d * f,
  );

  // --- How the card sits in the hand ---------------------------------------

  const turn = width * TURN_RATIO;
  const yawAt = width * YAW_RATIO;

  const tilt = useTransform<number, number>([x, grabDir], ([latestX, dir]) =>
    reduceMotion
      ? 0
      : clamp((latestX / turn) * MAX_TILT, -MAX_TILT_CLAMP, MAX_TILT_CLAMP) *
        dir,
  );

  // Turning in depth as well as in plane. The leading edge falls away, which is
  // what a real card held between two fingers does.
  const yaw = useTransform(x, [-yawAt, 0, yawAt], [-MAX_YAW, 0, MAX_YAW]);
  const pitch = useTransform(y, [-yawAt, 0, yawAt], [-MAX_PITCH, 0, MAX_PITCH]);

  const liftZ = useTransform(lift, (l) => l * LIFT_Z);

  // --- The shadow it casts --------------------------------------------------

  // A separate flat layer rather than a box-shadow: it can then be moved and
  // faded on the compositor, and it stays lying on the surface while the card
  // above it turns.
  // Only the card in hand casts a real shadow; three of them stacked would just
  // pool into a smudge.
  const shadowFalloff = useTransform(stackDepth, [0, 1, 2], [1, 0.45, 0.15]);
  const shadowOpacity = useTransform<number, number>(
    [lift, depthFade, shadowFalloff],
    ([l, d, falloff]) => (0.18 + l * 0.24) * d * falloff,
  );
  const shadowScale = useTransform(lift, [0, 1], [0.95, 1.06]);
  const shadowY = useTransform<number, number>(
    [y, lift],
    ([dy, l]) => dy + l * 22,
  );

  // --- Verdicts -------------------------------------------------------------

  const keepOpacity = useTransform(
    x,
    [threshold * 0.14, threshold * 0.78],
    [0, 1],
  );
  const passOpacity = useTransform(
    x,
    [-threshold * 0.78, -threshold * 0.14],
    [1, 0],
  );
  const listOpacity = useTransform(
    y,
    [-threshold * 0.85, -threshold * 0.28],
    [1, 0],
  );

  const keepScale = useTransform(keepOpacity, [0, 1], [0.82, 1]);
  const passScale = useTransform(passOpacity, [0, 1], [0.82, 1]);
  const listScale = useTransform(listOpacity, [0, 1], [0.82, 1]);

  const keepWash = useTransform(x, [0, threshold], [0, WASH_MAX]);
  const passWash = useTransform(x, [-threshold, 0], [WASH_MAX, 0]);
  const listWash = useTransform(y, [-threshold, 0], [WASH_MAX, 0]);

  // A gloss that stays put while the card turns under it, so the surface reads
  // as laminated. It never fully leaves, so a card at rest still looks printed.
  const glossX = useTransform(
    x,
    [-yawAt, yawAt],
    [width * 0.85, -width * 0.85],
  );
  const glossOpacity = useTransform(
    x,
    [-yawAt * 0.8, 0, yawAt * 0.8],
    [0.5, 0.08, 0.5],
  );

  // --- Coming back from an undo --------------------------------------------

  // Runs once per card: a new slot remounts this component. The animation has
  // to start here rather than in the deck, because mounting a dragging element
  // takes ownership of the values it is handed and drops anything already
  // running on them.
  useEffect(() => {
    if (!enterFrom) return;
    x.set(enterFrom.x);
    y.set(enterFrom.y);
    const backX = animate(x, 0, RETURN_SPRING);
    const backY = animate(y, 0, RETURN_SPRING);
    return () => {
      backX.stop();
      backY.stop();
    };
  }, [enterFrom, x, y]);

  // --- Leaving --------------------------------------------------------------

  useEffect(() => {
    if (!thrown) return;
    liftTarget.set(0);

    if (reduceMotion) {
      const out = animate(fade, 0, { duration: 0.16, onComplete: onExited });
      return () => out.stop();
    }

    const speed = Math.hypot(thrown.velocityX, thrown.velocityY);
    // A hard throw leaves faster than a nudged one, but never so fast that the
    // eye loses it.
    const duration = clamp(0.46 - speed / 9000, 0.26, 0.46);

    // Far enough that the card is off-screen even at full tilt, whatever the
    // viewport — a card that fades while still visible reads as a glitch.
    const clearX = window.innerWidth / 2 + width;
    const clearY = window.innerHeight / 2 + height;

    const to =
      thrown.action === "list"
        ? { x: x.get() + thrown.velocityX * 0.14, y: -clearY }
        : {
            x: (thrown.action === "keep" ? 1 : -1) * clearX,
            y: y.get() + thrown.velocityY * 0.22,
          };

    const outX = animate(x, to.x, {
      duration,
      ease: EXIT_EASE,
      onComplete: onExited,
    });
    const outY = animate(y, to.y, { duration, ease: EXIT_EASE });
    return () => {
      outX.stop();
      outY.stop();
    };
  }, [thrown, reduceMotion, width, height, x, y, fade, liftTarget, onExited]);

  // --- Driving the stack ----------------------------------------------------

  const travelled = useTransform<number, number>([x, y], ([lx, ly]) =>
    Math.min(1, Math.max(Math.abs(lx), Math.max(0, -ly)) / threshold),
  );

  // Only the card in hand reports. The callback is re-subscribed each render,
  // so a card that has just been promoted or thrown is judged on what it is
  // now, not on what it was when it mounted.
  useMotionValueEvent(travelled, "change", (value) => {
    if (lead && !thrown) progress.set(value);
  });

  // --- The gesture ----------------------------------------------------------

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
    const rect = (
      event.currentTarget as HTMLElement | null
    )?.getBoundingClientRect();
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
    liftTarget.set(0);

    const action = verdictAt(
      info.offset.x + info.velocity.x * VELOCITY_WEIGHT,
      info.offset.y + info.velocity.y * VELOCITY_WEIGHT,
    );

    if (!action) {
      animate(x, 0, RETURN_SPRING);
      animate(y, 0, RETURN_SPRING);
      return;
    }

    vibrate(12);
    onCommit({
      action,
      velocityX: info.velocity.x,
      velocityY: info.velocity.y,
    });
  };

  const interactive = lead && !thrown;

  return (
    // The depth layer carries the card's place in the stack and nothing else.
    // Opacity deliberately does not live here: any opacity below 1 groups the
    // element, and a grouped element flattens `preserve-3d` — which would strip
    // the perspective off every card behind the first and leave the stack
    // looking like same-size cards stacked flat.
    <motion.div
      aria-hidden={!interactive}
      style={{
        y: depthY,
        z: depthZ,
        transformStyle: "preserve-3d",
        zIndex: thrown ? 40 : 30 - depth,
      }}
      className="absolute inset-0"
    >
      {/* What the card casts onto the stack below it */}
      <motion.div
        aria-hidden
        style={{
          x,
          y: shadowY,
          scale: shadowScale,
          opacity: shadowOpacity,
          borderRadius: radius,
          boxShadow: "0 22px 45px 4px rgba(0,0,0,0.65)",
        }}
        className="pointer-events-none absolute inset-x-3 bottom-1 top-5 will-change-transform"
      />

      <motion.div
        drag={interactive}
        dragMomentum={false}
        dragElastic={1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onPointerDown={() => {
          moved.current = false;
          if (interactive) liftTarget.set(1);
        }}
        onPointerUp={() => liftTarget.set(0)}
        onHoverStart={() => {
          if (interactive) liftTarget.set(HOVER_LIFT);
        }}
        onHoverEnd={() => liftTarget.set(0)}
        onTap={() => {
          if (interactive && !moved.current) onOpen();
        }}
        // Opacity is safe here: it is 1 for the two cards nearest the front, so
        // nothing that needs depth is ever grouped. The cards it does dim are
        // far enough back to have no 3D of their own left to lose.
        style={{
          x,
          y,
          z: liftZ,
          opacity,
          rotate: tilt,
          rotateY: reduceMotion ? 0 : yaw,
          rotateX: reduceMotion ? 0 : pitch,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          borderRadius: radius,
        }}
        className={cn(
          "absolute inset-0 bg-muted ring-1 ring-black/10 will-change-transform dark:ring-white/10",
          interactive && "cursor-grab touch-none active:cursor-grabbing",
        )}
      >
        {/* The artwork is inert: a browser starts its own image-drag from an
            `img`, which cancels the pointer stream the swipe is built on. */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius: radius }}
        >
          <TcgCardImage
            image={card.image}
            alt={card.name}
            localId={card.localId}
            quality="high"
            width={600}
            height={825}
            priority={depth <= 1}
            className="size-full select-none object-contain"
          />

          {/* Verdict washes */}
          <motion.div
            style={{ opacity: keepWash }}
            className="absolute inset-0 bg-emerald-500"
          />
          <motion.div
            style={{ opacity: passWash }}
            className="absolute inset-0 bg-rose-500"
          />
          <motion.div
            style={{ opacity: listWash }}
            className="absolute inset-0 bg-sky-500"
          />

          {!reduceMotion && (
            <motion.div
              style={{ x: glossX, opacity: glossOpacity }}
              className="absolute -inset-y-1/4 left-0 w-2/3 rotate-[18deg] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.12)_28%,rgba(255,255,255,0.6)_50%,rgba(255,255,255,0.12)_72%,transparent_100%)] will-change-transform"
            />
          )}

          {/* The caption belongs to whichever card is being read. On the ones
              behind, only a sliver shows, and a row of stacked scrims turns
              into one heavy dark band along the bottom of the deck. */}
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
        </div>

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
          className="inset-x-0 bottom-20 mx-auto w-fit bg-sky-500"
        />
      </motion.div>
    </motion.div>
  );
}
