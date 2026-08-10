import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTcgSet } from "@/lib/tcg";
import { assetUrl } from "@/types/tcg";
import { SetDetailClient } from "./client";

interface PageProps {
  params: Promise<{ setId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { setId } = await params;
  const set = await getTcgSet(setId).catch(() => null);

  if (!set) {
    return { title: "Set not found" };
  }

  const description = `All ${set.cardCount.official} cards in ${set.name}${
    set.serie ? ` (${set.serie.name})` : ""
  }${set.releaseDate ? `, released ${set.releaseDate}` : ""}.`;
  const logo = assetUrl(set.logo);

  return {
    title: set.name,
    description,
    alternates: {
      canonical: `/cards/sets/${set.id.toLowerCase()}`,
    },
    openGraph: {
      title: `${set.name} — Pokemon card set`,
      description,
      images: logo ? [{ url: logo }] : undefined,
    },
  };
}

export default async function SetDetailPage({ params }: PageProps) {
  const { setId } = await params;
  const set = await getTcgSet(setId).catch(() => null);

  if (!set) notFound();

  return <SetDetailClient set={set} />;
}
