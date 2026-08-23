import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Card Sets",
  description:
    "Every Pokemon trading card set and expansion, from Base Set to the latest — across the physical TCG and Pokemon TCG Pocket.",
  alternates: {
    canonical: "/cards/sets",
  },
  openGraph: {
    title: "Pokemon Card Sets",
    description:
      "Every Pokemon trading card set and expansion across the TCG and TCG Pocket.",
  },
};

export default function CardSetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
