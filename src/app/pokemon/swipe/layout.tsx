import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swipe through Pokémon",
  description:
    "Flick through every Pokémon one at a time with its types and base stats — swipe right to favorite, left to skip, up to add it to a list.",
  alternates: {
    canonical: "/pokemon/swipe",
  },
  openGraph: {
    title: "Swipe through Pokémon",
    description:
      "One Pokémon at a time — swipe right to favorite, left to skip, up to add to a list.",
  },
};

export default function PokemonSwipeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
