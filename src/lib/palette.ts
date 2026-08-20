/**
 * Reading the colours back out of an image.
 *
 * A card scan and a sprite already carry the only palette that could ever feel
 * right for the page they sit on — Magikarp's page should be red and pond-blue
 * because the card is, not because a lookup table says Water is #6390F0.
 *
 * The work happens in OKLab, not HSL. HSL's "saturation" is a lie told about
 * a cube: two colours with the same S look nothing alike, distance in it means
 * nothing, and pushing a colour up its S axis drags it grey and muddy. OKLab is
 * built so that equal steps look like equal steps, which buys three things at
 * once — clustering can use plain distance and get perceptual groups, lightness
 * can be pinned without shifting hue, and chroma can be pushed hard and stay
 * clean. Every colour leaves here as `oklch()` so the browser mixes and, on a
 * wide-gamut screen, renders it in the same space rather than in sRGB.
 *
 * Everything is pure. Loading the pixels is the browser's job (see
 * `use-ambient-palette`); this module only turns pixels into colour.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

export interface Oklch {
  /** Perceptual lightness, 0-1. */
  L: number;
  /** Chroma. 0 is grey; sRGB tops out near 0.32, wider gamuts go past it. */
  C: number;
  /** Hue angle in degrees, 0-360. */
  h: number;
}

// =============================================================================
// Colour space
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** sRGB is stored gamma-encoded; every calculation below wants light. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function toGamma(channel: number): number {
  const c =
    channel <= 0.0031308
      ? channel * 12.92
      : 1.055 * channel ** (1 / 2.4) - 0.055;
  return clamp(Math.round(c * 255), 0, 255);
}

/** Björn Ottosson's OKLab, via the LMS cone responses it is built on. */
export function rgbToOklab({ r, g, b }: Rgb): Oklab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToRgb({ L, a, b }: Oklab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function oklabToOklch({ L, a, b }: Oklab): Oklch {
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

export function oklchToOklab({ L, C, h }: Oklch): Oklab {
  const radians = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(radians), b: C * Math.sin(radians) };
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = hexToRgb(hex);
  return rgb ? oklabToOklch(rgbToOklab(rgb)) : null;
}

export function oklchToHex(color: Oklch): string {
  const { r, g, b } = oklabToRgb(oklchToOklab(color));
  const channel = (value: number) => value.toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * CSS, in the same space the maths was done in. A browser on a P3 display
 * renders chroma sRGB cannot hold rather than flattening it, which is most of
 * why this reads current rather than like a 2015 gradient.
 */
export function formatOklch({ L, C, h }: Oklch): string {
  const round = (value: number, places: number) =>
    Number(value.toFixed(places));
  return `oklch(${round(L * 100, 1)}% ${round(C, 4)} ${round(h, 1)})`;
}

/** Straight-line distance in OKLab, which is the point of OKLab. */
function distance(a: Oklab, b: Oklab): number {
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}

/** Shortest way round the hue circle, in degrees. */
function hueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

// =============================================================================
// Extraction
// =============================================================================

/** Below this a pixel is a soft edge or a transparent corner, not colour. */
const MIN_ALPHA = 128;

/** Paper white and ink black are the page, not the picture. */
const MIN_LIGHTNESS = 0.12;
const MAX_LIGHTNESS = 0.95;

/** Bits per channel kept when collapsing pixels to distinct colours. */
const QUANTIZE_BITS = 5;

/** Clusters to fit. More than anyone needs, so the best can be chosen. */
const CLUSTERS = 6;
const ITERATIONS = 12;

/**
 * How much more a vivid pixel counts than a dull one when clusters are placed
 * and ranked. A card is mostly border, backdrop and rule lines; without this
 * the answer to "what colour is this card" is always beige.
 */
const CHROMA_PULL = 6;

/** Population matters, but sub-linearly — see `CHROMA_PULL`. */
const POPULATION_EXPONENT = 0.85;

interface Sample {
  lab: Oklab;
  lch: Oklch;
  weight: number;
}

export interface ExtractOptions {
  /** How many colours to return, most striking first. */
  count?: number;
}

/**
 * Collapse the image to its distinct colours. Sampling every pixel through
 * k-means would be wasteful when a sprite is a few dozen colours repeated;
 * this is the same information at a fraction of the size.
 */
function toSamples(pixels: Uint8ClampedArray): Sample[] {
  const shift = 8 - QUANTIZE_BITS;
  const buckets = new Map<
    number,
    { n: number; r: number; g: number; b: number }
  >();

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < MIN_ALPHA) continue;

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key =
      ((r >> shift) << (QUANTIZE_BITS * 2)) |
      ((g >> shift) << QUANTIZE_BITS) |
      (b >> shift);

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.n += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { n: 1, r, g, b });
    }
  }

  const samples: Sample[] = [];
  for (const bucket of buckets.values()) {
    const lab = rgbToOklab({
      r: bucket.r / bucket.n,
      g: bucket.g / bucket.n,
      b: bucket.b / bucket.n,
    });
    if (lab.L < MIN_LIGHTNESS || lab.L > MAX_LIGHTNESS) continue;
    const lch = oklabToOklch(lab);
    samples.push({ lab, lch, weight: bucket.n * (1 + CHROMA_PULL * lch.C) });
  }

  return samples;
}

