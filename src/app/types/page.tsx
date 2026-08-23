import Link from "next/link";
import {
  getAllTypes,
  getOffensiveTypeMatchups,
  getTypeMatchups,
  LATEST_GEN,
  toID,
} from "@/lib/pkmn";
import { PrefetchBoundary } from "@/lib/prefetch";
import { allTypesQuery } from "@/lib/queries";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, JsonLd } from "@/lib/seo";
import { TypesPageClient } from "./client";

export default function TypesPage() {
  const types = getAllTypes();

  const jsonLd = [
    breadcrumbJsonLd([{ name: "Types", path: "/types" }]),
    itemListJsonLd(
      "Pokémon types",
      types.map((type) => ({
        name: `${type.name} type`,
        path: `/types/${toID(type.name)}`,
      })),
    ),
    // One entry per type, because "what is X weak to" is asked one type at a
    // time and this is the page that answers all eighteen.
    faqJsonLd(
      types.map((type) => {
        const defense = getTypeMatchups([type.name], LATEST_GEN);
        return {
          question: `What is ${type.name} type weak to?`,
          answer: `${type.name}-type Pokémon take double damage from ${
            defense.weaknesses.map((w) => w.type).join(", ") || "no types"
          }.`,
        };
      }),
    ),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PrefetchBoundary queries={[allTypesQuery(null)]}>
        <TypesPageClient />
      </PrefetchBoundary>
      <section className="border-t px-4 py-8 md:px-6 space-y-4">
        <h2 className="text-sm font-medium">Type matchups at a glance</h2>
        <ul className="space-y-2 max-w-4xl">
          {types.map((type) => {
            const offense = getOffensiveTypeMatchups(type.name);
            const defense = getTypeMatchups([type.name], LATEST_GEN);
            return (
              <li key={type.name} className="text-xs text-muted-foreground">
                <Link
                  href={`/types/${toID(type.name)}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {type.name} type
                </Link>{" "}
                is super effective against{" "}
                {offense.superEffective.join(", ") || "no types"}, and weak to{" "}
                {defense.weaknesses.map((w) => w.type).join(", ") || "no types"}
                .
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
