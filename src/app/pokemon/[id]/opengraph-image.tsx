import { ImageResponse } from "next/og";
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgChip,
  ogImageOptions,
  OgShell,
} from "@/lib/og";
import { getAllSpecies, getSpecies, toID } from "@/lib/pkmn";
import { getPokedexEntry } from "@/lib/pokeapi";
import { pokemonSprite, pokemonSpriteById } from "@/lib/sprites";
import { type PokemonType, TYPE_COLORS } from "@/types/pokemon";

export const alt = "Pokémon stats and type information";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

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
  "Mega-Z",
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
  "Mega-Z": "Mega Z",
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

/**
 * Resolved sprites, keyed by candidate list. `twitter-image` re-exports this
 * module, so every species is rendered twice per build; without this the whole
 * candidate chain — 404s included — would be walked a second time for each one.
 */
const spriteCache = new Map<string, string | null>();

/**
 * First URL that resolves, as a data URI. Returns null when every candidate
 * 404s or the network is unavailable, and the card renders its `?` placeholder.
 */
async function loadSprite(urls: string[]): Promise<string | null> {
  const cacheKey = urls.join("\n");
  const cached = spriteCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let sprite: string | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      const type = res.headers.get("content-type") ?? "image/png";
      sprite = `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;
      break;
    } catch {
      // Try the next candidate.
    }
  }

  spriteCache.set(cacheKey, sprite);
  return sprite;
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          width: 48,
          fontSize: 18,
          color: OG_COLORS.muted,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          width: 44,
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          height: 14,
          background: OG_COLORS.surface,
          border: `1px solid ${OG_COLORS.border}`,
        }}
      >
        <div
          style={{
            width: `${Math.min((value / MAX_STAT) * 100, 100)}%`,
            height: "100%",
            background: getStatColor(value),
          }}
        />
      </div>
    </div>
  );
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
      <OgShell
        tag="NOT FOUND"
        footer={
          <>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: "2px",
                color: OG_COLORS.muted,
              }}
            >
              NO DEX ENTRY
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
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-2px",
          }}
        >
          Pokémon not found
        </div>
      </OgShell>,
      await ogImageOptions(),
    );
  }

  const name = species.name;
  const baseName = getBaseName(name);
  const dexNum = species.num;
  const types = [species.types[0], species.types[1]].filter(
    Boolean,
  ) as string[];

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

  // Pokédex quote — the longest unique entry that still fits the card, matching
  // the blurb `generateMetadata` puts in the social description.
  const pokedexEntry = await getPokedexEntry(dexNum);
  let quote: string | null = null;
  if (pokedexEntry && pokedexEntry.entries.length > 0) {
    const MAX_QUOTE_LENGTH = 120;
    const uniqueTexts = [
      ...new Set(pokedexEntry.entries.map((e) => e.flavorText)),
    ];
    // Prefer the longest entry that still fits within the limit
    const fitting = uniqueTexts
      .filter((t) => t.length <= MAX_QUOTE_LENGTH)
      .sort((a, b) => b.length - a.length);
    quote = fitting[0] ?? null;
    // If nothing fits, truncate the shortest available entry
    if (!quote) {
      const shortest = uniqueTexts.sort((a, b) => a.length - b.length)[0];
      quote = `${shortest.slice(0, MAX_QUOTE_LENGTH - 1)}…`;
    }
  }

  // Satori cannot fetch remote images itself, so the sprite is inlined. The
  // Showdown URL is built by `pokemonSprite` rather than by hand: forme names
  // (`Raichu-Alola`, `Charizard-Mega-X`) do not map onto the file names by a
  // plain slugify.
  const spriteCandidates = [pokemonSprite(name, { set: "gen5" })];
  // PokeAPI's sprites are keyed by dex number, which no forme has of its own,
  // so that backstop is only offered for plain base forms.
  if (!species.forme) spriteCandidates.push(pokemonSpriteById(dexNum));
  // Last resort: PokemonDB's HOME renders are keyed by name, so they cover the
  // formes and later-generation species Showdown's Gen 5 sheet never drew.
  spriteCandidates.push(pokemonSprite(name, { set: "home" }));

  const spriteBase64 = await loadSprite(spriteCandidates);

  const dexLabel = `#${String(dexNum).padStart(3, "0")}`;

  return new ImageResponse(
    <OgShell
      tag={region ? `${dexLabel} / ${region.toUpperCase()}` : dexLabel}
      footer={
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: "2px",
                color: OG_COLORS.muted,
              }}
            >
              BASE STAT TOTAL
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                color: OG_COLORS.accent,
              }}
            >
              {bst}
            </div>
          </div>
          <div
            style={{ display: "flex", fontSize: 18, color: OG_COLORS.muted }}
          >
            nationaldex.app
          </div>
        </>
      }
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 200,
            height: 200,
            flexShrink: 0,
            background: OG_COLORS.surface,
            border: `1px solid ${OG_COLORS.border}`,
            fontSize: 64,
            color: OG_COLORS.border,
          }}
        >
          {spriteBase64 ? (
            // biome-ignore lint/performance/noImgElement: ImageResponse uses raw HTML
            <img
              src={spriteBase64}
              width={160}
              height={160}
              alt=""
              style={{ objectFit: "contain", imageRendering: "pixelated" }}
            />
          ) : (
            "?"
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: "-2px",
              }}
            >
              {baseName}
            </div>
            <div
              style={{ display: "flex", fontSize: 28, color: OG_COLORS.muted }}
            >
              {dexLabel}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {types.map((t) => (
              <OgChip
                key={t}
                label={t.toUpperCase()}
                color={OG_COLORS.background}
                background={TYPE_COLORS[t as PokemonType] ?? OG_COLORS.muted}
                border={TYPE_COLORS[t as PokemonType] ?? OG_COLORS.muted}
              />
            ))}
            {badges.map((badge) => (
              <OgChip
                key={badge}
                label={badge.toUpperCase()}
                color={OG_COLORS.muted}
              />
            ))}
          </div>

          {quote && (
            <div
              style={{
                display: "flex",
                marginTop: 20,
                paddingLeft: 16,
                borderLeft: `2px solid ${OG_COLORS.accent}`,
                fontSize: 18,
                lineHeight: 1.5,
                color: OG_COLORS.muted,
              }}
            >
              {quote}
            </div>
          )}
        </div>
      </div>

      {/* Two columns of three so the bars stay readable without crowding. */}
      <div style={{ display: "flex", gap: 32, marginTop: 28 }}>
        {[stats.slice(0, 3), stats.slice(3)].map((column) => (
          <div
            key={column[0].key}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: 1,
            }}
          >
            {column.map((s) => (
              <StatRow
                key={s.key}
                label={STAT_LABELS[s.key] ?? s.key.toUpperCase()}
                value={s.value}
              />
            ))}
          </div>
        ))}
      </div>
    </OgShell>,
    await ogImageOptions(),
  );
}
