import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swipe through Pokémon cards",
  description:
    "Flick through Pokemon TCG and TCG Pocket cards one at a time — swipe right to favorite, left to skip, up to file a card in a list.",
  alternates: {
    canonical: "/cards/swipe",
  },
  openGraph: {
    title: "Swipe through Pokémon cards",
    description:
      "One card at a time — swipe right to favorite, left to skip, up to add to a list.",
  },
};

export default function CardsSwipeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
