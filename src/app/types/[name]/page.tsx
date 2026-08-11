import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RelatedLinks } from "@/components/seo/related-links";
import {
  getAllTypes,
  getOffensiveTypeMatchups,
  getSpeciesForView,
  getType,
  getTypeMatchups,
  LATEST_GEN,
  toID,
} from "@/lib/pkmn";
import { PrefetchBoundary } from "@/lib/prefetch";
import { typeDetailQuery } from "@/lib/queries";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/utils";
import { TypeDetailClient } from "./client";

/** Type pages are big hubs; this is the slice that ships as crawlable links. */
const MAX_POKEMON_LINKS = 40;

export async function generateStaticParams() {
  const types = getAllTypes();
  return types.map((t) => ({ name: toID(t.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const type = getType(name);

  if (!type) {
    return { title: "Type not found" };
  }

  const offense = getOffensiveTypeMatchups(type.name);
  const defense = getTypeMatchups([type.name], LATEST_GEN);
  const strongAgainst = offense.superEffective.join(", ") || "nothing";
  const weakTo = defense.weaknesses.map((w) => w.type).join(", ") || "nothing";
  const description = `${type.name}-type Pokémon: full type chart, strengths and weaknesses. ${type.name} moves are super effective against ${strongAgainst}, and ${type.name} Pokémon are weak to ${weakTo}.`;

  return {
    title: `${type.name} Type — Weaknesses, Strengths & Pokémon`,
    description,
    keywords: [
      `${type.name} type`,
      `${type.name} type weakness`,
      `${type.name} type pokemon`,
      `what is ${type.name} weak to`,
      "pokemon type chart",
    ],
    alternates: {
      canonical: `/types/${toID(type.name)}`,
    },
    openGraph: {
      title: `${type.name} Type — Pokémon Type Chart`,
      description,
      url: `${SITE_URL}/types/${toID(type.name)}`,
      type: "article",
    },
  };
}

export default async function TypeDetailPage({ params }: PageProps) {
  const { name } = await params;
  const type = getType(name);
  if (!type) notFound();

  const slug = toID(type.name);
  if (name !== slug) permanentRedirect(`/types/${slug}`);

  const offense = getOffensiveTypeMatchups(type.name);
  const defense = getTypeMatchups([type.name], LATEST_GEN);
  const members = getSpeciesForView(null).filter((s) =>
    s.types.includes(type.name),
  );

  const linkList = (types: string[]) =>
    types.map((t) => ({ label: `${t} type`, href: `/types/${toID(t)}` }));

  // "What is Fire weak to?" is the query these pages compete for, so the answer
  // is stated in a form Google can lift into a rich result.
  const faqs = [
    {
      question: `What is ${type.name} type weak to?`,
      answer: `${type.name}-type Pokémon take double damage from ${
        defense.weaknesses.map((w) => w.type).join(", ") || "no types"
      }.`,
    },
    {
      question: `What is ${type.name} type strong against?`,
      answer: `${type.name}-type moves are super effective against ${
        offense.superEffective.join(", ") || "no types"
      }.`,
    },
    {
      question: `What resists ${type.name} type moves?`,
      answer: `${type.name}-type moves are resisted by ${
        offense.notVeryEffective.join(", ") || "no types"
      }${
        offense.noEffect.length > 0
          ? `, and do not affect ${offense.noEffect.join(", ")}`
          : ""
      }.`,
    },
    {
      question: `How many ${type.name}-type Pokémon are there?`,
      answer: `There are ${members.length} ${type.name}-type Pokémon in the National Pokédex.`,
    },
  ];

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Types", path: "/types" },
      { name: `${type.name} type`, path: `/types/${slug}` },
    ]),
    faqJsonLd(faqs),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PrefetchBoundary queries={[typeDetailQuery(slug)]}>
        <TypeDetailClient name={slug} />
      </PrefetchBoundary>
      <RelatedLinks
        heading={`${type.name} type matchups`}
        groups={[
          {
            label: "Super effective against",
            links: linkList(offense.superEffective),
          },
          {
            label: "Weak to",
            links: linkList(defense.weaknesses.map((w) => w.type)),
          },
          {
            label: "Resists",
            links: linkList(defense.resistances.map((r) => r.type)),
          },
          {
            label: `${type.name}-type Pokémon`,
            links: members.slice(0, MAX_POKEMON_LINKS).map((s) => ({
              label: s.name,
              href: `/pokemon/${toID(s.name)}`,
            })),
          },
          {
            label: "Browse",
            links: [
              { label: "All types", href: "/types" },
              { label: "Pokédex", href: "/" },
              { label: "All moves", href: "/moves" },
            ],
          },
        ]}
      />
    </>
  );
}
