import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deck Builder — Pokémon TCG & TCG Pocket",
  description:
    "Build Pokemon TCG decks card by card: pick a format, drag cards in from the card pool, and see the deck as a binder that groups itself by card type. Every list is checked against the format's rules as you build.",
  alternates: {
    canonical: "/decks",
  },
  openGraph: {
    title: "Pokémon TCG Deck Builder",
    description:
      "Pick a format, drag cards into the binder, and build a legal 60-card deck.",
  },
  // Decks live in the browser, so a deck's own page has nothing to index.
  robots: { index: true, follow: true },
};

export default function DecksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
