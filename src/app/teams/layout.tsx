import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teams",
  description: "Your Pokemon teams on NationalDex.",
  robots: { index: false, follow: false },
};

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
