import Link from "next/link";
import { getAllTypes, toID } from "@/lib/pkmn";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/lib/seo";
import { WhosThatPokemonClient } from "./client-page";

const FAQS = [
  {
    question: "How do you play Who's That Pokémon?",
    answer:
      "A Pokémon's silhouette is shown with its colours blacked out. Type its name to guess. Guess right and your streak grows; ask for a hint or reveal the answer and you score fewer points.",
  },
  {
    question: "Can I limit the quiz to one generation?",
    answer:
      "Yes. Pick a generation and only Pokémon introduced in those games are used, so you can practise Kanto alone or work up to Paldea.",
  },
  {
    question: "Is there a harder mode?",
    answer:
      "Hard mode is worth more points and gives you less to work with, while easy mode is more forgiving. Hints cost a point when you use them.",
  },
];

export default function WhosThatPokemonPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Who's That Pokémon?", path: "/whos-that-pokemon" },
    ]),
    faqJsonLd(FAQS),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="border-b px-4 py-5 md:px-6 space-y-2">
        <h1 className="text-lg font-medium">
          Who&rsquo;s That Pokémon? — the silhouette guessing game
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Guess the Pokémon from its silhouette, the way the anime did it.
          Choose a difficulty, narrow the quiz to a single generation, and build
          a streak. Every answer links back to its{" "}
          <Link href="/" className="underline underline-offset-4">
            Pokédex entry
          </Link>
          , so a miss is a chance to learn the stats.
        </p>
      </div>

      <WhosThatPokemonClient />

      <section className="border-t px-4 py-8 md:px-6 space-y-4">
        <h2 className="text-sm font-medium">How it works</h2>
        <dl className="space-y-4 max-w-3xl">
          {FAQS.map((faq) => (
            <div key={faq.question} className="space-y-1">
              <dt className="text-xs font-medium">{faq.question}</dt>
              <dd className="text-xs text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav
        aria-label="Brush up by type"
        className="border-t px-4 py-8 md:px-6 space-y-3"
      >
        <h2 className="text-sm font-medium">Brush up by type</h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {getAllTypes().map((type) => (
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
      </nav>
    </>
  );
}
