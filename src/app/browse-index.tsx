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
 * One collapsed group of links.
 *
 * `details` rather than a toggle built out of state: the markup is complete on
 * the server with no JavaScript, which is the whole point of this index, and a
 * crawler reads a closed `details` the same as an open one. The heading stays
 * inside the summary so the page keeps its outline.
 */
function IndexSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <h2 className="text-sm font-medium">{title}</h2>
      </summary>
      <div className="space-y-6 pb-6">{children}</div>
    </details>
  );
}

function LinkList({
  links,
}: {
  links: { key: string; href: string; label: string }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {links.map((link) => (
        <li key={link.key}>
          <Link
            href={link.href}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Every Pokemon in the National Dex as a plain list of links, grouped by the
 * generation it debuted in.
 *
 * The dex above it is virtualized, so the HTML only ever contains the first
 * screenful — a crawler arriving at the site root could reach barely a dozen
 * Pokemon and had no path to the rest. This is that path: static markup, no
 * JavaScript, one link per page in the sitemap.
 *
 * It is shipped collapsed. Left open it ran to some nine thousand pixels of
 * link text under the dex, which a reader scrolling the grid — or landing
 * there after a filter shortened the page — fell into with no warning.
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
  const speciesCount = getAllSpecies().length;

  return (
    <div className="border-t px-4 py-6 md:px-6">
      <p className="pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        Browse every page
      </p>

      <IndexSection title="Pokémon by type">
        <LinkList
          links={types.map((type) => ({
            key: type.name,
            href: `/types/${toID(type.name)}`,
            label: `${type.name} type Pokémon`,
          }))}
        />
      </IndexSection>

      <IndexSection
        title={`The complete National Pokédex, by generation (${speciesCount} Pokémon)`}
      >
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
              <LinkList
                links={list.map((species) => ({
                  key: species.name,
                  href: `/pokemon/${toID(species.name)}`,
                  label: species.name,
                }))}
              />
            </div>
          );
        })}
      </IndexSection>

      {/* Abilities and items have no index route of their own — the dex reaches
          them through its filter tabs, which are client-rendered. These lists
          are the only crawlable path to those pages. */}
      <IndexSection title="All Pokémon abilities">
        <LinkList
          links={getAllAbilities()
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((ability) => ({
              key: ability.name,
              href: `/abilities/${toID(ability.name)}`,
              label: formatName(ability.name),
            }))}
        />
      </IndexSection>

      <IndexSection title="All Pokémon items">
        <LinkList
          links={getAllItems()
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => ({
              key: item.name,
              href: `/items/${toID(item.name)}`,
              label: formatName(item.name),
            }))}
        />
      </IndexSection>
    </div>
  );
}
