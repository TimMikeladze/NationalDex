import type { Metadata } from "next";
import { getAllSpecies, getSpecies, toID } from "@/lib/pkmn";
import { getPokedexEntry } from "@/lib/pokeapi";
import { SITE_URL } from "@/lib/utils";
import { PokemonPageClient } from "./client";

export async function generateStaticParams() {
  // Include all forms (Mega, Gmax, regional variants, etc.) so their pages are prebuilt
  const species = getAllSpecies(9, { includeFormes: true });
  return species.map((s) => ({ id: toID(s.name) }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

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

function getRegionFromDexNumber(dexNumber: number): string | null {
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

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spa: "SPA",
  spd: "SPD",
  spe: "SPE",
};

const STAT_ORDER = ["hp", "atk", "def", "spa", "spd", "spe"] as const;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const species = getSpecies(id);

  if (!species) {
    return { title: "Pokémon not found" };
  }

  const dexNum = String(species.num).padStart(3, "0");
  const types = [species.types[0], species.types[1]].filter(Boolean).join("/");
  const bst = Object.values(species.baseStats).reduce(
    (sum: number, v) => sum + (v as number),
    0,
  );

  // Build detailed description with all info rendered in the OG image
  const variant = getVariantFromName(species.name);
  const region = getRegionFromDexNumber(species.num);
  const statsSummary = STAT_ORDER.map(
    (key) => `${STAT_LABELS[key]} ${species.baseStats[key] ?? 0}`,
  ).join(", ");
  const badges: string[] = [];
  if (variant) badges.push(VARIANT_DISPLAY_NAMES[variant] ?? variant);
  if (region) badges.push(region);
  const badgeText = badges.length > 0 ? ` ${badges.join(", ")}.` : "";
  const description = `${types} type.${badgeText} Stats: ${statsSummary}. BST ${bst}.`;

  return {
    title: `${species.name} (#${dexNum})`,
    description,
    openGraph: {
      title: `${species.name} (#${dexNum})`,
      description,
      url: `${SITE_URL}/pokemon/${id}`,
      siteName: "nationaldex",
      type: "article",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function PokemonPage({ params }: PageProps) {
  const { id } = await params;
  const species = getSpecies(id);
  const pokedexEntry = await getPokedexEntry(id);

  const jsonLd = species
    ? {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: species.name,
        description: `${species.types.join("/")} type Pokémon #${species.num}`,
        mainEntity: {
          "@type": "Thing",
          name: species.name,
          identifier: `#${String(species.num).padStart(3, "0")}`,
          additionalType: "Pokémon",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
      <PokemonPageClient id={id} pokedexEntry={pokedexEntry} />
    </>
  );
}
