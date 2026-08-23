import Link from "next/link";
import { getAllSpecies, toID } from "@/lib/pkmn";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { ComparisonPageClient } from "./client-page";

/**
 * Starters and box legendaries are the comparisons people actually search for,
 * and they double as crawlable links into the dex.
 */
const SUGGESTED = [
  "Bulbasaur",
  "Charmander",
  "Squirtle",
  "Pikachu",
  "Eevee",
  "Dragonite",
  "Tyranitar",
  "Metagross",
  "Garchomp",
  "Lucario",
  "Greninja",
  "Mewtwo",
  "Rayquaza",
  "Arceus",
  "Miraidon",
  "Koraidon",
];

export default function ComparisonPage() {
  const known = new Set<string>(getAllSpecies().map((s) => s.name));
  const suggestions = SUGGESTED.filter((name) => known.has(name));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Compare Pokémon", path: "/comparison" },
        ])}
      />

      <h1 className="sr-only">Compare Pokémon side by side</h1>

      <ComparisonPageClient />

      <nav
        aria-label="Popular Pokémon to compare"
        className="border-t px-4 py-8 md:px-6 space-y-3"
      >
        <h2 className="text-sm font-medium">Popular Pokémon to compare</h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {suggestions.map((name) => (
            <li key={name}>
              <Link
                href={`/pokemon/${toID(name)}`}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