/**
 * Seeds without randomness: the heaviest colour first, then whichever colour
 * is furthest from everything chosen so far. Farthest-point seeding spreads
 * the clusters across the image's actual range instead of dropping them all
 * inside its largest blob — and the same image always gives the same palette,
 * which random seeding cannot promise.
 */
function seedCentroids(samples: Sample[], k: number): Oklab[] {
  const first = samples.reduce((best, sample) =>
    sample.weight > best.weight ? sample : best,
  );
  const centroids: Oklab[] = [first.lab];

  while (centroids.length < k) {
    let furthest: Sample | null = null;
    let furthestScore = -1;

    for (const sample of samples) {
      let nearest = Number.POSITIVE_INFINITY;
      for (const centroid of centroids) {
        nearest = Math.min(nearest, distance(sample.lab, centroid));
      }
      const score = nearest * nearest * sample.weight;
      if (score > furthestScore) {
        furthestScore = score;
        furthest = sample;
      }
    }

    if (!furthest || furthestScore <= 0) break;
    centroids.push(furthest.lab);
  }

  return centroids;
}

/**
 * The colours an image is actually made of, most striking first.
 *
 * Weighted k-means in OKLab: every distinct colour is pulled to the nearest of
 * a handful of centroids, the centroids move to the middle of what they caught,
 * and it settles. Unlike a fixed histogram grid — where one hue can be split
 * across two cells and lose to a colour half its size — the boundaries land
 * where the image actually separates.
 */
