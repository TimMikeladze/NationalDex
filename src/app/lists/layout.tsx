import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lists",
  description: "Your custom Pokemon lists on NationalDex.",
  robots: { index: false, follow: false },
};

export default function ListsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
