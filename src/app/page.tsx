import type { Metadata } from "next";
import { getAllSpecies, getAllTypes, toID } from "@/lib/pkmn";
import { faqJsonLd, itemListJsonLd, JsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/utils";
import { BrowseIndex } from "./browse-index";
import { DexBrowser } from "./dex-browser";

const speciesCount = getAllSpecies().length;

export const metadata: Metadata = {
  title: "NationalDex — The Complete Pokédex for Every Generation",
  description: `Look up all ${speciesCount} Pokémon: base stats, learnsets, abilities, type matchups, evolutions and TCG cards. Build teams, compare Pokémon and browse every generation from Red/Blue to Scarlet/Violet.`,
  alternates: {
    canonical: "/",
  },
};

const FAQS = [
  {
    question: "What is the National Pokédex?",
    answer: `The National Pokédex lists every Pokémon across all generations in one numbering, rather than only the ones that appear in a single pair of games. NationalDex covers all ${speciesCount} species plus regional forms, Mega Evolutions and Gigantamax forms.`,
  },
  {
    question: "How do I find a Pokémon's weaknesses?",
    answer:
      "Open any Pokémon's page and its weaknesses, resistances and immunities are listed under the type effectiveness section, calculated from both of its types for the generation you are viewing.",
  },
  {
    question: "Can I see older generations' stats and learnsets?",
    answer:
      "Yes. The generation picker switches the whole dex to a chosen generation's games, so base stats, types, abilities, learnsets and the type chart all match how they worked at the time.",
  },
  {
    question: "Does NationalDex cover the Pokémon Trading Card Game?",
    answer:
      "Yes. Card sets from the Pokémon TCG and Pokémon TCG Pocket are browsable, and each Pokémon's page lists the cards it appears on.",
  },
];

export default function HomePage() {
  const types = getAllTypes();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "NationalDex",
      url: SITE_URL,
      description:
        "A complete Pokédex covering every generation: stats, moves, abilities, items, type matchups and trading cards.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    itemListJsonLd(
      "Pokémon types",
      types.map((type) => ({
        name: `${type.name} type`,
        path: `/types/${toID(type.name)}`,
      })),
    ),
    faqJsonLd(FAQS),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <h1 className="sr-only">
        National Pokédex — every Pokémon, every generation
      </h1>

      <DexBrowser />

      <section className="border-t px-4 py-8 md:px-6 space-y-4">
        <h2 className="text-sm font-medium">Frequently asked questions</h2>
        <dl className="space-y-4 max-w-3xl">
          {FAQS.map((faq) => (
            <div key={faq.question} className="space-y-1">
              <dt className="text-xs font-medium">{faq.question}</dt>
              <dd className="text-xs text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <BrowseIndex />
    </>
  );
}
