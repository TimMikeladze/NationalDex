import { getAllTypes, toID } from "@/lib/pkmn";
import { TypeDetailClient } from "./client";

export async function generateStaticParams() {
  const types = getAllTypes();
  return types.map((t) => ({ name: toID(t.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function TypeDetailPage({ params }: PageProps) {
  const { name } = await params;
  return <TypeDetailClient name={name} />;
}
