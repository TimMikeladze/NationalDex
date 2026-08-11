import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RelatedLinks } from "@/components/seo/related-links";
import { formatName, getAllItems, getItem, toID } from "@/lib/pkmn";
import { PrefetchBoundary } from "@/lib/prefetch";
import { itemDetailQuery } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/utils";
import { ItemDetailClient } from "./client";

/** A handful of neighbours, enough to give the item pages a link graph. */
const RELATED_ITEM_LINKS = 8;

export async function generateStaticParams() {
  const items = getAllItems();
  return items.map((i) => ({ name: toID(i.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const item = getItem(name);

  if (!item) {
    return { title: "Item not found" };
  }

  const label = formatName(item.name);
  const effect = item.shortDesc || item.desc || "";
  const description =
    `${label} is a held item in Pokémon. ${effect} See its effect, Fling power and where it fits in competitive play.`.trim();

  return {
    title: `${label} — Item Effect & Details`,
    description,
    keywords: [label, `${label} item`, `${label} effect`, "pokemon held items"],
    alternates: {
      canonical: `/items/${toID(item.name)}`,
    },
    openGraph: {
      title: `${label} — Pokémon Item`,
      description,
      url: `${SITE_URL}/items/${toID(item.name)}`,
      type: "article",
    },
  };
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { name } = await params;
  const item = getItem(name);
  if (!item) notFound();

  const slug = toID(item.name);
  if (name !== slug) permanentRedirect(`/items/${slug}`);

  const label = formatName(item.name);

  // Items have no index page of their own, so neighbours in the dex ordering
  // are what keeps these pages reachable from one another.
  const allItems = getAllItems();
  const index = allItems.findIndex((i) => i.id === item.id);
  const neighbours =
    index === -1
      ? allItems.slice(0, RELATED_ITEM_LINKS)
      : [
          ...allItems.slice(Math.max(0, index - RELATED_ITEM_LINKS / 2), index),
          ...allItems.slice(index + 1, index + 1 + RELATED_ITEM_LINKS / 2),
        ];

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Items", path: "/" },
      { name: label, path: `/items/${slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${label} — Pokémon item`,
      url: `${SITE_URL}/items/${slug}`,
      description: item.desc || item.shortDesc || "",
      mainEntity: {
        "@type": "Thing",
        name: label,
        additionalType: "Pokémon item",
        description: item.desc || item.shortDesc || "",
      },
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PrefetchBoundary queries={[itemDetailQuery(slug)]}>
        <ItemDetailClient name={slug} />
      </PrefetchBoundary>
      <RelatedLinks
        heading="More items"
        groups={[
          {
            label: "Nearby items",
            links: neighbours.map((i) => ({
              label: i.name,
              href: `/items/${toID(i.name)}`,
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
