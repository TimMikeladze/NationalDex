/**
 * Where a pointer sits on a card, as the numbers the holo effect is drawn
 * from. Kept free of the DOM so the geometry can be checked on its own.
 */
export interface CardTilt {
  /** Pointer across the card, 0 (left) to 1 (right). */
  px: number;
  /** Pointer down the card, 0 (top) to 1 (bottom). */
  py: number;
  /** Offset from the centre, -1 to 1 — what the rotation is made from. */
  tx: number;
  ty: number;
}

/** A card nobody is touching: flat, lit from the middle. */
export const RESTING_TILT: CardTilt = { px: 0.5, py: 0.5, tx: 0, ty: 0 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** The tilt for a pointer at (`x`, `y`) in client space over `rect`. */
export function tiltFromPointer(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
): CardTilt {
  if (rect.width <= 0 || rect.height <= 0) return RESTING_TILT;
  const px = clamp01((x - rect.left) / rect.width);
  const py = clamp01((y - rect.top) / rect.height);
  return { px, py, tx: px * 2 - 1, ty: py * 2 - 1 };
}

/**
 * The rotation that leans the point under the pointer toward the viewer.
 * CSS `rotateY(+)` pushes the right edge away and `rotateX(+)` brings the
 * bottom edge closer, hence the one flipped sign.
 */
export function tiltRotation(
  tilt: Pick<CardTilt, "tx" | "ty">,
  maxDegrees: number,
): { rotateX: number; rotateY: number } {
  return {
    rotateX: tilt.ty * maxDegrees,
    rotateY: -tilt.tx * maxDegrees,
  };
}

/**
 * One step of a critically damped follow toward `target`, frame-rate
 * independent. `stiffness` is roughly how many times per second the gap
 * closes by e.
 */
export function approach(
  current: number,
  target: number,
  stiffness: number,
  dtSeconds: number,
): number {
  return target + (current - target) * Math.exp(-stiffness * dtSeconds);
}
