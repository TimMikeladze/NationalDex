import { ImageResponse } from "next/og";
import { STAT_ABBREVIATIONS, STAT_KEYS } from "@/lib/dex-pokemon";
import {
  getAllSpecies,
  getBaseName,
  getRegionFromDexNumber,
  getSpecies,
  getStatColor,
  getVariantFromName,
  toID,
  VARIANT_DISPLAY_NAMES,
} from "@/lib/pkmn";
import { getPokedexEntry } from "@/lib/pokeapi";
import { pokemonSprite } from "@/lib/sprites";
import { type PokemonType, TYPE_COLORS } from "@/types/pokemon";
import {
  DexMark,
  loadOgAssets,
  OG_BORDER,
  OG_CARD,
  OG_CONTENT_TYPE,
  OG_FG,
  OG_MUTED,
  OG_SIZE,
  OgFooter,
  OgFrame,
  ogFetchInit,
  ogImageOptions,
} from "../../og-shared";

export const alt = "Pokémon stats and type information";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  const species = getAllSpecies(9, { includeFormes: true });
  return species.map((s) => ({ id: toID(s.name) }));
}

const MAX_STAT = 255;

/** Where the brand mark sits on every per-Pokémon card. */
const FOOTER_CORNER = { position: "absolute", bottom: 32, right: 48 } as const;

/**
 * Name size that keeps the longest formes clear of the quote box. JetBrains
 * Mono advances 0.6em per glyph and the name column is about 460px wide
 * when a quote is showing, so each step keeps its bracket of names on one
 * line (the dex number may wrap under it).
 */
function nameFontSize(name: string): number {
  if (name.length <= 10) return 56;
  if (name.length <= 13) return 44;
  if (name.length <= 19) return 36;
  return 30;
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const species = getSpecies(id);

  const { fonts, mark } = await loadOgAssets();

  if (!species) {
    return new ImageResponse(
      <OgFrame>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
              padding: "56px 72px",
              backgroundColor: OG_CARD,
              border: `1px solid ${OG_BORDER}`,
            }}
          >
            <DexMark src={mark} size={64} />
            <div style={{ fontSize: 48, fontWeight: 700 }}>
              Pokémon not found
            </div>
          </div>
        </div>
        <OgFooter mark={mark} style={FOOTER_CORNER} />
      </OgFrame>,
      ogImageOptions(fonts),
    );
  }

  const name = species.name;
  const baseName = getBaseName(name);
  const dexNum = species.num;
  const types = [species.types[0], species.types[1]].filter(
    Boolean,
  ) as string[];
  const primaryType = types[0] as PokemonType;
  const typeColor = TYPE_COLORS[primaryType] ?? OG_MUTED;

  const stats = STAT_KEYS.map((key) => ({
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

  // Pokédex quote — pick the shortest unique entry that best fits the OG image
  const pokedexEntry = await getPokedexEntry(dexNum);
  let quote: string | null = null;
  if (pokedexEntry && pokedexEntry.entries.length > 0) {
    const MAX_QUOTE_LENGTH = 120;
    const uniqueTexts = [
      ...new Set(pokedexEntry.entries.map((e) => e.flavorText)),
    ].filter((t) => t.length > 0);
    // Prefer the longest entry that still fits within the limit
    const fitting = uniqueTexts
      .filter((t) => t.length <= MAX_QUOTE_LENGTH)
      .sort((a, b) => b.length - a.length);
    // If nothing fits, truncate the shortest available entry
    if (fitting.length > 0) {
      quote = fitting[0];
    } else if (uniqueTexts.length > 0) {
      const shortest = uniqueTexts.sort((a, b) => a.length - b.length)[0];
      quote = `${shortest.slice(0, MAX_QUOTE_LENGTH - 1)}…`;
    }
  }

  // Sprite — the same Gen 5 Showdown set the app draws, so alternate formes
  // resolve to Showdown's own file names instead of PokemonDB's.
  const spriteUrl = pokemonSprite(name, { set: "gen5" });

  let spriteBase64: string | null = null;
  try {
    const res = await fetch(spriteUrl, ogFetchInit());
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      spriteBase64 = `data:image/png;base64,${base64}`;
    }
  } catch {
    // Sprite fetch failed or timed out — render without it
  }

  return new ImageResponse(
    <OgFrame style={{ flexDirection: "column", padding: "48px 56px" }}>
      {/* Top section: sprite, name + types + badges, then the quote */}
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {/* Sprite */}
        {spriteBase64 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 200,
              height: 200,
              backgroundColor: `${typeColor}20`,
              border: `2px solid ${typeColor}66`,
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
              width: 200,
              height: 200,
              backgroundColor: OG_CARD,
              border: `2px solid ${OG_BORDER}`,
              flexShrink: 0,
              fontSize: 64,
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
            gap: 12,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: 16,
            }}
          >
            <span
              style={{
                fontSize: nameFontSize(baseName),
                fontWeight: 700,
                color: OG_FG,
              }}
            >
              {baseName}
            </span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 400,
                color: OG_MUTED,
              }}
            >
              #{String(dexNum).padStart(3, "0")}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {types.map((t) => {
              const color = TYPE_COLORS[t as PokemonType] ?? OG_MUTED;
              return (
                <div
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 20px",
                    borderRadius: 6,
                    backgroundColor: `${color}20`,
                    color,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  {t}
                </div>
              );
            })}
            {badges.map((badge) => (
              <div
                key={badge}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 16px",
                  backgroundColor: OG_CARD,
                  border: `1px solid ${OG_BORDER}`,
                  fontSize: 20,
                  fontWeight: 400,
                  color: OG_MUTED,
                }}
              >
                {badge}
              </div>
            ))}
          </div>
        </div>

        {/* Pokédex quote — laid out in the row so it can't paint over the name */}
        {quote && (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              flexShrink: 0,
              maxWidth: 360,
              padding: "14px 18px",
              backgroundColor: OG_CARD,
              border: `1px solid ${OG_BORDER}`,
              fontSize: 17,
              fontStyle: "italic",
              lineHeight: 1.5,
              color: OG_MUTED,
            }}
          >
            {quote}
          </div>
        )}
      </div>

      {/* Stats section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 36,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                width: 48,
                textAlign: "right",
                color: OG_MUTED,
              }}
            >
              {STAT_ABBREVIATIONS[s.key]}
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                width: 44,
                textAlign: "right",
                color: OG_FG,
              }}
            >
              {s.value}
            </span>
            {/* Bar background */}
            <div
              style={{
                display: "flex",
                flex: 1,
                height: 20,
                borderRadius: 10,
                backgroundColor: OG_CARD,
                overflow: "hidden",
              }}
            >
              {/* Bar fill */}
              <div
                style={{
                  width: `${(s.value / MAX_STAT) * 100}%`,
                  height: "100%",
                  borderRadius: 10,
                  backgroundColor: getStatColor((s.value / MAX_STAT) * 100),
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
            gap: 12,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              width: 48,
              textAlign: "right",
              color: OG_MUTED,
            }}
          >
            BST
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              width: 44,
              textAlign: "right",
              color: OG_FG,
            }}
          >
            {bst}
          </span>
        </div>
      </div>

      {/* Branding */}
      <OgFooter mark={mark} style={FOOTER_CORNER} />
    </OgFrame>,
    ogImageOptions(fonts),
  );
}
