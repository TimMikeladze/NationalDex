import { ImageResponse } from "next/og";
import { fallbackImage, OG_SIZE, OgBrand } from "@/lib/og";
import { getSharedList } from "@/lib/server/lists";

export const alt = "A shared Pokémon list on NationalDex";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const shared = await getSharedList(slug);
    if (!shared) {
      return fallbackImage("List not found");
    }

    const { list } = shared;
    const count = list.items.length;

    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px",
          backgroundColor: "#000000",
          color: "#fff",
          fontFamily: "monospace",
          textAlign: "center",
          position: "relative",
        }}
      >
        <span style={{ fontSize: 24, opacity: 0.5, letterSpacing: "2px" }}>
          SHARED LIST
        </span>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            marginTop: "24px",
            maxWidth: "1000px",
          }}
        >
          {list.name}
        </span>
        <span style={{ fontSize: 28, opacity: 0.6, marginTop: "20px" }}>
          {count} {count === 1 ? "item" : "items"}
        </span>
        <OgBrand />
      </div>,
      { ...OG_SIZE },
    );
  } catch {
    return fallbackImage("List not found");
  }
}
