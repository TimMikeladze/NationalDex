/**
 * Everything the installed app is launched with: its icons and the iOS splash
 * screens. Plain data, shared by the routes that render them, the manifest,
 * and the root layout's `startupImage` list.
 */

/** The two surfaces the app paints — `--background` in `:root` and `.dark`. */
export const SURFACE = {
  light: "#ffffff",
  dark: "#0a0a0a",
} as const;

export type Scheme = keyof typeof SURFACE;

/**
 * Icon variants served by `/pwa-icon/[variant]`. `mark` is how much of the
 * square the glyph takes: a maskable icon only keeps the middle 80% once a
 * launcher crops it, so its glyph sits at half the size on an opaque plate.
 */
export const ICON_VARIANTS = {
  "192": { size: 192, mark: 1, purpose: "any" },
  "512": { size: 512, mark: 1, purpose: "any" },
  "maskable-512": { size: 512, mark: 0.5, purpose: "maskable" },
} as const;

export type IconVariant = keyof typeof ICON_VARIANTS;

export const iconPath = (variant: IconVariant) => `/pwa-icon/${variant}`;

/**
 * Portrait `[cssWidth, cssHeight, devicePixelRatio]` of every current iPhone
 * and iPad. iOS only uses a `startupImage` whose media query matches the
 * device exactly; anything missing launches on a white flash instead.
 */
export const SPLASH_DEVICES: readonly (readonly [number, number, number])[] = [
  // iPhone
  [440, 956, 3], // 16/17 Pro Max
  [420, 912, 3], // Air
  [402, 874, 3], // 16/17 Pro, 17
  [430, 932, 3], // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14, 16e
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 8 Plus
  [375, 667, 2], // 8, SE 2/3
  // iPad
  [1032, 1376, 2], // Pro 13" (M4)
  [1024, 1366, 2], // Pro 12.9", Air 13"
  [834, 1210, 2], // Pro 11" (M4)
  [834, 1194, 2], // Pro 11"
  [820, 1180, 2], // Air 10.9"/11", iPad 10th gen
  [834, 1112, 2], // Air 10.5"
  [810, 1080, 2], // iPad 10.2"
  [744, 1133, 2], // mini 6
  [768, 1024, 2], // mini 5, iPad 9.7"
];

export type SplashSpec = { width: number; height: number; scheme: Scheme };

/** `1179x2556-dark` — the pixel size of the image and the scheme it is for. */
export const splashSpec = ({ width, height, scheme }: SplashSpec) =>
  `${width}x${height}-${scheme}`;

/** Every spec the splash route will render, light and dark per device. */
export const SPLASH_SPECS: SplashSpec[] = SPLASH_DEVICES.flatMap(
  ([w, h, dpr]) =>
    (["light", "dark"] as const).map((scheme) => ({
      width: w * dpr,
      height: h * dpr,
      scheme,
    })),
);

/**
 * Reads a spec back, and only accepts one that is in the list — the route
 * must never be talked into rendering an arbitrary size.
 */
export function parseSplashSpec(spec: string): SplashSpec | null {
  const match = /^(\d{3,4})x(\d{3,4})-(light|dark)$/.exec(spec);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  const scheme = match[3] as Scheme;
  const known = SPLASH_SPECS.some(
    (s) => s.width === width && s.height === height && s.scheme === scheme,
  );
  return known ? { width, height, scheme } : null;
}

/** The `appleWebApp.startupImage` entries for the root layout's metadata. */
export const startupImages = () =>
  SPLASH_DEVICES.flatMap(([w, h, dpr]) =>
    (["light", "dark"] as const).map((scheme) => ({
      url: `/pwa-splash/${splashSpec({ width: w * dpr, height: h * dpr, scheme })}`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${scheme})`,
    })),
  );
