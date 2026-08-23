import { ImageResponse } from "next/og";
import {
  DexMark,
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgChip,
  ogImageOptions,
  OgShell,
} from "@/lib/og";

export const alt = "NationalDex — every generation, indexed";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const SECTIONS = ["STATS", "MOVES", "ABILITIES", "ITEMS", "TEAMS", "TCG"];

export default async function Image() {
  return new ImageResponse(
    <OgShell
      tag="NATIONAL POKÉDEX / 001—1025"
      footer={
        <>
          <div style={{ display: "flex", gap: 10 }}>
            {SECTIONS.map((label) => (
              <OgChip key={label} label={label} fontSize={16} />
            ))}
          </div>
          <div
            style={{ display: "flex", fontSize: 18, color: OG_COLORS.muted }}
          >
            nationaldex.app
          </div>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "4px",
              color: OG_COLORS.accent,
              marginBottom: 18,
            }}
          >
            THE COMPLETE POKÉDEX
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-3px",
              lineHeight: 1.05,
            }}
          >
            <div style={{ display: "flex" }}>EVERY</div>
            <div style={{ display: "flex" }}>GENERATION,</div>
            <div style={{ display: "flex", color: OG_COLORS.accent }}>
              INDEXED.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 20,
              lineHeight: 1.5,
              color: OG_COLORS.muted,
            }}
          >
            Stats, moves, abilities, items, type matchups, teams, and cards —
            every generation in one field guide.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 300,
            height: 300,
            background: OG_COLORS.surface,
            border: `1px solid ${OG_COLORS.border}`,
          }}
        >
          <DexMark size={200} id="mark-hero" />
        </div>
      </div>
    </OgShell>,
    await ogImageOptions(),
  );
}
