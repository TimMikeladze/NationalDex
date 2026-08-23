import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your favorite Pokemon collection on NationalDex.",
  robots: { index: false, follow: false },
};

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
