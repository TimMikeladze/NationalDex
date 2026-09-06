import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeckFormatBadge } from "@/components/tcg/deck/deck-format-picker";
import { TcgCardImage } from "@/components/tcg/tcg-card-image";
import { Button } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/api-session";
import { analyzeDeck, type DeckSection, sectionOf } from "@/lib/deck";
import { getSharedDeck } from "@/lib/server/decks";
import type { DeckEntry } from "@/types/deck";
import { deckFormat } from "@/types/deck";
import { CloneDeckButton } from "./clone-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const shared = await getSharedDeck(slug);
  if (!shared) {
    return { title: "Deck not found" };
  }
  return {
    title: shared.deck.name,
    description: `A shared ${deckFormat(shared.deck.formatId).name} deck on NationalDex.`,
  };
}

const SECTION_ORDER: DeckSection[] = ["Pokemon", "Trainer", "Energy"];

export default async function SharedDeckPage({ params }: PageProps) {
  const { slug } = await params;
  const [shared, viewerId] = await Promise.all([
    getSharedDeck(slug),
    getSessionUserId(),
  ]);
  if (!shared) {
    notFound();
  }

  const { deck: sharedDeck, ownerId } = shared;
  const format = deckFormat(sharedDeck.formatId);
  const analysis = analyzeDeck(sharedDeck, format);

  const grouped: Partial<Record<DeckSection, DeckEntry[]>> = {};
  for (const entry of sharedDeck.entries) {
    const section = sectionOf(entry.card);
    grouped[section] ??= [];
    grouped[section].push(entry);
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium">{sharedDeck.name}</h1>
            <DeckFormatBadge format={format} />
          </div>
          {sharedDeck.notes && (
            <p className="mt-1 text-xs text-muted-foreground">
              {sharedDeck.notes}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {analysis.total}/{format.deckSize} cards · shared deck
          </p>
        </div>
        {/* The owner following their own link gets sent home, not a duplicate. */}
        {viewerId === ownerId ? (
          <Button asChild variant="outline">
            <Link href={`/decks/${sharedDeck.id}`}>
              Open in your collection
            </Link>
          </Button>
        ) : (
          <CloneDeckButton slug={slug} />
        )}
      </div>

      {sharedDeck.entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">this deck is empty</p>
        </div>
      ) : (
        <div className="space-y-8">
          {SECTION_ORDER.map((section) => {
            const sectionEntries = grouped[section];
            if (!sectionEntries || sectionEntries.length === 0) return null;
            const count = sectionEntries.reduce(
              (sum, entry) => sum + entry.count,
              0,
            );

            return (
              <div key={section}>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {section} ({count})
                </h2>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {[...sectionEntries]
                    .sort((a, b) => b.count - a.count)
                    .map((entry) => (
                      <div key={entry.card.id} className="relative">
                        <TcgCardImage
                          image={entry.card.image}
                          alt={entry.card.name}
                          localId={entry.card.localId}
                          setName={entry.card.setName}
                          className="rounded-md"
                        />
                        <span className="absolute right-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums shadow">
                          x{entry.count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
