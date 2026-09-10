/**
 * Shared building blocks for every route's opengraph-image.tsx, so the
 * homepage and per-Pokémon cards read as the same product instead of two
 * different ones. Values mirror the app's actual dark theme (see
 * `globals.css` `.dark`) rather than inventing an OG-only palette.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties, ReactNode } from "react";
import { ONE_WEEK_SECONDS } from "@/lib/utils";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG_BG = "#0a0a0a";
export const OG_CARD = "#1a1a1a";
export const OG_FG = "#e0e0e0";
export const OG_BORDER = "#333333";
export const OG_MUTED = "#888888";
export const OG_ACCENT = "#ff3333";

const FONT_FAMILY = "JetBrains Mono";

/**
 * Every face the images may declare. Any `fontWeight` / `fontStyle` used in
 * an OG image must be one of these, or Satori silently substitutes the
 * nearest loaded face and the styles stop describing what renders.
 */
const FONT_FACES = [
  { style: "normal", weight: 400 },
  { style: "normal", weight: 700 },
  { style: "italic", weight: 400 },
] as const;

/**
 * Google's CSS endpoint for exactly those faces. Resolving the TTF URLs
 * through it, instead of pinning the hashed file names, means a font version
 * bump on Google's side can't break the fetch.
 */
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,700;1,400";

/** Upper bound on any single upstream fetch an OG image waits on. */
const OG_FETCH_TIMEOUT_MS = 5000;

/** The canonical brand artwork every other brand asset is rendered from. */
const LOGO_PATH = join(process.cwd(), "public", "icons", "logo-app.svg");

/**
 * `fetch` options for remote assets (fonts, sprites) an OG image embeds: a
 * bounded timeout so a slow upstream degrades to the fallback rendering
 * instead of stalling the whole response, and Next's data cache so repeat
 * renders don't hit the network again. Call it per request — an
 * `AbortSignal` is single-use and its timer starts on creation.
 */
export function ogFetchInit(): RequestInit {
  return {
    signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
    next: { revalidate: ONE_WEEK_SECONDS },
  };
}

type FontFace = (typeof FONT_FACES)[number];

export type OgFont = FontFace & {
  name: typeof FONT_FAMILY;
  data: ArrayBuffer;
};

function faceKey(face: FontFace): string {
  return `${face.style}-${face.weight}`;
}

