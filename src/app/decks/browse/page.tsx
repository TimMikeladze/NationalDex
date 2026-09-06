import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { DeckFormatBadge } from "@/components/tcg/deck/deck-format-picker";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { deck } from "@/db/schema";
import { deckFormat } from "@/types/deck";

export const metadata: Metadata = {
  title: "Browse shared decks",
  description: "Public decks other players have shared on NationalDex.",
};

// Rendered per request: a deck shared a minute ago must show up now, and the
// build must not need a database.
export const dynamic = "force-dynamic";

async function getPublicDecks() {
  return db
    .select()
    .from(deck)
    .where(and(eq(deck.visibility, "public"), isNotNull(deck.shareSlug)))
    .orderBy(desc(deck.sharedAt));
}

export default async function BrowseDecksPage() {
  const decks = await getPublicDecks();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-medium">Browse shared decks</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Public decks shared by other trainers
        </p>
      </div>

      {decks.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">no public decks yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map((row) => {
            const format = deckFormat(row.formatId);
            return (
              <Link key={row.id} href={`/decks/share/${row.shareSlug}`}>
                <Card className="hover:bg-muted/50 transition-colors h-full">
                  <CardHeader>
                    <CardTitle>{row.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <DeckFormatBadge format={format} />
                      {row.sharedAt && (
                        <span>
                          {new Date(row.sharedAt).toLocaleDateString()}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
