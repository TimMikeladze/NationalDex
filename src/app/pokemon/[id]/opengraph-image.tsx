import { ImageResponse } from "@vercel/og";
import { getAllSpecies, getSpecies, toID } from "@/lib/pkmn";
import { pokemonDbSlug } from "@/lib/sprites";
import { type PokemonType, TYPE_COLORS } from "@/types/pokemon";

export const alt = "Pokémon stats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const species = getAllSpecies(9, { includeFormes: true });
  return species.map((s) => ({ id: toID(s.name) }));
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spa: "SPA",
  spd: "SPD",
  spe: "SPE",
};

const STAT_ORDER = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const MAX_STAT = 255;

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const species = getSpecies(id);

  if (!species) {
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
        Pokémon not found
      </div>,
      { ...size },
    );
  }

  const name = species.name;
  const dexNum = species.num;
  const types = [species.types[0], species.types[1]].filter(
    Boolean,
  ) as string[];
  const primaryType = types[0] as PokemonType;
  const typeColor = TYPE_COLORS[primaryType] ?? "#6D6C54";

  const stats: { key: string; value: number }[] = STAT_ORDER.map((key) => ({
    key,
    value: species.baseStats[key] ?? 0,
  }));
  const bst = stats.reduce((sum, s) => sum + s.value, 0);

  // Build sprite URL (PokemonDB Home sprites)
  const slug = pokemonDbSlug(name);
  const spriteUrl = `https://img.pokemondb.net/sprites/home/normal/${slug}.png`;

  // Fetch sprite as base64 for embedding
  let spriteBase64: string | null = null;
  try {
    const res = await fetch(spriteUrl);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      spriteBase64 = `data:image/png;base64,${base64}`;
    }
  } catch {
    // Sprite fetch failed — render without it
  }

  // Darken a hex color for gradient
  function darken(hex: string, amount: number): string {
    const r = Math.max(0, Number.parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, Number.parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, Number.parseInt(hex.slice(5, 7), 16) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 56px",
        background: `linear-gradient(135deg, ${darken(typeColor, 80)} 0%, ${darken(typeColor, 140)} 100%)`,
        color: "#fff",
        fontFamily: "monospace",
        position: "relative",
      }}
    >
      {/* Top section: sprite + name + types */}
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        {/* Sprite */}
        {spriteBase64 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "200px",
              height: "200px",
              borderRadius: "24px",
              backgroundColor: "rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: ImageResponse uses raw HTML, not React components */}
            <img
              src={spriteBase64}
              width={160}
              height={160}
              alt=""
              style={{ objectFit: "contain" }}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "200px",
              height: "200px",
              borderRadius: "24px",
              backgroundColor: "rgba(255,255,255,0.08)",
              flexShrink: 0,
              fontSize: "64px",
            }}
          >
            ?
          </div>
        )}

        {/* Name + types */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "56px", fontWeight: 700 }}>{name}</span>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 400,
                opacity: 0.6,
              }}
            >
              #{String(dexNum).padStart(3, "0")}
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {types.map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 20px",
                  borderRadius: "9999px",
                  backgroundColor:
                    TYPE_COLORS[t as PokemonType] ?? "rgba(255,255,255,0.2)",
                  fontSize: "22px",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginTop: "36px",
          flex: 1,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "20px",
                fontWeight: 600,
                width: "48px",
                textAlign: "right",
                opacity: 0.8,
              }}
            >
              {STAT_LABELS[s.key]}
            </span>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 700,
                width: "44px",
                textAlign: "right",
              }}
            >
              {s.value}
            </span>
            {/* Bar background */}
            <div
              style={{
                display: "flex",
                flex: 1,
                height: "20px",
                borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.12)",
                overflow: "hidden",
              }}
            >
              {/* Bar fill */}
              <div
                style={{
                  width: `${(s.value / MAX_STAT) * 100}%`,
                  height: "100%",
                  borderRadius: "10px",
                  backgroundColor: typeColor,
                }}
              />
            </div>
          </div>
        ))}

        {/* BST */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "4px",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              fontWeight: 600,
              width: "48px",
              textAlign: "right",
              opacity: 0.8,
            }}
          >
            BST
          </span>
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              width: "44px",
              textAlign: "right",
            }}
          >
            {bst}
          </span>
        </div>
      </div>

      {/* Branding */}
      <div
        style={{
          position: "absolute",
          bottom: "32px",
          right: "48px",
          fontSize: "22px",
          fontWeight: 600,
          opacity: 0.4,
        }}
      >
        nationaldex
      </div>
    </div>,
    { ...size },
  );
}
