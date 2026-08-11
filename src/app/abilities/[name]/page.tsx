import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RelatedLinks } from "@/components/seo/related-links";
import {
  formatName,
  getAbility,
  getAllAbilities,
  getSpeciesForView,
  toID,
} from "@/lib/pkmn";
import { PrefetchBoundary } from "@/lib/prefetch";
import { abilityDetailQuery } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/utils";
import { AbilityDetailClient } from "./client";

/** Enough Pokemon to make the page a real hub without dwarfing the content. */
const MAX_POKEMON_LINKS = 30;

export async function generateStaticParams() {
  const abilities = getAllAbilities();
  return abilities.map((a) => ({ name: toID(a.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

function pokemonWithAbility(abilityId: string) {
  const matches: { name: string; slug: string }[] = [];
  for (const species of getSpeciesForView(null)) {
    for (const abilityName of Object.values(species.abilities)) {
      if (abilityName && toID(abilityName as string) === abilityId) {
        matches.push({ name: species.name, slug: toID(species.name) });
        break;
      }
    }
  }
  return matches;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const ability = getAbility(name);

  if (!ability) {
    return { title: "Ability not found" };
  }

  const label = formatName(ability.name);
  const effect = ability.shortDesc || ability.desc || "";
  const count = pokemonWithAbility(ability.id).length;
  const description =
    `${label} is a Pokémon ability. ${effect} ${count > 0 ? `${count} Pokémon can have it — see the full list.` : ""}`.trim();

  return {
    title: `${label} — Ability Effect & Pokémon`,
    description,
    keywords: [
      label,
      `${label} ability`,
      `${label} pokemon`,
      `what does ${label} do`,
    ],
    alternates: {
      canonical: `/abilities/${toID(ability.name)}`,
    },
    openGraph: {
      title: `${label} — Pokémon Ability`,
      description,
      url: `${SITE_URL}/abilities/${toID(ability.name)}`,
      type: "article",
    },
  };
}

export default async function AbilityDetailPage({ params }: PageProps) {
  const { name } = await params;
  const ability = getAbility(name);
  if (!ability) notFound();

  // Folds "/abilities/lightning-rod" into "/abilities/lightningrod" so the two
  // spellings do not index as separate pages.
  const slug = toID(ability.name);
  if (name !== slug) permanentRedirect(`/abilities/${slug}`);

  const label = formatName(ability.name);
  const holders = pokemonWithAbility(ability.id);

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Abilities", path: "/" },
      { name: label, path: `/abilities/${slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${label} — Pokémon ability`,
      url: `${SITE_URL}/abilities/${slug}`,
      description: ability.desc || ability.shortDesc || "",
      mainEntity: {
        "@type": "Thing",
        name: label,
        additionalType: "Pokémon ability",
        description: ability.desc || ability.shortDesc || "",
      },
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PrefetchBoundary queries={[abilityDetailQuery(slug)]}>
        <AbilityDetailClient name={slug} />
      </PrefetchBoundary>
      <RelatedLinks
        heading={`More about ${label}`}
        groups={[
          {
            label: "Pokémon with this ability",
            links: holders.slice(0, MAX_POKEMON_LINKS).map((entry) => ({
              label: entry.name,
              href: `/pokemon/${entry.slug}`,
            })),
          },
          {
            label: "Browse",
            links: [
              { label: "Pokédex", href: "/" },
              { label: "All moves", href: "/moves" },
              { label: "All types", href: "/types" },
            ],
          },
        ]}
      />
    </>
  );
}
