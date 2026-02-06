import { LocationDetailClient } from "./client";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function LocationDetailPage({ params }: PageProps) {
  const { name } = await params;
  return <LocationDetailClient name={name} />;
}
