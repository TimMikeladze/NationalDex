import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about NationalDex — a modern Pokedex app with stats, moves, abilities, type coverage, team building, and more for all Pokemon generations.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About NationalDex",
    description:
      "A modern Pokedex app with stats, moves, abilities, type coverage, team building, and more for all Pokemon generations.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
