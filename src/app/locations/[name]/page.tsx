import type { Metadata } from "next";
import { formatName } from "@/lib/pkmn";
import { LocationDetailClient } from "./client";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const displayName = formatName(name);
  const description = `${displayName} — Pokémon location. View encounters, areas, and game appearances.`;

  return {
    title: displayName,
    description,
    openGraph: {
      title: displayName,
      description,
    },
  };
}

export default async function LocationDetailPage({ params }: PageProps) {
  const { name } = await params;
  return <LocationDetailClient name={name} />;
}
