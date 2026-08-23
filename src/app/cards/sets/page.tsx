import Link from "next/link";
import { breadcrumbJsonLd, itemListJsonLd, JsonLd } from "@/lib/seo";
import { getTcgSeriesWithSets } from "@/lib/tcg";
import { CardSetsPageClient } from "./client-page";

export default async function CardSetsPage() {
  const series = await getTcgSeriesWithSets().catch(() => []);
  const allSets = series.flatMap((serie) => serie.sets ?? []);

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Cards", path: "/cards" },
      { name: "Sets", path: "/cards/sets" },
    ]),
    itemListJsonLd(
      "Pokémon card sets",
      allSets.map((set) => ({
        name: set.name,
        path: `/cards/sets/${set.id.toLowerCase()}`,
      })),
    ),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <h1 className="sr-only">
        Pokémon card sets — every expansion, newest first
      </h1>

      <CardSetsPageClient />

      {series.length > 0 && (
        <nav
          aria-label="All card sets by series"
          className="border-t px-4 py-8 md:px-6 space-y-6"
        >
          <h2 className="text-sm font-medium">All sets by series</h2>
          {series.map((serie) => (
            <div key={serie.id} className="space-y-2">
              <h3 className="text-xs font-medium">{serie.name}</h3>
              <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                {(serie.sets ?? []).map((set) => (
                  <li key={set.id}>
                    <Link
                      href={`/cards/sets/${set.id.toLowerCase()}`}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      {set.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </>
  );
}
