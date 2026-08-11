import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cards",
  description:
    "Browse every Pokemon trading card — the physical TCG and Pokemon TCG Pocket. Filter by set, energy type, rarity, stage and HP, and jump straight from a card to the Pokemon it depicts.",
  alternates: {
    canonical: "/cards",
  },
  openGraph: {
    title: "Pokemon Cards",
    description:
      "Browse every Pokemon trading card across the TCG and TCG Pocket — filter by set, type, rarity and HP.",
  },
};

export default function CardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
