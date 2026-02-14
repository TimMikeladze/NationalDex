import type { Metadata } from "next";
import { formatName, getAllMoves, getMove, toID } from "@/lib/pkmn";
import { MoveDetailClient } from "./client";

export async function generateStaticParams() {
  const moves = getAllMoves();
  return moves.map((m) => ({ name: toID(m.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const move = getMove(name);

  if (!move) {
    return { title: "Move not found" };
  }

  const power = move.basePower ? `${move.basePower} BP` : "—";
  const accuracy = move.accuracy === true ? "—" : `${move.accuracy}%`;
  const description =
    `${move.type} ${move.category} move. Power: ${power}. Accuracy: ${accuracy}. PP: ${move.pp}. ${move.shortDesc || ""}`.trim();

  return {
    title: formatName(move.name),
    description,
    openGraph: {
      title: formatName(move.name),
      description,
    },
  };
}

export default async function MoveDetailPage({ params }: PageProps) {
  const { name } = await params;
  return <MoveDetailClient name={name} />;
}