export function extractPalette(
  pixels: Uint8ClampedArray,
  options: ExtractOptions = {},
): Oklch[] {
  const count = options.count ?? 4;
  const samples = toSamples(pixels);
  if (samples.length === 0) return [];

  const k = Math.min(CLUSTERS, samples.length);
  let centroids = seedCentroids(samples, k);

  const assignment = new Array<number>(samples.length).fill(0);
  for (let pass = 0; pass < ITERATIONS; pass++) {
    let moved = false;

    for (let i = 0; i < samples.length; i++) {
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let c = 0; c < centroids.length; c++) {
        const d = distance(samples[i].lab, centroids[c]);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = c;
        }
      }
      if (assignment[i] !== nearest) {
        assignment[i] = nearest;
        moved = true;
      }
    }

    const sums = centroids.map(() => ({ L: 0, a: 0, b: 0, weight: 0 }));
    for (let i = 0; i < samples.length; i++) {
      const sum = sums[assignment[i]];
      const { lab, weight } = samples[i];
      sum.L += lab.L * weight;
      sum.a += lab.a * weight;
      sum.b += lab.b * weight;
      sum.weight += weight;
    }

    centroids = centroids.map((centroid, index) => {
      const sum = sums[index];
      if (sum.weight === 0) return centroid;
      return {
        L: sum.L / sum.weight,
        a: sum.a / sum.weight,
        b: sum.b / sum.weight,
      };
    });

    // Settled — every colour kept the centroid it had.
    if (!moved && pass > 0) break;
  }

  const weights = centroids.map(() => 0);
  for (let i = 0; i < samples.length; i++) {
    weights[assignment[i]] += samples[i].weight;
  }

  const ranked = centroids
    .map((lab, index) => {
      const lch = oklabToOklch(lab);
      return {
        lch,
        // How much of the image it covers, tempered, times how much of a
        // colour it is. The second term is what lets a card's artwork beat
        // the four-fifths of it that is border and rule lines.
        score:
          weights[index] ** POPULATION_EXPONENT * (0.35 + CHROMA_PULL * lch.C),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  // Three shades of one red is one red. A pick has to differ from the ones
  // before it in hue or in lightness to be worth a slot in the wash.
  const picked: Oklch[] = [];
  for (const { lch } of ranked) {
    const redundant = picked.some((chosen) => {
      const bothGrey = chosen.C < 0.03 && lch.C < 0.03;
      const sameHue = bothGrey || hueDistance(chosen.h, lch.h) < 20;
      return sameHue && Math.abs(chosen.L - lch.L) < 0.14;
    });
    if (redundant) continue;
    picked.push(lch);
    if (picked.length === count) break;
  }

  return picked;
}

// =============================================================================
// Turning colours into a backdrop
// =============================================================================

/**
 * Where a backdrop colour is allowed to sit. Lightness is pinned into a narrow
 * band so the same wash carries on white and on near-black without being
 * recomputed per theme — in OKLab that costs nothing, because moving L does
 * not drag the hue with it the way it does in HSL.
 */
const AMBIENT_MIN_L = 0.6;
const AMBIENT_MAX_L = 0.76;

/** Chroma floor and ceiling. The floor is the whole point: nothing is beige. */
const AMBIENT_MIN_C = 0.15;
const AMBIENT_MAX_C = 0.31;
const CHROMA_GAIN = 1.75;

/** Under this a colour has no hue worth trusting, only noise. */
const GREY_THRESHOLD = 0.02;

/**
 * Push a colour to where it can carry a page. Chroma is raised hard, because
 * an accurate average of an image is always duller than the image looked —
 * averaging colours cancels them out, and the memory of a card is its brightest
 * few inches, not its arithmetic mean.
 *
 * True greys are left alone. Saturating a colour that has no hue only amplifies
 * whichever pixel happened to break the tie.
 */
export function vivify(color: Oklch): Oklch {
  if (color.C < GREY_THRESHOLD) {
    return { ...color, L: clamp(color.L, AMBIENT_MIN_L, AMBIENT_MAX_L) };
  }
  return {
    L: clamp(color.L, AMBIENT_MIN_L, AMBIENT_MAX_L),
    C: clamp(color.C * CHROMA_GAIN, AMBIENT_MIN_C, AMBIENT_MAX_C),
    h: color.h,
  };
}

function toOklch(value: Oklch | string): Oklch | null {
  return typeof value === "string" ? hexToOklch(value) : value;
}

/**
 * A mesh wants four colours. One is a flat panel and two is a fade; four is
 * what makes it read as light in a room. When an image yields fewer, the rest
 * are struck from the ones it did yield — walking the hue circle rather than
 * repeating, so a one-colour sprite still gets a wash with somewhere to go.
 */
export function toAmbientColors(
  colors: Array<Oklch | string>,
  count = 4,
): string[] {
  const seeds = colors
    .map(toOklch)
    .filter((color): color is Oklch => color !== null)
    .slice(0, count)
    .map(vivify);

  if (seeds.length === 0) return [];

  const HUE_STEPS = [28, -34, 56];
  const LIGHTNESS_STEPS = [0.05, -0.05, 0.03];

  const struck = seeds.length;
  while (seeds.length < count) {
    const step = seeds.length - struck;
    const source = seeds[step % struck];
    seeds.push(
      vivify({
        L: source.L + LIGHTNESS_STEPS[step % LIGHTNESS_STEPS.length],
        C: source.C,
        h: source.h + HUE_STEPS[step % HUE_STEPS.length],
      }),
    );
  }

  return seeds.map(formatOklch);
}

// =============================================================================
// Fetching the pixels
// =============================================================================

/** A width Next's image optimizer serves without extra configuration. */
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
