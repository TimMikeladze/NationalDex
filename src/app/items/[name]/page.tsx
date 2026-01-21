import { getAllItems, toID } from "@/lib/pkmn";
import { ItemDetailClient } from "./client";

export async function generateStaticParams() {
  const items = getAllItems();
  return items.map((i) => ({ name: toID(i.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { name } = await params;
  return <ItemDetailClient name={name} />;
}
