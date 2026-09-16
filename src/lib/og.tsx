import { ImageResponse } from "next/og";

/** The one size every OG image on the site renders at. */
export const OG_SIZE = { width: 1200, height: 630 };

/** The image for a share link whose row is gone, private, or failed to load. */
export function fallbackImage(message: string) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b",
        color: "#fff",
        fontSize: 48,
        fontFamily: "monospace",
      }}
    >
      {message}
    </div>,
    { ...OG_SIZE },
  );
}

/** The site name in the bottom-right corner; the parent must be `position: relative`. */
export function OgBrand() {
  return (
    <span
      style={{
        position: "absolute",
        bottom: "32px",
        right: "48px",
        fontSize: "22px",
        fontWeight: 600,
        opacity: 0.35,
      }}
    >
      nationaldex.app
    </span>
  );
}
