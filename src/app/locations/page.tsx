import Link from "next/link";
import { getAllRegions } from "@/lib/pokeapi";
import { breadcrumbJsonLd, itemListJsonLd, JsonLd } from "@/lib/seo";
import { LocationsPageClient } from "./client-page";

export default async function LocationsPage() {
  const regions = await getAllRegions().catch(() => []);

  const jsonLd = [
    breadcrumbJsonLd([{ name: "Locations", path: "/locations" }]),
    itemListJsonLd(
      "Pokémon regions",
      regions.map((region) => ({
        name: region.displayName,
        path: `/locations#${region.name}`,
      })),
    ),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <h1 className="sr-only">
        Pokémon locations — where to catch every Pokémon
      </h1>

      <LocationsPageClient />

      {regions.length > 0 && (
        <nav
          aria-label="All locations by region"
          className="border-t px-4 py-8 md:px-6 space-y-6"
        >
          <h2 className="text-sm font-medium">All locations by region</h2>
          {regions.map((region) => (
            <div key={region.id} className="space-y-2">
              <h3 className="text-xs font-medium">{region.displayName}</h3>
              <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                {region.locations.map((location) => (
                  <li key={location.name}>
                    <Link
                      href={`/locations/${location.name}`}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      {location.displayName}
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
