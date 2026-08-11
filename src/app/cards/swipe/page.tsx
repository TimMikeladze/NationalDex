import Link from "next/link";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { SwipePageClient } from "./client-page";

export default function CardsSwipePage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Cards", path: "/cards" },
      { name: "Swipe", path: "/cards/swipe" },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* The deck itself is fetched in the browser, so this is the crawlable
          description of what the route is and the way back into the grid. */}
      <h1 className="sr-only">Swipe through Pokémon cards</h1>
      <noscript>
        <p className="px-4 py-6 text-sm">
          Swiping needs JavaScript.{" "}
          <Link href="/cards" className="underline underline-offset-4">
            Browse the card grid
          </Link>{" "}
          instead.
        </p>
      </noscript>

      <SwipePageClient />
    </>
  );
}
