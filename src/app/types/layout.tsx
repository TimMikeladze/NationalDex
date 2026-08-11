import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pokémon Type Chart — Weaknesses & Strengths",
  description:
    "Explore all Pokemon types — view type matchups, strengths, weaknesses, and resistances at a glance.",
  alternates: {
    canonical: "/types",
  },
  openGraph: {
    title: "Pokemon Types",
    description:
      "Explore all Pokemon types — view type matchups, strengths, weaknesses, and resistances.",
  },
};

export default function TypesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
