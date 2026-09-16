import { ImageResponse } from "next/og";
import { fallbackImage, OG_SIZE, OgBrand } from "@/lib/og";
import { getSharedDeck } from "@/lib/server/decks";
import { deckFormat } from "@/types/deck";

export const alt = "A shared Pokémon TCG deck";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const shared = await getSharedDeck(slug);
    if (!shared) {
      return fallbackImage("Deck not found");
    }

    const { deck } = shared;
    const cardCount = deck.entries.reduce((sum, entry) => sum + entry.count, 0);
    const format = deckFormat(deck.formatId);

    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 72px",
          backgroundColor: "#000000",
          color: "#fff",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {format.name} deck
        </span>
        <span
          style={{
            marginTop: "20px",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {deck.name}
        </span>
        <span
          style={{
            marginTop: "32px",
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {cardCount}/{format.deckSize} cards
        </span>
        <OgBrand />
      </div>,
      { ...OG_SIZE },
    );
  } catch {
    return fallbackImage("Deck not found");
  }
}
