import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RelatedLinks } from "@/components/seo/related-links";
import { getSpeciesLearningMove } from "@/lib/learnsets";
import { formatName, getAllMoves, getMove, toID } from "@/lib/pkmn";
import { PrefetchBoundary } from "@/lib/prefetch";
import { moveDetailQuery } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/utils";
import { MoveDetailClient } from "./client";

/** Enough Pokemon to make the page a real hub without dwarfing the content. */
const MAX_POKEMON_LINKS = 30;

export async function generateStaticParams() {
  const moves = getAllMoves();
  return moves.map((m) => ({ name: toID(m.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const move = getMove(name);

  if (!move) {
    return { title: "Move not found" };
  }

  const label = formatName(move.name);
  const power = move.basePower
    ? `${move.basePower} base power`
    : "no base power";
  const accuracy =
    move.accuracy === true ? "never misses" : `${move.accuracy}% accuracy`;
  const description =
    `${label} is a ${move.type}-type ${move.category.toLowerCase()} move with ${power}, ${accuracy} and ${move.pp} PP. ${move.shortDesc || ""} See every Pokémon that learns it.`.trim();

  return {
    title: `${label} — ${move.type} Move Stats & Learnset`,
    description,
    keywords: [
      label,
      `${label} move`,
      `${label} pokemon`,
      `who learns ${label}`,
      `${move.type} type moves`,
    ],
    alternates: {
      canonical: `/moves/${toID(move.name)}`,
    },
    openGraph: {
      title: `${label} — ${move.type} Move`,
      description,
      url: `${SITE_URL}/moves/${toID(move.name)}`,
      type: "article",
    },
  };
}

export default async function MoveDetailPage({ params }: PageProps) {
  const { name } = await params;
  const move = getMove(name);
  if (!move) notFound();

  // "/moves/thunder-punch" and "/moves/thunderpunch" both resolve, so the
  // non-canonical spellings are folded into one indexable URL rather than
  // competing with it.
  const slug = toID(move.name);
  if (name !== slug) permanentRedirect(`/moves/${slug}`);

  const label = formatName(move.name);
  const learnedBy = await getSpeciesLearningMove(move.name, null).catch(
    () => [],
  );

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Moves", path: "/moves" },
      { name: label, path: `/moves/${slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${label} — Pokémon move`,
      url: `${SITE_URL}/moves/${slug}`,
      description: move.desc || move.shortDesc || "",
      mainEntity: {
        "@type": "Thing",
        name: label,
        additionalType: "Pokémon move",
        additionalProperty: [
          { "@type": "PropertyValue", name: "Type", value: move.type },
          { "@type": "PropertyValue", name: "Category", value: move.category },
          {
            "@type": "PropertyValue",
            name: "Power",
            value: String(move.basePower || "—"),
          },
          {
            "@type": "PropertyValue",
            name: "Accuracy",
            value: move.accuracy === true ? "—" : String(move.accuracy),
          },
          { "@type": "PropertyValue", name: "PP", value: String(move.pp) },
        ],
      },
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PrefetchBoundary queries={[moveDetailQuery(slug)]}>
        <MoveDetailClient name={slug} />
      </PrefetchBoundary>
      <RelatedLinks
        heading={`More about ${label}`}
        groups={[
          {
            label: "Type",
            links: [
              { label: `${move.type} type`, href: `/types/${toID(move.type)}` },
            ],
          },
          {
            label: "Pokémon that learn it",
            links: learnedBy.slice(0, MAX_POKEMON_LINKS).map((entry) => ({
              label: entry.name,
              href: `/pokemon/${toID(entry.name)}`,
            })),
          },
          {
            label: "Browse",
            links: [
              { label: "All moves", href: "/moves" },
              { label: "All types", href: "/types" },
              { label: "Pokédex", href: "/" },
            ],
          },
        ]}
      />
    </>
  );
}
