import { ImageResponse } from "next/og";
import { getAllSpecies, getSpecies, toID } from "@/lib/pkmn";
import { pokemonDbSlug } from "@/lib/sprites";
import { type PokemonType, TYPE_COLORS } from "@/types/pokemon";

export const alt = "Pokémon stats and type information";
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

// Matches stat-bar.tsx color logic
function getStatColor(value: number): string {
  const pct = (value / MAX_STAT) * 100;
  if (pct > 75) return "#22c55e";
  if (pct > 50) return "#eab308";
  return "#ef4444";
}

// Matches pokemon-card.tsx variant logic
const VARIANT_SUFFIXES = [
  "Gmax",
  "Mega",
  "Mega-X",
  "Mega-Y",
  "Alola",
  "Galar",
  "Hisui",
  "Paldea",
];

const VARIANT_DISPLAY_NAMES: Record<string, string> = {
  Gmax: "Gigantamax",
  Mega: "Mega",
  "Mega-X": "Mega X",
  "Mega-Y": "Mega Y",
  Alola: "Alolan",
  Galar: "Galarian",
  Hisui: "Hisuian",
  Paldea: "Paldean",
};

function getVariantFromName(name: string): string | null {
  for (const suffix of VARIANT_SUFFIXES) {
    if (name.endsWith(`-${suffix}`)) return suffix;
  }
  return null;
}

function getBaseName(name: string): string {
  const variant = getVariantFromName(name);
  if (variant) return name.slice(0, -(variant.length + 1));
  return name;
}

// Matches pokemon-card.tsx region logic
type Region =
  | "Kanto"
  | "Johto"
  | "Hoenn"
  | "Sinnoh"
  | "Unova"
  | "Kalos"
  | "Alola"
  | "Galar"
  | "Paldea";

function getRegionFromDexNumber(dexNumber: number): Region | null {
  if (dexNumber >= 1 && dexNumber <= 151) return "Kanto";
  if (dexNumber >= 152 && dexNumber <= 251) return "Johto";
  if (dexNumber >= 252 && dexNumber <= 386) return "Hoenn";
  if (dexNumber >= 387 && dexNumber <= 493) return "Sinnoh";
  if (dexNumber >= 494 && dexNumber <= 649) return "Unova";
  if (dexNumber >= 650 && dexNumber <= 721) return "Kalos";
  if (dexNumber >= 722 && dexNumber <= 809) return "Alola";
  if (dexNumber >= 810 && dexNumber <= 905) return "Galar";
  if (dexNumber >= 906 && dexNumber <= 1025) return "Paldea";
  return null;
}

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
  const baseName = getBaseName(name);
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

  // Badges
  const variant = getVariantFromName(name);
  const region = getRegionFromDexNumber(dexNum);
  const badges: string[] = [];
  if (variant) badges.push(VARIANT_DISPLAY_NAMES[variant] ?? variant);
  if (region) badges.push(region);

  // Sprite
  const slug = pokemonDbSlug(name);
  const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;

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

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 56px",
        backgroundColor: "#000000",
        color: "#fff",
        fontFamily: "monospace",
        position: "relative",
      }}
    >
      {/* Top section: sprite + name + types + badges */}
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
              backgroundColor: "rgba(255,255,255,0.06)",
              border: `2px solid ${typeColor}33`,
              flexShrink: 0,
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: ImageResponse uses raw HTML */}
            <img
              src={spriteBase64}
              width={160}
              height={160}
              alt=""
              style={{ objectFit: "contain", imageRendering: "pixelated" }}
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
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "2px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
              fontSize: "64px",
              opacity: 0.3,
            }}
          >
            ?
          </div>
        )}

        {/* Name + types + badges */}
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
            <span style={{ fontSize: "56px", fontWeight: 700 }}>
              {baseName}
            </span>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 400,
                opacity: 0.5,
              }}
            >
              #{String(dexNum).padStart(3, "0")}
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
            {badges.map((badge) => (
              <div
                key={badge}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 16px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  fontSize: "20px",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {badge}
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
                opacity: 0.6,
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
                backgroundColor: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              {/* Bar fill */}
              <div
                style={{
                  width: `${(s.value / MAX_STAT) * 100}%`,
                  height: "100%",
                  borderRadius: "10px",
                  backgroundColor: getStatColor(s.value),
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
              opacity: 0.6,
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
          opacity: 0.35,
        }}
      >
        nationaldex.app
      </div>
    </div>,
    { ...size },
  );
}
