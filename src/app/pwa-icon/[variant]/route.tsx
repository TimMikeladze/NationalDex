import { ImageResponse } from "next/og";
import { DexMark } from "@/components/brand/dex-mark";
import { ICON_VARIANTS, type IconVariant, SURFACE } from "@/lib/pwa-assets";

// Rendered once at build from the app's own mark; nothing here varies per
// request.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICON_VARIANTS).map((variant) => ({ variant }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  if (!Object.hasOwn(ICON_VARIANTS, variant)) {
    return new Response("Not found", { status: 404 });
  }
  const { size, mark, purpose } = ICON_VARIANTS[variant as IconVariant];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // A maskable icon is cropped to a shape by the launcher, so it needs
        // an opaque plate to crop; a plain one keeps its own silhouette.
        background: purpose === "maskable" ? SURFACE.dark : "transparent",
      }}
    >
      <DexMark size={Math.round(size * mark)} />
    </div>,
    { width: size, height: size },
  );
}
