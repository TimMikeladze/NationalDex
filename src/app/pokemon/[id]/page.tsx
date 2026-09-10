import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STAT_ABBREVIATIONS, STAT_KEYS } from "@/lib/dex-pokemon";
import {
  getAllSpecies,
  getRegionFromDexNumber,
  getSpecies,
  getVariantFromName,
  toID,
  VARIANT_DISPLAY_NAMES,
} from "@/lib/pkmn";
import { getPokedexEntry } from "@/lib/pokeapi";
import { PrefetchBoundary } from "@/lib/prefetch";
import {
  evolutionChainQuery,
  pokemonMovesQuery,
  pokemonQuery,
  pokemonSpeciesQuery,
} from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/utils";
import { PokemonPageClient } from "./client";
import { PokemonRelatedLinks } from "./related-links";

export async function generateStaticParams() {
  // Include all forms (Mega, Gmax, regional variants, etc.) so their pages are prebuilt
  const species = getAllSpecies(9, { includeFormes: true });
  return species.map((s) => ({ id: toID(s.name) }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

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
  const statsSummary = STAT_KEYS.map(
    (key) => `${STAT_ABBREVIATIONS[key]} ${species.baseStats[key] ?? 0}`,
  ).join(", ");
  const badges: string[] = [];
  if (variant) badges.push(VARIANT_DISPLAY_NAMES[variant] ?? variant);
  if (region) badges.push(region);
  const badgeText = badges.length > 0 ? ` ${badges.join(", ")}.` : "";

  // Include the same Pokédex blurb shown in the OG image
  const pokedexEntry = await getPokedexEntry(species.num);
  let blurb = "";
  if (pokedexEntry && pokedexEntry.entries.length > 0) {
    const MAX_QUOTE_LENGTH = 120;
    const uniqueTexts = [
      ...new Set(pokedexEntry.entries.map((e) => e.flavorText)),
    ];
    const fitting = uniqueTexts
      .filter((t) => t.length <= MAX_QUOTE_LENGTH)
      .sort((a, b) => b.length - a.length);
    const quote =
      fitting[0] ??
      `${uniqueTexts.sort((a, b) => a.length - b.length)[0].slice(0, MAX_QUOTE_LENGTH - 1)}…`;
    blurb = ` "${quote}"`;
  }

  // The OG image redraws the stat line and the blurb, so the social card keeps
  // the dense version. A search snippet is read by a person deciding whether to
  // click, so the meta description is a sentence instead.
  const socialDescription = `${types} type.${badgeText}${blurb} Stats: ${statsSummary}. BST ${bst}.`;

  const displayName = species.baseSpecies
    ? `${species.name.replace(/-/g, " ")}`
    : species.name;
  const origin = region ? ` from the ${region} region` : "";
  const description = `${displayName} is a ${types}-type Pokémon (#${dexNum})${origin}, with a base stat total of ${bst}. See its base stats, abilities, full learnset, evolution line, type weaknesses and trading cards.`;

  // Kept short enough that the "| NationalDex" suffix still fits inside the
  // ~60 characters Google shows before it truncates a title.
  const title = `${species.name} (#${dexNum}) — Stats, Moves & Evolutions`;

  return {
    title,
    description,
    keywords: [
      species.name,
      `${species.name} stats`,
      `${species.name} moves`,
      `${species.name} learnset`,
      `${species.name} evolution`,
      `${species.name} weakness`,
      `${types} type pokemon`,
      "pokedex",
    ],
    alternates: {
      canonical: `/pokemon/${id}`,
    },
    openGraph: {
      title,
      description: socialDescription,
      url: `${SITE_URL}/pokemon/${id}`,
      siteName: "NationalDex",
      type: "article",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: socialDescription,
    },
  };
}

export default async function PokemonPage({ params }: PageProps) {
  const { id } = await params;
  const species = getSpecies(id);

  if (!species) notFound();

  const pokedexEntry = await getPokedexEntry(id);
  const dexNum = String(species.num).padStart(3, "0");
  const bst = Object.values(species.baseStats).reduce(
    (sum: number, v) => sum + (v as number),
    0,
  );
  // Formes share the base species' evolution line, matching pokemonSpeciesQuery.
  const evolutionChainUrl = `evo-${species.baseSpecies ? toID(species.baseSpecies) : species.id}`;

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Pokédex", path: "/" },
      { name: species.name, path: `/pokemon/${id}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${species.name} (#${dexNum})`,
      description: `${species.types.join("/")} type Pokémon #${species.num}. Base stats, abilities, learnset and evolutions.`,
      url: `${SITE_URL}/pokemon/${id}`,
      mainEntity: {
        "@type": "Thing",
        name: species.name,
        identifier: `#${dexNum}`,
        additionalType: "Pokémon",
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "Type",
            value: species.types.join("/"),
          },
          {
            "@type": "PropertyValue",
            name: "Base stat total",
            value: String(bst),
          },
          ...STAT_KEYS.map((key) => ({
            "@type": "PropertyValue" as const,
            name: STAT_ABBREVIATIONS[key],
            value: String(species.baseStats[key] ?? 0),
          })),
        ],
      },
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PrefetchBoundary
        queries={[
          pokemonQuery(id),
          pokemonSpeciesQuery(id),
          pokemonMovesQuery(id),
          evolutionChainQuery(evolutionChainUrl),
        ]}
      >
        <PokemonPageClient id={id} pokedexEntry={pokedexEntry} />
      </PrefetchBoundary>
      <PokemonRelatedLinks species={species} />
    </>
  );
}
