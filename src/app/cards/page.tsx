import Link from "next/link";
import { breadcrumbJsonLd, itemListJsonLd, JsonLd } from "@/lib/seo";
import { getTcgSeriesWithSets } from "@/lib/tcg";
import { CardsPageClient } from "./client-page";

export default async function CardsPage() {
  const series = await getTcgSeriesWithSets().catch(() => []);
  const sets = series.flatMap((serie) =>
    (serie.sets ?? []).map((set) => ({ ...set, serieName: serie.name })),
  );

  const jsonLd = [
    breadcrumbJsonLd([{ name: "Cards", path: "/cards" }]),
    itemListJsonLd(
      "Pokémon card sets",
      sets.map((set) => ({
        name: set.name,
        path: `/cards/sets/${set.id.toLowerCase()}`,
      })),
    ),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <h1 className="sr-only">Pokémon cards — search the TCG and TCG Pocket</h1>

      <CardsPageClient />

      {/* The card grid is fetched and paged in the browser, so this is the
          crawlable route into the set pages. */}
      {sets.length > 0 && (
        <nav
          aria-label="All card sets"
          className="border-t px-4 py-8 md:px-6 space-y-3"
        >
          <h2 className="text-sm font-medium">
            Browse cards by set{" "}
            <span className="text-muted-foreground font-normal">
              ({sets.length})
            </span>
          </h2>
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
            {sets.map((set) => (
              <li key={`${set.serieName}-${set.id}`}>
                <Link
                  href={`/cards/sets/${set.id.toLowerCase()}`}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  {set.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
