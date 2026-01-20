import { getPokedexEntry } from "@/lib/pokeapi";
import { PokemonPageClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PokemonPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch Pokedex entry server-side (cached by Next.js for 24h)
  const pokedexEntry = await getPokedexEntry(id);

  return <PokemonPageClient id={id} pokedexEntry={pokedexEntry} />;
}
