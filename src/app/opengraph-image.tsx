import { ImageResponse } from "next/og";
import {
  DexMark,
  loadOgAssets,
  OG_ACCENT,
  OG_BORDER,
  OG_CARD,
  OG_CONTENT_TYPE,
  OG_FG,
  OG_MUTED,
  OG_SIZE,
  OgFooter,
  OgFrame,
  ogImageOptions,
} from "./og-shared";

export const alt = "NationalDex — every generation, indexed";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const { fonts, mark } = await loadOgAssets();

  return new ImageResponse(
    <OgFrame>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          padding: "56px 86px 50px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <DexMark src={mark} size={48} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-1px" }}
            >
              NationalDex.app
            </div>
            <div
              style={{ fontSize: 12, color: OG_MUTED, letterSpacing: "2px" }}
            >
              FIELD GUIDE / 001—1025
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ width: 650, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 18,
                color: OG_ACCENT,
                fontWeight: 700,
                letterSpacing: "3px",
                marginBottom: 18,
              }}
            >
              THE COMPLETE
            </div>
            <div
              style={{
                fontSize: 70,
                lineHeight: 1.01,
                fontWeight: 700,
                letterSpacing: "-5px",
              }}
            >
              Pokédex,
            </div>
            <div
              style={{
                fontSize: 70,
                lineHeight: 1.01,
                fontWeight: 700,
                letterSpacing: "-5px",
              }}
            >
              indexed.
            </div>
            <div
              style={{
                fontSize: 20,
                color: OG_MUTED,
                marginTop: 22,
                display: "flex",
              }}
            >
              Stats, moves, teams, cards, and every generation — in one focused
              field guide.
            </div>
          </div>

          <div
            style={{
              width: 270,
              height: 270,
              marginRight: 52,
              marginBottom: -8,
              padding: 23,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: OG_CARD,
              border: `1px solid ${OG_BORDER}`,
            }}
          >
            <DexMark src={mark} size={224} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[
            ["STATS", false],
            ["TEAMS", false],
            ["CARDS", false],
            ["ALL GENERATIONS", true],
          ].map(([label, accented]) => (
            <div
              key={label as string}
              style={{
                display: "flex",
                padding: "9px 14px",
                color: accented ? OG_ACCENT : OG_FG,
                background: accented ? `${OG_ACCENT}1a` : OG_CARD,
                border: `1px solid ${accented ? OG_ACCENT : OG_BORDER}`,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              {label}
            </div>
          ))}
          <OgFooter mark={mark} style={{ marginLeft: "auto" }} />
        </div>
      </div>
    </OgFrame>,
    ogImageOptions(fonts),
  );
}
