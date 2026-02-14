import type { Metadata } from "next";
import { formatName, getAllItems, getItem, toID } from "@/lib/pkmn";
import { ItemDetailClient } from "./client";

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

  const description =
    item.shortDesc || item.desc || `${formatName(item.name)} — Pokémon item.`;

  return {
    title: formatName(item.name),
    description,
    openGraph: {
      title: formatName(item.name),
      description,
    },
  };
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { name } = await params;
  return <ItemDetailClient name={name} />;
}
