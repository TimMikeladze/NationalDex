import { ImageResponse } from "next/og";
import { DexMark } from "@/components/brand/dex-mark";
import {
  parseSplashSpec,
  SPLASH_SPECS,
  SURFACE,
  splashSpec,
} from "@/lib/pwa-assets";

// iOS launch images. One per device and scheme in `SPLASH_DEVICES`, rendered
// at build; any other spec is a 404 rather than a render of whatever size was
// asked for.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SPLASH_SPECS.map((spec) => ({ spec: splashSpec(spec) }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ spec: string }> },
) {
  const parsed = parseSplashSpec((await params).spec);
  if (!parsed) return new Response("Not found", { status: 404 });
  const { width, height, scheme } = parsed;

  // The same mark the in-app loading screen shows, at the same place, so the
  // hand-off from the splash to the page is not a jump.
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: SURFACE[scheme],
      }}
    >
      <DexMark size={Math.round(Math.min(width, height) * 0.22)} />
    </div>,
    { width, height },
  );
}
