import { ImageResponse } from "next/og";
import { DexMark } from "@/components/brand/dex-mark";
import { SURFACE } from "@/lib/pwa-assets";

// iOS ignores manifest icons and rounds this one's corners itself, so the mark
// sits on an opaque plate with only a little room around it.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: SURFACE.dark,
      }}
    >
      <DexMark size={148} />
    </div>,
    size,
  );
}
