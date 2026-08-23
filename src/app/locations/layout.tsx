import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pokémon Locations — Where to Catch Them",
  description:
    "Browse Pokemon locations across all regions — find where to catch Pokemon in every game.",
  alternates: {
    canonical: "/locations",
  },
  openGraph: {
    title: "Pokemon Locations",
    description:
      "Browse Pokemon locations across all regions — find where to catch Pokemon in every game.",
  },
};

export default function LocationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
