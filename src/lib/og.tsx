import type { ReactNode } from "react";

/**
 * Shared chrome for every generated Open Graph image.
 *
 * The app itself is a zero-radius, monospace, black-on-white (and white-on-black)
 * terminal, so the social cards use the same vocabulary: `.dark` palette from
 * `globals.css`, hairline rules instead of shadows, square corners everywhere,
 * and JetBrains Mono — the font `layout.tsx` loads for the site.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const OG_FONT_FAMILY = "JetBrains Mono";

/** Mirrors the `.dark` custom properties in `globals.css`. */
export const OG_COLORS = {
  background: "#0a0a0a",
  surface: "#141414",
  foreground: "#e0e0e0",
  muted: "#888888",
  border: "#333333",
  grid: "#1a1a1a",
  /** `viewport.themeColor` — the one non-neutral colour the brand uses. */
  accent: "#e53935",
} as const;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  style: "normal";
  weight: 400 | 700;
};

let fontsPromise: Promise<OgFont[]> | null = null;

async function fetchFonts(): Promise<OgFont[]> {
  // No User-Agent header on purpose: Google Fonts serves TTF to unknown agents
  // and WOFF2 to modern ones, and Satori can only parse the former.
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700",
  ).then((res) => res.text());

  // One `@font-face` per weight, and — for some agents — per unicode range, so
  // read each block on its own and keep the first URL seen for a given weight.
  const urlByWeight = new Map<400 | 700, string>();
  for (const block of css.split("@font-face")) {
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
    const url = block.match(/url\((https:\/\/[^)]+?\.ttf)\)/)?.[1];
    if (!(weight && url)) continue;
    const key = Number(weight) === 700 ? 700 : 400;
    if (!urlByWeight.has(key)) urlByWeight.set(key, url);
  }

  return Promise.all(
    [...urlByWeight].map(async ([weight, url]) => ({
      name: OG_FONT_FAMILY,
      data: await fetch(url).then((res) => res.arrayBuffer()),
      style: "normal" as const,
      weight,
    })),
  );
}

/**
 * Loads the two weights the cards use, once per process — `generateStaticParams`
 * renders a card per species at build time, so this must not refetch per image.
 * A failure degrades to Satori's bundled font rather than failing the build.
 */
function loadOgFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    fontsPromise = fetchFonts().catch(() => {
      fontsPromise = null;
      return [];
    });
  }
  return fontsPromise;
}

/**
 * Options for `new ImageResponse(...)`. `fonts` is omitted entirely when the
 * download failed, because Satori throws on an empty font list.
 */
export async function ogImageOptions() {
  const fonts = await loadOgFonts();
  return { ...OG_SIZE, ...(fonts.length > 0 ? { fonts } : {}) };
}

/** The NationalDex mark, matching `public/icons/logo-app.svg`. */
export function DexMark({
  size = 64,
  id = "shell",
}: {
  size?: number;
  id?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <title>NationalDex</title>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5a55" />
          <stop offset="1" stopColor="#c9272c" />
        </linearGradient>
      </defs>
      <rect x="7" y="5" width="50" height="54" rx="10" fill={`url(#${id})`} />
      <path
        d="M7 31h50v18a10 10 0 0 1-10 10H17A10 10 0 0 1 7 49Z"
        fill="#a82026"
        opacity=".8"
      />
      <rect x="14" y="25" width="36" height="24" rx="3" fill="#111418" />
      <rect x="18" y="29" width="28" height="16" rx="1" fill="#f6f7f8" />
      <path
        d="M21 33h8M21 37h14M21 41h6"
        stroke="#aeb5bc"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <circle cx="38" cy="12" r="3" fill="#5fd7ff" />
      <circle cx="46" cy="12" r="2" fill="#ffe24a" />
      <circle cx="51" cy="16" r="2" fill="#78d64b" />
      <path d="M12 20h40" stroke="#8e1b20" strokeWidth="2" opacity=".8" />
      <path
        d="M14 8h18"
        stroke="#ffaaa6"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".7"
      />
    </svg>
  );
}

/** A squared-off label — the card equivalent of the app's `Badge`. */
export function OgChip({
  label,
  color = OG_COLORS.foreground,
  background = "transparent",
  border = OG_COLORS.border,
  fontSize = 18,
}: {
  label: string;
  color?: string;
  background?: string;
  border?: string;
  fontSize?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 14px",
        color,
        background,
        border: `1px solid ${border}`,
        fontSize,
        fontWeight: 700,
        letterSpacing: "1px",
      }}
    >
      {label}
    </div>
  );
}

/**
 * The frame every card shares: grid backdrop, hairline border, a header with the
 * mark and a route-specific tag, and a footer rule.
 */
export function OgShell({
  tag,
  children,
  footer,
}: {
  tag: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: OG_COLORS.background,
        color: OG_COLORS.foreground,
        fontFamily: OG_FONT_FAMILY,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          display: "flex",
          backgroundImage: `linear-gradient(${OG_COLORS.grid} 1px, transparent 1px), linear-gradient(90deg, ${OG_COLORS.grid} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      {/* The accent rail is the only colour in the chrome. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 10,
          display: "flex",
          background: OG_COLORS.accent,
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "36px 48px 32px 58px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 18,
            borderBottom: `1px solid ${OG_COLORS.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <DexMark size={40} id="mark-header" />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>
              NationalDex.app
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: "3px",
              color: OG_COLORS.muted,
            }}
          >
            {tag}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: 26,
            paddingBottom: 22,
          }}
        >
          {children}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 18,
            borderTop: `1px solid ${OG_COLORS.border}`,
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
