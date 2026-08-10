import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTcgCard } from "@/lib/tcg";
import { cardImageUrl } from "@/types/tcg";
import { CardDetailClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
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
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getTcgCard(id).catch(() => null);

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
      canonical: `/cards/${card.id.toLowerCase()}`,
    },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const card = await getTcgCard(id).catch(() => null);

  if (!card) notFound();

  return <CardDetailClient card={card} />;
}
