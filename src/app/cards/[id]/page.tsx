import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTcgCard } from "@/lib/tcg";
import { cardImageUrl, resolveTcgLanguage, withTcgLanguage } from "@/types/tcg";
import { CardDetailClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
  // Card ids repeat across catalogues, so which one is being read travels with
  // the link rather than being guessed from the id.
  searchParams: Promise<{ lang?: string }>;
}

function describeCard(card: Awaited<ReturnType<typeof getTcgCard>>) {
  if (!card) return "";

  const parts = [card.rarity, card.set.name].filter(Boolean);
  if (card.hp) parts.push(`${card.hp} HP`);
  if (card.types?.length) parts.push(card.types.join("/"));
  if (card.illustrator) parts.push(`Illustrated by ${card.illustrator}`);

  return parts.join(" · ");
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const language = resolveTcgLanguage((await searchParams).lang);
  const card = await getTcgCard(id, language).catch(() => null);

  if (!card) {
    return { title: "Card not found" };
  }

  const title = `${card.name} — ${card.set.name} ${card.localId}`;
  const description = describeCard(card);
  const image = cardImageUrl(card.image, "high");

  return {
    title,
    description,
    alternates: {
      canonical: withTcgLanguage(`/cards/${card.id.toLowerCase()}`, language),
    },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CardDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const language = resolveTcgLanguage((await searchParams).lang);
  const card = await getTcgCard(id, language).catch(() => null);

  if (!card) notFound();

  return <CardDetailClient card={card} language={language} />;
}
