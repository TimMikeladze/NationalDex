import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gym Leaders, Elite Four & Champions — Every Generation",
  description:
    "Browse every gym leader, trial captain, kahuna, Elite Four member and champion across all Pokémon generations — their type, badge, location and ace Pokémon.",
  alternates: {
    canonical: "/trainers",
  },
  openGraph: {
    title: "Pokémon Trainers & Gym Leaders",
    description:
      "Browse every gym leader, Elite Four member and champion across all Pokémon generations.",
  },
};

export default function TrainersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
