import { getAllAbilities, toID } from "@/lib/pkmn";
import { AbilityDetailClient } from "./client";

export async function generateStaticParams() {
  const abilities = getAllAbilities();
  return abilities.map((a) => ({ name: toID(a.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function AbilityDetailPage({ params }: PageProps) {
  const { name } = await params;
  return <AbilityDetailClient name={name} />;
}
