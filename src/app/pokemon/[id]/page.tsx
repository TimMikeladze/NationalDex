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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const species = getSpecies(id);

  if (!species) {
    return { title: "Pokémon not found" };
  }

  const pokedexEntry = await getPokedexEntry(species.num);
  const dexNum = String(species.num).padStart(3, "0");
  const types = [species.types[0], species.types[1]].filter(Boolean).join("/");
  const bst = Object.values(species.baseStats).reduce(
    (sum: number, v) => sum + (v as number),
    0,
  );

  const description = pokedexEntry?.entries[0]?.flavorText
    ? `${pokedexEntry.genus}. ${types} type. BST ${bst}. ${pokedexEntry.entries[0].flavorText}`
    : `${types} type Pokémon. Base stat total: ${bst}.`;

  const ogImageUrl = `${SITE_URL}/pokemon/${id}/opengraph-image`;

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
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${species.name} stats`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [
        {
          url: ogImageUrl,
          alt: `${species.name} stats`,
          width: 1200,
          height: 630,
        },
      ],
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
