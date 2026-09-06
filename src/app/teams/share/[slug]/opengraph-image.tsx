import { ImageResponse } from "next/og";
import { fallbackImage, OG_SIZE, OgBrand } from "@/lib/og";
import { getSharedTeam } from "@/lib/server/teams";
import { generationName } from "@/types/team";

export const alt = "A shared Pokémon team on NationalDex";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const shared = await getSharedTeam(slug);
    if (!shared) {
      return fallbackImage("Team not found");
    }

    const { team } = shared;
    const { members } = team;

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
          SHARED TEAM
        </span>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            marginTop: "24px",
            maxWidth: "1000px",
          }}
        >
          {team.name}
        </span>
        <span style={{ fontSize: 28, opacity: 0.6, marginTop: "16px" }}>
          {generationName(team.generation)} • {members.length}/6 pokemon
        </span>
        {members.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "40px",
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "1000px",
            }}
          >
            {members.slice(0, 6).map((member, index) => (
              <div
                key={`${member.id}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "140px",
                  height: "140px",
                  borderRadius: "20px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "2px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* biome-ignore lint/performance/noImgElement: ImageResponse uses raw HTML */}
                <img
                  src={member.sprite}
                  width={100}
                  height={100}
                  alt=""
                  style={{ objectFit: "contain", imageRendering: "pixelated" }}
                />
              </div>
            ))}
          </div>
        )}
        <OgBrand />
      </div>,
      { ...OG_SIZE },
    );
  } catch {
    return fallbackImage("Team not found");
  }
}
