import Link from "@/components/link";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { PokemonSwipePageClient } from "./client-page";

export default function PokemonSwipePage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Pokédex", path: "/" },
      { name: "Swipe", path: "/pokemon/swipe" },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* The deck is dealt in the browser, so this is the crawlable
          description of the route and the way back into the dex. */}
      <h1 className="sr-only">Swipe through Pokémon</h1>
      <noscript>
        <p className="px-4 py-6 text-sm">
          Swiping needs JavaScript.{" "}
          <Link href="/" className="underline underline-offset-4">
            Browse the Pokédex
          </Link>{" "}
          instead.
        </p>
      </noscript>

      <PokemonSwipePageClient />
    </>
  );
}
