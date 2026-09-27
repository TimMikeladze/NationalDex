import { describe, expect, test } from "bun:test";
import {
  parseSplashSpec,
  SPLASH_SPECS,
  splashSpec,
  startupImages,
} from "./pwa-assets";

describe("splash specs", () => {
  test("every listed spec round-trips", () => {
    for (const spec of SPLASH_SPECS) {
      expect(parseSplashSpec(splashSpec(spec))).toEqual(spec);
    }
  });

  test("specs are unique, so no two devices fight over one image", () => {
    const keys = SPLASH_SPECS.map(splashSpec);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("refuses sizes and schemes that are not in the list", () => {
    expect(parseSplashSpec("1170x2532-light")).not.toBeNull();
    expect(parseSplashSpec("1171x2532-light")).toBeNull();
    expect(parseSplashSpec("1170x2532-sepia")).toBeNull();
    expect(parseSplashSpec("99999x99999-dark")).toBeNull();
    expect(parseSplashSpec("../1170x2532-dark")).toBeNull();
    expect(parseSplashSpec("")).toBeNull();
  });

  test("startup images cover light and dark for each device", () => {
    const images = startupImages();
    expect(images.length).toBe(SPLASH_SPECS.length);
    for (const image of images) {
      const spec = image.url.replace("/pwa-splash/", "");
      expect(parseSplashSpec(spec)).not.toBeNull();
      expect(image.media).toContain("orientation: portrait");
      expect(image.media).toMatch(/prefers-color-scheme: (light|dark)/);
    }
  });
});
