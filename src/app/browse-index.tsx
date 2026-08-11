import Link from "next/link";
import {
  formatName,
  GENERATIONS,
  getAllAbilities,
  getAllItems,
  getAllSpecies,
  getAllTypes,
  getGenerationGames,
  getGenerationName,
  toID,
} from "@/lib/pkmn";

/**
 * Every Pokemon in the National Dex as a plain list of links, grouped by the
 * generation it debuted in.
 *
 * The dex above it is virtualized, so the HTML only ever contains the first
 * screenful — a crawler arriving at the site root could reach barely a dozen
 * Pokemon and had no path to the rest. This is that path: static markup, no
 * JavaScript, one link per page in the sitemap.
 */
export function BrowseIndex() {
  const speciesByGeneration = new Map<
    number,
    { name: string; num: number }[]
  >();

  for (const species of getAllSpecies()) {
    const list = speciesByGeneration.get(species.gen) ?? [];
    list.push({ name: species.name, num: species.num });
    speciesByGeneration.set(species.gen, list);
  }

  const types = getAllTypes();

  return (
    <div className="border-t px-4 py-8 md:px-6 space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Browse Pokémon by type</h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {types.map((type) => (
            <li key={type.name}>
              <Link
                href={`/types/${toID(type.name)}`}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                {type.name} type Pokémon
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-medium">
          The complete National Pokédex, by generation
        </h2>
        {GENERATIONS.map((generation) => {
          const list = (speciesByGeneration.get(generation.num) ?? []).sort(
            (a, b) => a.num - b.num,
          );
          if (list.length === 0) return null;

          return (
            <div key={generation.num} className="space-y-2">
              <h3 className="text-xs font-medium">
                {getGenerationName(generation.num)} —{" "}
                {getGenerationGames(generation.num)}{" "}
                <span className="text-muted-foreground font-normal">
                  ({list.length} Pokémon)
                </span>
              </h3>
              <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                {list.map((species) => (
                  <li key={species.name}>
                    <Link
                      href={`/pokemon/${toID(species.name)}`}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      {species.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {/* Abilities and items have no index route of their own — the dex reaches
          them through its filter tabs, which are client-rendered. These lists
          are the only crawlable path to those pages. */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">All Pokémon abilities</h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {getAllAbilities()
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((ability) => (
              <li key={ability.name}>
                <Link
                  href={`/abilities/${toID(ability.name)}`}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  {formatName(ability.name)}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">All Pokémon items</h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {getAllItems()
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => (
              <li key={item.name}>
                <Link
                  href={`/items/${toID(item.name)}`}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  {formatName(item.name)}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
