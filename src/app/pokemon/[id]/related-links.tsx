import { Dex } from "@pkmn/dex";
import { RelatedLinks } from "@/components/seo/related-links";
import { getPokemonMoves } from "@/lib/learnsets";
import {
  getAllSpecies,
  type getSpecies,
  getTypeMatchups,
  LATEST_GEN,
  toID,
} from "@/lib/pkmn";

/**
 * `getSpecies` reads through both the generation-scoped dex and the global one,
 * which describe a species with slightly different shapes.
 */
type AnySpecies = NonNullable<ReturnType<typeof getSpecies>>;

/** Level-up moves are the ones a reader actually looks up, so they lead. */
const MAX_MOVE_LINKS = 24;
/** Enough to walk the dex in either direction without burying the page. */
const DEX_NEIGHBOURS = 3;

function baseFormsByDexNumber() {
  return getAllSpecies(LATEST_GEN)
    .slice()
    .sort((a, b) => a.num - b.num);
}

function evolutionLine(species: AnySpecies) {
  const line = new Map<string, string>();

  let root = species;
  while (root.prevo) {
    const prev = Dex.species.get(root.prevo);
    if (!prev?.exists) break;
    root = prev;
  }

  const walk = (current: AnySpecies) => {
    if (current.name !== species.name)
      line.set(toID(current.name), current.name);
    for (const evoName of current.evos ?? []) {
      const evo = Dex.species.get(evoName);
      if (evo?.exists) walk(evo);
    }
  };
  walk(root);

  return [...line].map(([slug, name]) => ({
    label: name,
    href: `/pokemon/${slug}`,
  }));
}

/**
 * Crawlable links out of a Pokemon page: its types, abilities, evolution line,
 * dex neighbours and the moves it learns. Server-rendered, so this is the only
 * part of the page a crawler can follow before JavaScript runs.
 */
export async function PokemonRelatedLinks({
  species,
}: {
  species: AnySpecies;
}) {
  const matchups = getTypeMatchups([...species.types], LATEST_GEN);

  const dexOrder = baseFormsByDexNumber();
  const index = dexOrder.findIndex((s) => s.num === species.num);
  const neighbours =
    index === -1
      ? []
      : [
          ...dexOrder.slice(Math.max(0, index - DEX_NEIGHBOURS), index),
          ...dexOrder.slice(index + 1, index + 1 + DEX_NEIGHBOURS),
        ];

  const learnset = await getPokemonMoves(species.name, LATEST_GEN).catch(
    () => [],
  );
  const moveLinks = learnset
    .filter((move) => move.learnMethod === "level-up")
    .slice(0, MAX_MOVE_LINKS)
    .map((move) => ({ label: move.name, href: `/moves/${toID(move.name)}` }));

  return (
    <RelatedLinks
      heading={`More about ${species.name}`}
      groups={[
        {
          label: "Types",
          links: species.types.map((type) => ({
            label: `${type} type`,
            href: `/types/${toID(type)}`,
          })),
        },
        {
          label: "Abilities",
          links: Object.values(species.abilities)
            .filter(Boolean)
            .map((ability) => ({
              label: ability as string,
              href: `/abilities/${toID(ability as string)}`,
            })),
        },
        {
          label: "Evolution line",
          links: evolutionLine(species),
        },
        {
          label: "Weak to",
          links: matchups.weaknesses.map(({ type }) => ({
            label: `${type} type`,
            href: `/types/${toID(type)}`,
          })),
        },
        {
          label: "Nearby in the Pokédex",
          links: neighbours.map((s) => ({
            label: `#${String(s.num).padStart(4, "0")} ${s.name}`,
            href: `/pokemon/${toID(s.name)}`,
          })),
        },
        {
          label: "Moves it learns",
          links: moveLinks,
        },
      ]}
    />
  );
}
