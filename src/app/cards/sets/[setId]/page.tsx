import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTcgSet } from "@/lib/tcg";
import { assetUrl, resolveTcgLanguage, withTcgLanguage } from "@/types/tcg";
import { SetDetailClient } from "./client";

interface PageProps {
  params: Promise<{ setId: string }>;
  /** Set ids repeat across catalogues, so the language travels with the link. */
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { setId } = await params;
  const language = resolveTcgLanguage((await searchParams).lang);
  const set = await getTcgSet(setId, language).catch(() => null);

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
      canonical: withTcgLanguage(
        `/cards/sets/${set.id.toLowerCase()}`,
        language,
      ),
    },
    openGraph: {
      title: `${set.name} — Pokemon card set`,
      description,
      images: logo ? [{ url: logo }] : undefined,
    },
  };
}

export default async function SetDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { setId } = await params;
  const language = resolveTcgLanguage((await searchParams).lang);
  const set = await getTcgSet(setId, language).catch(() => null);

  if (!set) notFound();

  return <SetDetailClient set={set} language={language} />;
}
