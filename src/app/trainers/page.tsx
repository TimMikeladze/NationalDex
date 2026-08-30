import Link from "next/link";
import { getGenerationName } from "@/lib/pkmn";
import { breadcrumbJsonLd, itemListJsonLd, JsonLd } from "@/lib/seo";
import {
  formatTrainerRole,
  getAllTrainers,
  getTrainerGenerations,
} from "@/lib/trainers";
import { TrainersPageClient } from "./client-page";

export default function TrainersPage() {
  const trainers = getAllTrainers();
  const generations = getTrainerGenerations();

  const jsonLd = [
    breadcrumbJsonLd([{ name: "Trainers", path: "/trainers" }]),
    itemListJsonLd(
      "Pokémon gym leaders, Elite Four and champions",
      trainers.map((trainer) => ({
        name: trainer.name,
        path: `/trainers/${trainer.slug}`,
      })),
    ),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <h1 className="sr-only">
        Pokémon trainers — gym leaders, Elite Four and champions across every
        generation
      </h1>

      <TrainersPageClient />

      <nav
        aria-label="All trainers by generation"
        className="border-t px-4 py-8 md:px-6 space-y-6"
      >
        <h2 className="text-sm font-medium">All trainers by generation</h2>
        {generations.map((gen) => (
          <div key={gen} className="space-y-2">
            <h3 className="text-xs font-medium">{getGenerationName(gen)}</h3>
            <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
              {trainers
                .filter((t) => t.generation === gen)
                .map((trainer) => (
                  <li key={trainer.slug}>
                    <Link
                      href={`/trainers/${trainer.slug}`}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      {trainer.name} ({formatTrainerRole(trainer.role)})
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
