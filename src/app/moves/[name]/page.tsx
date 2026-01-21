import { getAllMoves, toID } from "@/lib/pkmn";
import { MoveDetailClient } from "./client";

export async function generateStaticParams() {
  const moves = getAllMoves();
  return moves.map((m) => ({ name: toID(m.name) }));
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function MoveDetailPage({ params }: PageProps) {
  const { name } = await params;
  return <MoveDetailClient name={name} />;
}
