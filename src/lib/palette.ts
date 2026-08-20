/**
 * Reading the colours back out of an image.
 *
 * A card scan and a sprite already carry the only palette that could ever feel
 * right for the page they sit on — Magikarp's page should be red and pond-blue
 * because the card is, not because a lookup table says Water is #6390F0. Music
 * apps have done this for years: the artwork paints the room it hangs in.
 *
 * Everything here is pure. Loading the pixels is the browser's job (see
 * `use-ambient-palette`); this module only turns pixels into colours and
 * colours into something worth putting behind a page.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  /** Degrees, 0-360. */
  h: number;
  /** 0-1. */
  s: number;
  /** 0-1. */
  l: number;
}

// =============================================================================
// Conversions
// =============================================================================

export function hexToRgb(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === red) {
    h = ((green - blue) / delta) % 6;
  } else if (max === green) {
    h = (blue - red) / delta + 2;
  } else {
    h = (red - green) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hue = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const [r1, g1, b1] =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const m = l - chroma / 2;
  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Shortest distance around the colour wheel, in degrees. */
function hueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

// =============================================================================
// Extraction
// =============================================================================

/**
 * Pixels are grouped by how they *look* rather than by their exact bytes: a
 * hue/saturation/lightness grid puts Magikarp's every shade of red in one
 * bucket, which an RGB grid would scatter across a dozen. Two dozen hue slices
 * is fine enough to keep red apart from orange and coarse enough that
 * anti-aliasing doesn't invent a colour of its own.
 */
const HUE_BINS = 24;
const SATURATION_BINS = 3;
const LIGHTNESS_BINS = 5;

/** Below this the pixel is a soft edge or a transparent corner, not colour. */
const MIN_ALPHA = 128;

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

export interface ExtractOptions {
  /** How many colours to return, most prominent first. */
  count?: number;
}

/**
 * The colours an image is actually made of, ordered by how much of the image
 * they own — weighted so that a small vivid patch can outrank a large dull one.
 * A card is mostly border and background; the artwork is what you remember.
 */
export function extractPalette(
  pixels: Uint8ClampedArray,
  options: ExtractOptions = {},
): string[] {
  const count = options.count ?? 3;
  const buckets = new Map<number, Bucket>();

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < MIN_ALPHA) continue;

    const rgb = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
    const { h, s, l } = rgbToHsl(rgb);

    // Paper white and ink black are the page, not the picture. They drown out
    // everything else in a scan that is four-fifths card border.
    if (l > 0.95 || l < 0.05) continue;

    const key =
      Math.min(HUE_BINS - 1, Math.floor((h / 360) * HUE_BINS)) *
        SATURATION_BINS *
        LIGHTNESS_BINS +
      Math.min(SATURATION_BINS - 1, Math.floor(s * SATURATION_BINS)) *
        LIGHTNESS_BINS +
      Math.min(LIGHTNESS_BINS - 1, Math.floor(l * LIGHTNESS_BINS));

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.r += rgb.r;
      bucket.g += rgb.g;
      bucket.b += rgb.b;
    } else {
      buckets.set(key, { count: 1, r: rgb.r, g: rgb.g, b: rgb.b });
    }
  }

  if (buckets.size === 0) return [];

  const candidates = [...buckets.values()]
    .map((bucket) => {
      const average = {
        r: bucket.r / bucket.count,
        g: bucket.g / bucket.count,
        b: bucket.b / bucket.count,
      };
      const hsl = rgbToHsl(average);
      // Area is the base, but a colour earns its place by being a colour:
      // saturation counts for more than the pixels it covers, and mid
      // lightness — where a hue reads strongest — counts for a little.
      const vividness = 0.2 + 0.8 * hsl.s;
      const depth = clamp(1 - Math.abs(hsl.l - 0.5) * 1.4, 0.15, 1);
      return {
        hsl,
        rgb: average,
        score: bucket.count * vividness * depth,
      };
    })
    .sort((a, b) => b.score - a.score);

  // A wash of three near-identical reds is just one red. Each pick has to
  // differ from the ones before it in hue or in lightness to be worth a slot.
  const picked: typeof candidates = [];
  for (const candidate of candidates) {
    const tooClose = picked.some((chosen) => {
      const greyish = chosen.hsl.s < 0.12 && candidate.hsl.s < 0.12;
      const sameHue =
        greyish || hueDistance(chosen.hsl.h, candidate.hsl.h) < 22;
      return sameHue && Math.abs(chosen.hsl.l - candidate.hsl.l) < 0.2;
    });
    if (tooClose) continue;
    picked.push(candidate);
    if (picked.length === count) break;
  }

  return picked.map((candidate) => rgbToHex(candidate.rgb));
}

// =============================================================================
// Making colours fit to sit behind a page
// =============================================================================

/**
 * Raw colours off an image are all over the place — a near-black outline, a
 * washed-out highlight — and either extreme disappears against one of the two
 * themes. Pulling every colour into the same mid band means the same wash
 * reads on white and on near-black without being recomputed per theme.
 *
 * Greys are left grey. Saturating a colour that has no hue only amplifies
 * whatever noise decided the winning bucket.
 */
export function harmonizeColor(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb);
  return rgbToHex(
    hslToRgb({
      h,
      s: s > 0.12 ? clamp(s, 0.52, 0.92) : clamp(s * 1.5, 0, 0.2),
      l: clamp(l, 0.44, 0.68),
    }),
  );
}

/**
 * A backdrop wants two or three colours. One is a flat panel; four is a
 * fruit salad. When an image only yields a single colour, the second is
 * borrowed from its neighbourhood on the wheel so the wash still moves.
 */
export function toAmbientColors(hexes: string[], count = 3): string[] {
  const harmonized = hexes
    .map(harmonizeColor)
    .filter((hex): hex is string => hex !== null)
    .slice(0, count);

  if (harmonized.length === 0) return [];

  if (harmonized.length === 1) {
    const rgb = hexToRgb(harmonized[0]);
    if (rgb) {
      const { h, s, l } = rgbToHsl(rgb);
      harmonized.push(
        rgbToHex(hslToRgb({ h: h + 34, s: clamp(s * 0.85, 0.3, 0.9), l: l })),
      );
    }
  }

  return harmonized;
}

// =============================================================================
// Fetching the pixels
// =============================================================================

/** Widths Next's image optimizer will serve without extra configuration. */
const SAMPLE_WIDTH = 64;

/**
 * Reading pixels back out of a canvas is forbidden once a cross-origin image
 * has been drawn into it, and none of the sprite or card CDNs promise the CORS
 * header that would lift that. Asking our own image optimizer for a 64px copy
 * sidesteps the question entirely: the bytes arrive same-origin, so the canvas
 * stays readable, and a thumbnail is all the sampler ever needed.
 */
export function paletteSourceUrl(src: string): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${SAMPLE_WIDTH}&q=75`;
}

export const PALETTE_SAMPLE_WIDTH = SAMPLE_WIDTH;
