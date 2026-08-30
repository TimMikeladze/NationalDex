import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrainersIcon } from "@/components/navigation/app-icons";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { getGenerationName, resolveSpecies, toID } from "@/lib/pkmn";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { pokemonSprite } from "@/lib/sprites";
import {
  formatTrainerRole,
  getAllTrainers,
  getOtherAppearances,
  getTrainer,
  TRAINER_REGION_LABELS,
} from "@/lib/trainers";
import { TrainerCard } from "../client-page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllTrainers().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const trainer = getTrainer(slug);
  if (!trainer) return { title: "Trainer not found" };

  const role = formatTrainerRole(trainer.role);
  const region = TRAINER_REGION_LABELS[trainer.region];
  const title = `${trainer.name} — ${region} ${role}`;
  const description = [
    `${trainer.name} is the ${trainer.type ? `${trainer.type}-type ` : ""}${role} of ${trainer.location}, ${region} (${trainer.games}).`,
    trainer.badge ? `Awards the ${trainer.badge}.` : null,
    trainer.ace ? `Ace Pokémon: ${trainer.ace}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title,
    description,
    alternates: { canonical: `/trainers/${slug}` },
    openGraph: { title, description },
  };
}

export default async function TrainerDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const trainer = getTrainer(slug);
  if (!trainer) notFound();

  const ace = trainer.ace ? resolveSpecies(trainer.ace) : undefined;
  const others = getOtherAppearances(trainer);
  const role = formatTrainerRole(trainer.role);
  const region = TRAINER_REGION_LABELS[trainer.region];

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Role", value: role },
    { label: "Region", value: region },
    { label: "Generation", value: getGenerationName(trainer.generation) },
    { label: "Games", value: trainer.games },
    { label: "Location", value: trainer.location },
  ];
  if (trainer.badge) facts.push({ label: "Badge", value: trainer.badge });

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Trainers", path: "/trainers" },
          { name: trainer.name, path: `/trainers/${trainer.slug}` },
        ])}
      />

      <div className="p-4 md:p-6 space-y-8">
        <Link
          href="/trainers"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← All trainers
        </Link>

        <header className="flex items-start gap-4">
          <div className="size-24 shrink-0 flex items-center justify-center border rounded-lg bg-muted/30">
            {ace ? (
              <PokemonImage
                src={pokemonSprite(ace.name)}
                alt={ace.name}
                pokemonId={ace.num}
                width={96}
                height={96}
                priority
              />
            ) : (
              <TrainersIcon
                className="size-10 text-muted-foreground"
                strokeWidth={1}
              />
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {region} {role}
            </p>
            <h1 className="text-2xl font-semibold">{trainer.name}</h1>
            <div className="flex items-center gap-2">
              {trainer.type ? (
                <TypeBadge type={trainer.type} linkable />
              ) : (
                <span className="text-xs text-muted-foreground">
                  No type specialty
                </span>
              )}
            </div>
          </div>
        </header>

        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {facts.map((fact) => (
            <div key={fact.label} className="space-y-0.5">
              <dt className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {fact.label}
              </dt>
              <dd className="text-sm">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {ace && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Ace Pokémon</h2>
            <Link
              href={`/pokemon/${toID(ace.name)}`}
              className="group inline-flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <PokemonImage
                src={pokemonSprite(ace.name)}
                alt={ace.name}
                pokemonId={ace.num}
                width={48}
                height={48}
              />
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {ace.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{ace.num.toString().padStart(3, "0")} ·{" "}
                  {ace.types.join(" / ")}
                </p>
              </div>
            </Link>
          </section>
        )}

        {others.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Other appearances</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {others.map((other) => (
                <TrainerCard key={other.slug} trainer={other} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
