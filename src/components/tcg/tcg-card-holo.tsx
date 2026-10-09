"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  approach,
  type CardTilt,
  RESTING_TILT,
  tiltFromPointer,
} from "@/lib/card-tilt";
import { cn } from "@/lib/utils";

/** How a finger is allowed to handle the card. See `docs/card-holo.md`. */
export type HoloTouch = "pan" | "grab" | "off";

interface TcgCardHoloProps {
  children: React.ReactNode;
  /** `sm` for grid tiles, `lg` for a card held up on its own. */
  size?: "sm" | "lg";
  touch?: HoloTouch;
  className?: string;
}

const SIZES = {
  sm: { maxTilt: 11, perspective: 700 },
  lg: { maxTilt: 9, perspective: 1600 },
} as const;

// Gaps close by e this many times a second: quick to follow a hand, slower to
// settle back, so letting go reads as the card easing down rather than a snap.
const FOLLOW = 16;
const SETTLE = 7;
// A finger that travels this far has tilted the card, not tapped it.
const DRAG_SLOP = 6;

/**
 * A trading card you can pick up: rounded like the real thing, resting on its
 * own shadow, and — under a pointer or a finger — leaning toward you with the
 * light sliding across its foil. One generic recipe for every card.
 *
 * The motion never goes through React. A spring writes custom properties on
 * the element each frame and the CSS (`.holo-*` in globals.css) draws from
 * them, so a grid of tiles costs nothing until one of them is touched.
 */
export function TcgCardHolo({
  children,
  size = "sm",
  touch = "pan",
  className,
}: TcgCardHoloProps) {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef<CardTilt & { a: number }>({ ...RESTING_TILT, a: 0 });
  const current = useRef<CardTilt & { a: number }>({ ...RESTING_TILT, a: 0 });
  const frame = useRef<number | null>(null);
  const lastTime = useRef(0);
  const press = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const suppressClick = useRef(false);

  const tick = useCallback((time: number) => {
    const el = ref.current;
    if (!el) return;
    const dt = Math.min(0.05, (time - lastTime.current) / 1000 || 1 / 60);
    lastTime.current = time;

    const goal = target.current;
    const now = current.current;
    const stiffness = goal.a > 0 ? FOLLOW : SETTLE;
    now.px = approach(now.px, goal.px, stiffness, dt);
    now.py = approach(now.py, goal.py, stiffness, dt);
    now.tx = approach(now.tx, goal.tx, stiffness, dt);
    now.ty = approach(now.ty, goal.ty, stiffness, dt);
    now.a = approach(now.a, goal.a, stiffness, dt);

    el.style.setProperty("--holo-px", now.px.toFixed(4));
    el.style.setProperty("--holo-py", now.py.toFixed(4));
    el.style.setProperty("--holo-tx", now.tx.toFixed(4));
    el.style.setProperty("--holo-ty", now.ty.toFixed(4));
    el.style.setProperty("--holo-a", now.a.toFixed(4));

    const settled =
      Math.abs(now.tx - goal.tx) < 0.001 &&
      Math.abs(now.ty - goal.ty) < 0.001 &&
      Math.abs(now.px - goal.px) < 0.001 &&
      Math.abs(now.py - goal.py) < 0.001 &&
      Math.abs(now.a - goal.a) < 0.001;

    if (settled) {
      frame.current = null;
      if (goal.a === 0) delete el.dataset.holoLive;
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }, []);

  const wake = useCallback(() => {
    const el = ref.current;
    if (!el || frame.current !== null) return;
    el.dataset.holoLive = "";
    lastTime.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }, [tick]);

  const aim = useCallback(
    (x: number, y: number) => {
      const el = ref.current;
      if (!el) return;
      target.current = {
        ...tiltFromPointer(x, y, el.getBoundingClientRect()),
        a: 1,
      };
      wake();
    },
    [wake],
  );

  const release = useCallback(() => {
    press.current = null;
    target.current = { ...RESTING_TILT, a: 0 };
    wake();
  }, [wake]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const takesTouch = touch !== "off";
  const { maxTilt, perspective } = SIZES[size];

  return (
    <div
      ref={ref}
      data-touch={touch}
      className={cn("holo", className)}
      style={
        {
          "--holo-max": `${maxTilt}deg`,
          perspective: `${perspective}px`,
        } as React.CSSProperties
      }
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") aim(event.clientX, event.clientY);
      }}
      onPointerDown={(event) => {
        suppressClick.current = false;
        if (event.pointerType !== "touch" || !takesTouch) return;
        press.current = { x: event.clientX, y: event.clientY, dragged: false };
        if (touch === "grab") {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        aim(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== "touch") {
          aim(event.clientX, event.clientY);
          return;
        }
        const held = press.current;
        if (!held) return;
        if (
          !held.dragged &&
          Math.hypot(event.clientX - held.x, event.clientY - held.y) > DRAG_SLOP
        ) {
          held.dragged = true;
        }
        aim(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "touch") return;
        suppressClick.current = press.current?.dragged ?? false;
        release();
      }}
      onPointerCancel={release}
      onPointerLeave={(event) => {
        // A captured finger keeps the card even off its edge.
        if (event.pointerType === "touch" && touch === "grab") return;
        release();
      }}
      // Tilting a tile with a finger ends in a click on whatever it wraps;
      // that gesture was handling the card, not asking to open it.
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="holo-card">
        {children}
        <div aria-hidden className="holo-foil" />
        <div aria-hidden className="holo-glare" />
      </div>
    </div>
  );
}
