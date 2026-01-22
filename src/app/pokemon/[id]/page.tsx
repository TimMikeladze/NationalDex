import { getAllSpecies, toID } from "@/lib/pkmn";
import { getPokedexEntry } from "@/lib/pokeapi";
import { PokemonPageClient } from "./client";

export async function generateStaticParams() {
  // Include all forms (Mega, Gmax, regional variants, etc.) so their pages are prebuilt
  const species = getAllSpecies(9, { includeFormes: true });
  return species.map((s) => ({ id: toID(s.name) }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PokemonPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch Pokedex entry server-side (cached by Next.js for 24h)
  const pokedexEntry = await getPokedexEntry(id);

  return <PokemonPageClient id={id} pokedexEntry={pokedexEntry} />;
}
