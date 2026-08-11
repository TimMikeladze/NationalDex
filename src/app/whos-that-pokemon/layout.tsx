import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Who's That Pokémon? — Silhouette Quiz",
  description:
    "Test your Pokemon knowledge with the classic guessing game. Can you identify every Pokemon from their silhouette?",
  alternates: {
    canonical: "/whos-that-pokemon",
  },
  openGraph: {
    title: "Who's That Pokemon?",
    description: "Test your Pokemon knowledge with the classic guessing game.",
  },
};

export default function WhosThatPokemonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
