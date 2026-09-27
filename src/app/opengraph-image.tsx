import { ImageResponse } from "next/og";
import { DexMark } from "@/components/brand/dex-mark";

export const runtime = "edge";

export const alt = "NationalDex — every generation, indexed";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fontData = await fetch(
    "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPQ.ttf",
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        color: "#111111",
        fontFamily: "JetBrains Mono",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          opacity: 0.48,
          backgroundImage:
            "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 610,
          height: 610,
          right: -180,
          top: -220,
          borderRadius: 999,
          background: "#dff4ff",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          left: 470,
          bottom: -250,
          borderRadius: 999,
          background: "#eee7ff",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 18,
          height: "100%",
          background: "#e53935",
          display: "flex",
        }}
      />

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
          <div
            style={{
              width: 48,
              height: 48,
              display: "flex",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 8px 20px rgba(229,57,53,0.18)",
            }}
          >
            <DexMark size={48} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-1px" }}
            >
              NationalDex.app
            </div>
            <div
              style={{ fontSize: 12, color: "#6b7280", letterSpacing: "2px" }}
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
                color: "#e53935",
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
                color: "#4b5563",
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
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(17,17,17,0.12)",
              borderRadius: 30,
              transform: "rotate(4deg)",
              boxShadow: "0 24px 55px rgba(17,17,17,0.12)",
            }}
          >
            <DexMark size={224} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[
            ["STATS", "#111111"],
            ["TEAMS", "#111111"],
            ["CARDS", "#111111"],
            ["ALL GENERATIONS", "#e53935"],
          ].map(([label, color]) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "9px 14px",
                borderRadius: 999,
                color,
                background: color === "#e53935" ? "#fff0ef" : "#ffffff",
                border: `1px solid ${color === "#e53935" ? "#ffc7c3" : "#e5e7eb"}`,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              {label}
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 14, color: "#6b7280" }}>
            nationaldex.app
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "JetBrains Mono",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
