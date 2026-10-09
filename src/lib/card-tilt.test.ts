import { describe, expect, test } from "bun:test";
import {
  approach,
  RESTING_TILT,
  tiltFromPointer,
  tiltRotation,
} from "./card-tilt";

const rect = { left: 100, top: 50, width: 200, height: 280 };

describe("tiltFromPointer", () => {
  test("centre of the card is flat", () => {
    expect(tiltFromPointer(200, 190, rect)).toEqual(RESTING_TILT);
  });

  test("corners map to the ends of the range", () => {
    expect(tiltFromPointer(100, 50, rect)).toEqual({
      px: 0,
      py: 0,
      tx: -1,
      ty: -1,
    });
    expect(tiltFromPointer(300, 330, rect)).toEqual({
      px: 1,
      py: 1,
      tx: 1,
      ty: 1,
    });
  });

  test("a finger dragged past the edge stays clamped", () => {
    const tilt = tiltFromPointer(-500, 9999, rect);
    expect(tilt.tx).toBe(-1);
    expect(tilt.ty).toBe(1);
  });

  test("a card with no size stays at rest", () => {
    expect(
      tiltFromPointer(10, 10, { left: 0, top: 0, width: 0, height: 0 }),
    ).toEqual(RESTING_TILT);
  });
});

describe("tiltRotation", () => {
  test("leans the pointed-at corner toward the viewer", () => {
    // Bottom-right: bottom edge forward (+X), right edge forward (-Y).
    expect(tiltRotation({ tx: 1, ty: 1 }, 10)).toEqual({
      rotateX: 10,
      rotateY: -10,
    });
  });
});

describe("approach", () => {
  test("closes the gap without overshooting", () => {
    const next = approach(0, 1, 12, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  test("is independent of frame rate", () => {
    let at60 = 0;
    for (let i = 0; i < 6; i++) at60 = approach(at60, 1, 12, 1 / 60);
    const at10 = approach(0, 1, 12, 1 / 10);
    expect(at60).toBeCloseTo(at10, 10);
  });
});
