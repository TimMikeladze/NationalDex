import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Pokémon Side by Side",
  description:
    "Compare Pokemon side by side — stats, types, abilities, and more. Find the best Pokemon for your team.",
  alternates: {
    canonical: "/comparison",
  },
  openGraph: {
    title: "Compare Pokemon",
    description:
      "Compare Pokemon side by side — stats, types, abilities, and more.",
  },
};

export default function ComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
