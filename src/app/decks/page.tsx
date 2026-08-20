"use client";

import { Copy, Download, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DecksIcon } from "@/components/navigation/app-icons";
import { DeckFormatBadge } from "@/components/tcg/deck/deck-format-picker";
import { TcgCardImage } from "@/components/tcg/tcg-card-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDecks } from "@/hooks/use-decks";
import { useTcgCardFetcher } from "@/hooks/use-tcg";
import { analyzeDeck, isPokemon, toDeckCard } from "@/lib/deck";
import { parseDeckInput } from "@/lib/deck-share";
import { cn } from "@/lib/utils";
import type { Deck, DeckEntry, DeckFormatId } from "@/types/deck";
import {
  DECK_FORMAT_IDS,
  DECK_FORMATS,
  DEFAULT_DECK_FORMAT_ID,
  deckFormat,
} from "@/types/deck";
import { DEFAULT_TCG_LANGUAGE } from "@/types/tcg";

/**
 * Every deck you are building, and a way into a new one.
 *
 * A deck is a format plus sixty cards, so choosing the format is the whole of
 * making one: it decides the card pool the builder searches, how many cards go
 * in, and everything the list is checked against.
 */
export default function DecksPage() {
  const router = useRouter();
  const {
    decks,
    isLoaded,
    createDeck,
    deleteDeck,
    duplicateDeck,
    replaceEntries,
  } = useDecks();
  const { resolve } = useTcgCardFetcher(DEFAULT_TCG_LANGUAGE);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState<DeckFormatId>(
    DEFAULT_DECK_FORMAT_ID,
  );
  const [pasted, setPasted] = useState("");
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...decks].sort((a, b) => b.updatedAt - a.updatedAt),
    [decks],
  );

  const handleCreate = () => {
    const format = DECK_FORMATS[newFormat];
    const deck = createDeck(
      newName.trim() || `New ${format.name} deck`,
      newFormat,
      DEFAULT_TCG_LANGUAGE,
    );
    setNewName("");
    setNewFormat(DEFAULT_DECK_FORMAT_ID);
    setIsCreateOpen(false);
    router.push(`/decks/${deck.id}`);
  };

  const handleImport = async () => {
    const parsed = parseDeckInput(pasted);
    if (!parsed) {
      toast.error("That does not look like a deck code or a deck list.");
      return;
    }

    setImporting(true);
    try {
      const formatId = (parsed.formatId ??
        DEFAULT_DECK_FORMAT_ID) as DeckFormatId;
      const deck = createDeck(
        parsed.name ?? "Imported deck",
        formatId in DECK_FORMATS ? formatId : DEFAULT_DECK_FORMAT_ID,
        DEFAULT_TCG_LANGUAGE,
      );

      const resolved = await Promise.all(
        parsed.cards.map(async (entry) => {
          const card = await resolve(entry.id).catch(() => null);
          if (!card) return null;
          return {
            card: toDeckCard(card),
            count: entry.count,
            addedAt: Date.now(),
          } satisfies DeckEntry;
        }),
      );

      const entries = resolved.filter(
        (entry): entry is DeckEntry => entry !== null,
      );
      replaceEntries(deck.id, entries);
      setPasted("");
      setIsImportOpen(false);
      router.push(`/decks/${deck.id}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">decks</h1>
          <p className="text-xs text-muted-foreground">
            {decks.length} deck{decks.length === 1 ? "" : "s"} on this device
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsImportOpen(true)}
            title="Import a deck from a code or list"
          >
            <Download className="size-4" />
            <span className="ml-1 hidden sm:inline">import</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4" />
            new deck
          </Button>
        </div>
      </div>

      {!isLoaded ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={`deck-card-skeleton-${index}`} className="h-36" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState onCreate={() => setIsCreateOpen(true)} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((deck) => (
            <li key={deck.id}>
              <DeckCard
                deck={deck}
                onDuplicate={() => {
                  const copy = duplicateDeck(deck.id);
                  if (copy) toast.success(`Copied ${deck.name}`);
                }}
                onDelete={() => setConfirmDelete(deck.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* New deck — the format is the question worth asking up front */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New deck</DialogTitle>
            <DialogDescription>
              The format decides which cards the builder will offer you, and
              what the list is checked against.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="deck-name" className="text-sm font-medium">
                name
              </label>
              <Input
                id="deck-name"
                placeholder="Charizard ex"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreate();
                }}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">format</legend>
              <div className="space-y-1">
                {DECK_FORMAT_IDS.map((id) => {
                  const option = DECK_FORMATS[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setNewFormat(id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md border p-2 text-left transition-colors",
                        newFormat === id
                          ? "border-foreground bg-muted"
                          : "hover:bg-muted",
                      )}
                    >
                      <DeckFormatBadge format={option} className="mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium">
                          {option.name}
                        </span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">
                          {option.blurb}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={handleCreate}>
              start building
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import — a deck someone sent you */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import a deck</DialogTitle>
            <DialogDescription>
              Paste a deck code, or a deck list whose lines end in a set and
              card number.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={8}
            placeholder="4 Charmander MEW 4..."
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!pasted.trim() || importing}
            >
              {importing && <Loader2 className="size-3.5 animate-spin" />}
              import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this deck?</DialogTitle>
            <DialogDescription>
              The deck and its list are removed from this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
            >
              cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirmDelete) deleteDeck(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A deck at a glance: what it plays, how far along it is, and its shape. */
function DeckCard({
  deck,
  onDuplicate,
  onDelete,
}: {
  deck: Deck;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const format = deckFormat(deck.formatId);
  const analysis = useMemo(() => analyzeDeck(deck, format), [deck, format]);

  // The cards a player would recognise the deck by: its Pokemon, most-played
  // first. A deck is named after what it attacks with.
  const spine = useMemo(
    () =>
      [...deck.entries]
        .filter((entry) => isPokemon(entry.card))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    [deck.entries],
  );

  const complete = analysis.total === format.deckSize;

  return (
    <div className="group relative flex h-full flex-col gap-3 border p-3 transition-colors hover:bg-muted/40">
      <Link
        href={`/decks/${deck.id}`}
        className="flex-1 space-y-3 outline-none"
      >
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {deck.name}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5">
              <DeckFormatBadge format={format} />
              <span
                className={cn(
                  "text-xs tabular-nums",
                  complete
                    ? "text-emerald-600 dark:text-emerald-500"
                    : "text-muted-foreground",
                )}
              >
                {analysis.total}/{format.deckSize}
              </span>
            </span>
          </span>
        </div>

        {spine.length > 0 ? (
          <div className="flex -space-x-6">
            {spine.map((entry, index) => (
              <span
                key={entry.card.id}
                className="w-14 shrink-0 transition-transform group-hover:translate-x-0"
                style={{ zIndex: spine.length - index }}
              >
                <TcgCardImage
                  image={entry.card.image}
                  alt={entry.card.name}
                  localId={entry.card.localId}
                  className="w-full"
                />
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Empty — pick up where you left off.
          </p>
        )}

        <p className="flex gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{analysis.pokemon} pokemon</span>
          <span>{analysis.trainer} trainers</span>
          {format.usesEnergyCards && <span>{analysis.energy} energy</span>}
        </p>
      </Link>

      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={onDuplicate}
          title={`Duplicate ${deck.name}`}
          aria-label={`Duplicate ${deck.name}`}
          className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Copy className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title={`Delete ${deck.name}`}
          aria-label={`Delete ${deck.name}`}
          className="p-1.5 text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed px-6 py-16 text-center">
      <DecksIcon className="size-6 text-muted-foreground" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="text-sm font-medium">No decks yet</p>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
          A deck builder for every deck: pick a format, drag cards in from the
          pool, and watch the binder group them by card type as they land. The
          list is checked as you build — sixty cards, four of a name, one ACE
          SPEC, and enough Basics to actually start a game.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onCreate}>
        <Plus className="size-4" />
        build your first deck
      </Button>
    </div>
  );
}
