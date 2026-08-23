import Link from "next/link";
import { getAllMoves, getAllTypes, toID } from "@/lib/pkmn";
import { breadcrumbJsonLd, itemListJsonLd, JsonLd } from "@/lib/seo";
import { MovesPageClient } from "./client";

export default function MovesPage() {
  const moves = getAllMoves();
  const types = getAllTypes();

  const movesByType = new Map<string, { name: string }[]>();
  for (const move of moves) {
    const list = movesByType.get(move.type) ?? [];
    list.push({ name: move.name });
    movesByType.set(move.type, list);
  }

  const jsonLd = [
    breadcrumbJsonLd([{ name: "Moves", path: "/moves" }]),
    itemListJsonLd(
      "Pokémon moves",
      moves.map((move) => ({
        name: move.name,
        path: `/moves/${toID(move.name)}`,
      })),
    ),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <h1 className="sr-only">
        Pokémon moves — every move, with power, accuracy and learnsets
      </h1>

      <MovesPageClient />

      {/* The list above is paginated as you scroll, so this is the complete,
          crawlable index of move pages. */}
      <div className="border-t px-4 py-8 md:px-6 space-y-6">
        <h2 className="text-sm font-medium">All moves by type</h2>
        {types.map((type) => {
          const list = (movesByType.get(type.name) ?? []).sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          if (list.length === 0) return null;

          return (
            <div key={type.name} className="space-y-2">
              <h3 className="text-xs font-medium">
                <Link
                  href={`/types/${toID(type.name)}`}
                  className="underline-offset-4 hover:underline"
                >
                  {type.name} type moves
                </Link>{" "}
                <span className="text-muted-foreground font-normal">
                  ({list.length})
                </span>
              </h3>
              <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                {list.map((move) => (
                  <li key={move.name}>
                    <Link
                      href={`/moves/${toID(move.name)}`}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      {move.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