const FONT_FACE_BLOCK = /@font-face\s*{([^}]*)}/g;
const FONT_FACE_STYLE = /font-style:\s*(normal|italic)/;
const FONT_FACE_WEIGHT = /font-weight:\s*(\d+)/;
const FONT_FACE_SRC =
  /src:\s*url\(([^)]+)\)\s*format\(['"](?:truetype|opentype)['"]\)/;

/** Each `@font-face` block's TTF URL in Google's CSS, keyed by face. */
function parseFontFaceUrls(css: string): Map<string, string> {
  const urls = new Map<string, string>();
  for (const [, block] of css.matchAll(FONT_FACE_BLOCK)) {
    const style = FONT_FACE_STYLE.exec(block)?.[1];
    const weight = FONT_FACE_WEIGHT.exec(block)?.[1];
    const url = FONT_FACE_SRC.exec(block)?.[1];
    if (style && weight && url) urls.set(`${style}-${weight}`, url);
  }
  return urls;
}

async function fetchOgFonts(): Promise<OgFont[]> {
  let urls: Map<string, string>;
  try {
    const res = await fetch(FONT_CSS_URL, ogFetchInit());
    if (!res.ok) return [];
    urls = parseFontFaceUrls(await res.text());
  } catch {
    return [];
  }

  const faces = await Promise.all(
    FONT_FACES.map(async (face): Promise<OgFont | null> => {
      const url = urls.get(faceKey(face));
      if (!url) return null;
      try {
        const res = await fetch(url, ogFetchInit());
        if (!res.ok) return null;
        return { ...face, name: FONT_FAMILY, data: await res.arrayBuffer() };
      } catch {
        return null;
      }
    }),
  );
  return faces.filter((face): face is OgFont => face !== null);
}

let fontsPromise: Promise<OgFont[] | null> | null = null;

/**
 * Fetches the OG faces once per server instance and reuses them. Only a
 * complete set is memoized: a partial or failed fetch is served to the
 * callers already waiting on it and then forgotten, so the next render
 * retries instead of the instance being stuck without a face for its
 * lifetime. Resolves to `null` when nothing loaded, which tells `next/og` to
 * fall back to its bundled font instead of throwing for want of one.
 */
function loadOgFonts(): Promise<OgFont[] | null> {
  if (!fontsPromise) {
    fontsPromise = fetchOgFonts().then((fonts) => {
      if (fonts.length !== FONT_FACES.length) fontsPromise = null;
      return fonts.length > 0 ? fonts : null;
    });
  }
  return fontsPromise;
}

let markPromise: Promise<string | null> | null = null;

/**
 * The brand mark as a data URI Satori can draw with `<img>`, read once per
 * instance from the same SVG `scripts/generate-icons.ts` renders the icons
 * from. Resolves to `null` if the file can't be read, so a missing logo costs
 * the mark and not the whole image.
 */
function loadDexMark(): Promise<string | null> {
  if (!markPromise) {
    markPromise = readFile(LOGO_PATH)
      .then((svg) => `data:image/svg+xml;base64,${svg.toString("base64")}`)
      .catch(() => null);
  }
  return markPromise;
}

export type OgAssets = {
  fonts: OgFont[] | null;
  mark: string | null;
};

/** Everything an OG image needs to have in hand before it renders. */
export async function loadOgAssets(): Promise<OgAssets> {
  const [fonts, mark] = await Promise.all([loadOgFonts(), loadDexMark()]);
  return { fonts, mark };
}

/**
 * `ImageResponse` options: the shared size plus whichever faces loaded.
 * Leaving `fonts` undefined (never `[]`) is what lets `next/og` substitute
 * its default font when none did.
 */
export function ogImageOptions(fonts: OgFont[] | null) {
  return { ...OG_SIZE, fonts: fonts ?? undefined };
}

/**
 * The dotted grid and right-edge accent stripe behind every OG image. Render
 * it as the first child of a `position: relative` root so the content that
 * follows paints over it.
 */
export function OgBackdrop() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        display: "flex",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          opacity: 0.5,
          backgroundImage: `linear-gradient(${OG_BORDER} 1px, transparent 1px), linear-gradient(90deg, ${OG_BORDER} 1px, transparent 1px)`,
          backgroundSize: "42px 42px",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 18,
          height: "100%",
          background: OG_ACCENT,
          display: "flex",
        }}
      />
    </div>
  );
}

/**
 * Root of every OG image: fills the canvas, paints the theme colours and the
 * shared backdrop, and is the positioning context the content paints over.
 * `style` adjusts how the children lay out (direction, padding).
 */
export function OgFrame({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        color: OG_FG,
        fontFamily: FONT_FAMILY,
        background: OG_BG,
        ...style,
      }}
    >
      <OgBackdrop />
      {children}
    </div>
  );
}

/** The app's brand mark, from `loadOgAssets().mark`. Draws nothing without it. */
export function DexMark({
  src,
  size = 224,
}: {
  src: string | null;
  size?: number;
}) {
  if (!src) return null;
  // biome-ignore lint/performance/noImgElement: ImageResponse uses raw HTML
  return <img src={src} width={size} height={size} alt="" />;
}

export function OgFooter({
  mark,
  style,
}: {
  mark: string | null;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        ...style,
      }}
    >
      <DexMark src={mark} size={22} />
      <div style={{ fontSize: 18, color: OG_MUTED }}>nationaldex.app</div>
    </div>
  );
}
