"use client";

import {
  ArrowLeft,
  Check,
  CircleAlert,
  Ellipsis,
  Eraser,
  LayoutGrid,
  List,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DeckAnalysisPanel } from "@/components/tcg/deck/deck-analysis";
import { DeckBinder, type DeckView } from "@/components/tcg/deck/deck-binder";
import {
  DeckDragProvider,
  type DragCard,
  dropZoneClasses,
  useDeckDropZone,
} from "@/components/tcg/deck/deck-drag";
import {
  DeckFormatPicker,
  formatRulesSummary,
} from "@/components/tcg/deck/deck-format-picker";
import { DeckIssues } from "@/components/tcg/deck/deck-issues";
import { DeckSearchPanel } from "@/components/tcg/deck/deck-search-panel";
import { DeckShareDialog } from "@/components/tcg/deck/deck-share-dialog";
import { TcgCardLightbox } from "@/components/tcg/tcg-card-lightbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type DeckPool, useDeckPool } from "@/hooks/use-deck-pool";
import { useDecks } from "@/hooks/use-decks";
import { useTcgCardFetcher } from "@/hooks/use-tcg";
import {
  analyzeDeck,
  cardPoolReason,
  type DeckGroup,
  type DeckIssue,
  groupDeck,
  isDeckLegal,
  toCardBrief,
  toDeckCard,
  validateDeck,
} from "@/lib/deck";
import type { ParsedDeck } from "@/lib/deck-share";
import { cn } from "@/lib/utils";
import type {
  Deck,
  DeckEntry,
  DeckFormat,
  DeckFormatId,
  DeckGrouping,
} from "@/types/deck";
import { DECK_GROUPINGS, deckFormat, emptyDeck } from "@/types/deck";
import type { TcgCardBrief, TcgLanguage } from "@/types/tcg";
import { DEFAULT_TCG_LANGUAGE, TCG_ENERGY_COLORS } from "@/types/tcg";

export function DeckBuilder({ deckId }: { deckId: string }) {
  return (
    <DeckDragProvider>
      <Builder deckId={deckId} />
    </DeckDragProvider>
  );
}

/** Two panes side by side is a desktop shape; below that they are tabs. */
function useIsWide() {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isWide;
}

/**
 * The deck builder.
 *
 * One deck, its own page, and the two halves of building it side by side: the
 * binder the deck is becoming, and the pool it is drawn from. Cards move
 * between them by being dragged, because that is what building a deck is, and
 * they file themselves under the right heading as they land. Everything the
 * format decides — sixty cards, four of a name, which sets are even legal — is
 * checked as you build rather than at the end.
 */
function Builder({ deckId }: { deckId: string }) {
  const router = useRouter();
  const isWide = useIsWide();

  const {
    isLoaded,
    getDeck,
    updateDeck,
    deleteDeck,
    addCard,
    removeCard,
    clearDeck,
    replaceEntries,
  } = useDecks();

  const stored = getDeck(deckId);
  const fallback = useMemo(() => emptyDeck(deckId, "Deck"), [deckId]);
  const deck = stored ?? fallback;

  const format = deckFormat(deck.formatId);
  const language: TcgLanguage = deck.language ?? DEFAULT_TCG_LANGUAGE;
  const pool = useDeckPool(format, language);
  const { resolve } = useTcgCardFetcher(language);

  const [view, setView] = useState<DeckView>("binder");
  const [grouping, setGrouping] = useState<DeckGrouping>("card-type");
  const [tab, setTab] = useState("deck");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [peek, setPeek] = useState<{
    cards: TcgCardBrief[];
    index: number;
  } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(deck.name);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirm, setConfirm] = useState<"clear" | "delete" | null>(null);

  // A deck deleted in another tab should not leave the builder sitting on
  // nothing.
  useEffect(() => {
    if (isLoaded && !stored) router.replace("/decks");
  }, [isLoaded, stored, router]);

  useEffect(() => {
    setDraftName(deck.name);
  }, [deck.name]);

  const analysis = useMemo(() => analyzeDeck(deck, format), [deck, format]);

  const issues = useMemo(
    () => validateDeck(deck, format, analysis, pool.context),
    [deck, format, analysis, pool.context],
  );

  const groups = useMemo(
    () => groupDeck(deck, grouping, TCG_ENERGY_COLORS),
    [deck, grouping],
  );

  /** Cards this format will not have, and why — shown on the card itself. */
  const illegal = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of deck.entries) {
      const reason = cardPoolReason(entry.card, format, pool.context);
      if (reason) map.set(entry.card.id, reason);
    }
    return map;
  }, [deck.entries, format, pool.context]);

  const binderCards = useMemo(
    () =>
      groups.flatMap((group) =>
        group.entries.map((entry) => toCardBrief(entry.card)),
      ),
    [groups],
  );

  const legal = isDeckLegal(issues);
  const errorCount = issues.filter((issue) => issue.level === "error").length;

  const markPending = useCallback((id: string, pending: boolean) => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /**
   * Puts a card in the deck. A search result is a name and a scan, so the rest
   * of the card is fetched before it can be counted: the copy limit, the
   * evolution line and the energy line all depend on fields a result does not
   * carry. A card already in the deck brings its own details with it.
   */
  const addToDeck = useCallback(
    async (dragged: DragCard) => {
      const known = deck.entries.find(
        (entry) => entry.card.id === dragged.id,
      )?.card;

      const commit = (card: Parameters<typeof addCard>[1]) => {
        const result = addCard(deck.id, card);
        if (!result.ok) {
          if (result.reason === "limit") {
            toast.warning(
              `${card.name} is already at ${result.limit} — ${format.name} allows ${format.maxCopies} of a name.`,
            );
          }
          return;
        }
        const reason = cardPoolReason(card, format, pool.context);
        if (reason) toast.warning(`${card.name} — ${reason.toLowerCase()}`);
      };

      if (known) {
        commit(known);
        return;
      }

      markPending(dragged.id, true);
      try {
        const full = await resolve(dragged.id);
        if (!full) {
          toast.error(`Could not load ${dragged.name}`);
          return;
        }
        commit(toDeckCard(full));
      } catch {
        toast.error(`Could not load ${dragged.name}`);
      } finally {
        markPending(dragged.id, false);
      }
    },
    [
      deck.entries,
      deck.id,
      addCard,
      format,
      pool.context,
      resolve,
      markPending,
    ],
  );

  const handleAdd = useCallback(
    (card: DragCard) => {
      void addToDeck(card);
    },
    [addToDeck],
  );

  const handleRemove = useCallback(
    (cardId: string) => removeCard(deck.id, cardId),
    [removeCard, deck.id],
  );

  /** Pointing an issue at the cards it is about, and letting go again. */
  const handleFocusIssue = useCallback(
    (issue: DeckIssue) => {
      if (!issue.cardIds?.length) return;
      const isFocused = focusedIssueId === issue.id;
      setFocusedIssueId(isFocused ? null : issue.id);
      setFlagged(isFocused ? new Set() : new Set(issue.cardIds));
      if (!isFocused && !isWide) setTab("deck");
    },
    [focusedIssueId, isWide],
  );

  const handlePeek = useCallback(
    (cardId: string) => {
      const index = binderCards.findIndex((card) => card.id === cardId);
      if (index >= 0) setPeek({ cards: binderCards, index });
    },
    [binderCards],
  );

  const handleImport = useCallback(
    async (parsed: ParsedDeck) => {
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

      const missing = parsed.cards.length - entries.length;
      toast.success(
        missing > 0
          ? `Loaded ${entries.length} cards — ${missing} could not be found`
          : `Loaded ${entries.length} cards`,
      );
    },
    [resolve, replaceEntries, deck.id],
  );

  const saveName = useCallback(() => {
    const next = draftName.trim();
    if (next && next !== deck.name) updateDeck(deck.id, { name: next });
    setIsEditingName(false);
  }, [draftName, deck.id, deck.name, updateDeck]);

  if (isLoaded && !stored) return null;

  const deckPane = (
    <DeckPane
      deck={deck}
      format={format}
      groups={groups}
      view={view}
      flagged={flagged}
      illegal={illegal}
      onAdd={handleAdd}
      onRemove={handleRemove}
      onPeek={handlePeek}
    />
  );

  const statsPane = (
    <div className="h-full space-y-6 overflow-y-auto p-4">
      <DeckIssues
        issues={issues}
        format={format}
        isEmpty={deck.entries.length === 0}
        onFocus={handleFocusIssue}
        focusedId={focusedIssueId}
      />
      <div className="h-px bg-border" />
      <DeckAnalysisPanel deck={deck} format={format} analysis={analysis} />
    </div>
  );

  const searchPane = (
    <PoolPane
      deck={deck}
      format={format}
      pool={pool}
      language={language}
      pendingIds={pendingIds}
      onAdd={handleAdd}
      onRemoveDropped={(card) => handleRemove(card.id)}
      onPeek={(card) => setPeek({ cards: [card], index: 0 })}
    />
  );

  return (
    <div className="flex h-[var(--app-content-height)] flex-col overflow-hidden">
      <header className="shrink-0 border-b px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-2">
          <Link
            href="/decks"
            className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Back to decks"
            aria-label="Back to decks"
          >
            <ArrowLeft className="size-4" />
          </Link>

          {isEditingName ? (
            <Input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={saveName}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveName();
                if (event.key === "Escape") {
                  setDraftName(deck.name);
                  setIsEditingName(false);
                }
              }}
              className="h-8 max-w-64"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="group flex min-w-0 items-center gap-1.5"
              title="Rename this deck"
            >
              <h1 className="truncate text-base font-medium">{deck.name}</h1>
              <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}

          <DeckFormatPicker
            value={deck.formatId}
            onChange={(formatId: DeckFormatId) =>
              updateDeck(deck.id, { formatId })
            }
            className="shrink-0"
          />

          <span className="ml-auto flex shrink-0 items-center gap-2">
            <span
              className="text-sm tabular-nums"
              title={`${analysis.total} of ${format.deckSize} cards`}
            >
              <span
                className={cn(
                  "font-medium",
                  analysis.total > format.deckSize && "text-destructive",
                )}
              >
                {analysis.total}
              </span>
              <span className="text-muted-foreground">/{format.deckSize}</span>
            </span>

            <button
              type="button"
              onClick={() => setTab("stats")}
              className={cn(
                "hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wider sm:inline-flex",
                legal
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
                  : "bg-destructive/10 text-destructive",
              )}
              title={
                legal
                  ? `This deck is legal for ${format.name}`
                  : `${errorCount} thing${errorCount === 1 ? "" : "s"} to fix`
              }
            >
              {legal ? (
                <Check className="size-3" />
              ) : (
                <CircleAlert className="size-3" />
              )}
              {legal ? "legal" : errorCount}
            </button>

            <DeckMenu
              view={view}
              onViewChange={setView}
              grouping={grouping}
              onGroupingChange={setGrouping}
              onShare={() => setShareOpen(true)}
              onClear={() => setConfirm("clear")}
              onDelete={() => setConfirm("delete")}
            />
          </span>
        </div>

        {/* How close the deck is to being a deck. */}
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-300",
              analysis.total > format.deckSize
                ? "bg-destructive"
                : analysis.total === format.deckSize
                  ? "bg-emerald-500"
                  : "bg-foreground",
            )}
            style={{
              width: `${Math.min(100, (analysis.total / format.deckSize) * 100)}%`,
            }}
          />
        </div>
      </header>

      {isWide ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Tabs
            value={tab === "cards" ? "deck" : tab}
            onValueChange={setTab}
            className="min-h-0 gap-0 border-r"
          >
            <div className="shrink-0 border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="deck">
                  {view === "binder" ? "Binder" : "Deck list"}
                </TabsTrigger>
                <TabsTrigger value="stats">
                  Check
                  {!legal && (
                    <span className="ml-1 text-destructive">{errorCount}</span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="deck" className="min-h-0 overflow-hidden">
              {deckPane}
            </TabsContent>
            <TabsContent value="stats" className="min-h-0 overflow-hidden">
              {statsPane}
            </TabsContent>
          </Tabs>

          <div className="min-h-0">{searchPane}</div>
        </div>
      ) : (
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="min-h-0 flex-1 gap-0"
        >
          <div className="shrink-0 border-b px-4 py-2">
            <TabsList className="w-full">
              <TabsTrigger value="deck">Deck</TabsTrigger>
              <TabsTrigger value="cards">Add cards</TabsTrigger>
              <TabsTrigger value="stats">
                Check
                {!legal && (
                  <span className="ml-1 text-destructive">{errorCount}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="deck" className="min-h-0 overflow-hidden">
            {deckPane}
          </TabsContent>
          <TabsContent value="cards" className="min-h-0 overflow-hidden">
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">{searchPane}</div>
              <DeckTray
                total={analysis.total}
                deckSize={format.deckSize}
                onOpen={() => setTab("deck")}
                onDrop={handleAdd}
              />
            </div>
          </TabsContent>
          <TabsContent value="stats" className="min-h-0 overflow-hidden">
            {statsPane}
          </TabsContent>
        </Tabs>
      )}

      <TcgCardLightbox
        card={peek ? (peek.cards[peek.index] ?? null) : null}
        language={language}
        onClose={() => setPeek(null)}
        onPrevious={
          peek && peek.index > 0
            ? () => setPeek({ ...peek, index: peek.index - 1 })
            : undefined
        }
        onNext={
          peek && peek.index < peek.cards.length - 1
            ? () => setPeek({ ...peek, index: peek.index + 1 })
            : undefined
        }
      />

      <DeckShareDialog
        deck={deck}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onImport={handleImport}
      />

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete"
                ? `Delete ${deck.name}?`
                : `Empty ${deck.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? "The deck and its list are removed from this device."
                : `All ${analysis.total} cards come out. The deck itself stays, as ${format.name}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm === "delete") {
                  deleteDeck(deck.id);
                  router.push("/decks");
                } else {
                  clearDeck(deck.id);
                }
                setConfirm(null);
              }}
            >
              {confirm === "delete" ? "Delete" : "Empty it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* What the format asks of the deck, for anyone reading with a screen
          reader rather than the picker's tooltip. */}
      <p className="sr-only">
        {format.name}: {formatRulesSummary(format)}.
      </p>
    </div>
  );
}

/** The deck itself, and the target a dragged card is looking for. */
function DeckPane({
  deck,
  format,
  groups,
  view,
  flagged,
  illegal,
  onAdd,
  onRemove,
  onPeek,
}: {
  deck: Deck;
  format: DeckFormat;
  groups: DeckGroup[];
  view: DeckView;
  flagged: Set<string>;
  illegal: Map<string, string>;
  onAdd: (card: DragCard) => void;
  onRemove: (cardId: string) => void;
  onPeek: (cardId: string) => void;
}) {
  const { dropProps, isArmed, isOver } = useDeckDropZone({
    id: "deck-pane",
    accepts: (payload) => payload.source === "search",
    onDrop: (payload) => onAdd(payload.card),
  });

  return (
    <div
      {...dropProps}
      className={cn(
        "relative h-full overflow-y-auto p-4",
        dropZoneClasses(isArmed, isOver),
      )}
    >
      <DeckBinder
        deck={deck}
        format={format}
        groups={groups}
        view={view}
        flagged={flagged}
        illegal={illegal}
        onAdd={onAdd}
        onRemove={onRemove}
        onPeek={onPeek}
      />

      {isOver && (
        <p className="pointer-events-none sticky bottom-4 mx-auto w-fit rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
          add to deck
        </p>
      )}
    </div>
  );
}

/**
 * The pool the deck is drawn from — and, while a card from the deck is in the
 * air, the place to drop it to take it back out.
 */
function PoolPane({
  deck,
  format,
  pool,
  language,
  pendingIds,
  onAdd,
  onRemoveDropped,
  onPeek,
}: {
  deck: Deck;
  format: DeckFormat;
  pool: DeckPool;
  language: TcgLanguage;
  pendingIds: Set<string>;
  onAdd: (card: DragCard) => void;
  onRemoveDropped: (card: DragCard) => void;
  onPeek: (card: TcgCardBrief) => void;
}) {
  const { dropProps, isArmed, isOver } = useDeckDropZone({
    id: "deck-pool",
    accepts: (payload) => payload.source === "deck",
    onDrop: (payload) => onRemoveDropped(payload.card),
  });

  return (
    <div
      {...dropProps}
      className={cn("relative h-full", dropZoneClasses(isArmed, isOver))}
    >
      <DeckSearchPanel
        deck={deck}
        format={format}
        pool={pool}
        language={language}
        pendingIds={pendingIds}
        onAdd={onAdd}
        onPeek={onPeek}
      />

      {isArmed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
          <p
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              isOver
                ? "bg-destructive text-white"
                : "bg-background/90 text-muted-foreground backdrop-blur",
            )}
          >
            {isOver ? "release to take it out" : "drop here to remove a copy"}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The deck reduced to a bar. On a phone the pool fills the screen, so this is
 * both the running count and somewhere to drop a card onto.
 */
function DeckTray({
  total,
  deckSize,
  onOpen,
  onDrop,
}: {
  total: number;
  deckSize: number;
  onOpen: () => void;
  onDrop: (card: DragCard) => void;
}) {
  const { dropProps, isArmed, isOver } = useDeckDropZone({
    id: "deck-tray",
    accepts: (payload) => payload.source === "search",
    onDrop: (payload) => onDrop(payload.card),
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      {...dropProps}
      className={cn(
        "flex shrink-0 items-center justify-center gap-2 border-t bg-background px-4 py-3 text-xs",
        dropZoneClasses(isArmed, isOver),
        isOver && "bg-foreground text-background",
      )}
    >
      <span className="font-medium tabular-nums">
        {total}/{deckSize}
      </span>
      <span className={isOver ? "" : "text-muted-foreground"}>
        {isOver ? "release to add" : isArmed ? "drop here to add" : "view deck"}
      </span>
    </button>
  );
}

function DeckMenu({
  view,
  onViewChange,
  grouping,
  onGroupingChange,
  onShare,
  onClear,
  onDelete,
}: {
  view: DeckView;
  onViewChange: (view: DeckView) => void;
  grouping: DeckGrouping;
  onGroupingChange: (grouping: DeckGrouping) => void;
  onShare: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="p-1 text-muted-foreground transition-colors hover:text-foreground"
        title="Deck options"
        aria-label="Deck options"
      >
        <Ellipsis className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          view
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={view}
          onValueChange={(value) => onViewChange(value as DeckView)}
        >
          <DropdownMenuRadioItem
            value="binder"
            className="cursor-pointer text-xs"
          >
            <LayoutGrid className="size-3.5" />
            Binder
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="list"
            className="cursor-pointer text-xs"
          >
            <List className="size-3.5" />
            Deck list
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          group by
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={grouping}
          onValueChange={(value) => onGroupingChange(value as DeckGrouping)}
        >
          {DECK_GROUPINGS.map((option) => (
            <DropdownMenuRadioItem
              key={option.id}
              value={option.id}
              className="cursor-pointer text-xs"
              title={option.hint}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onShare} className="cursor-pointer text-xs">
          <Share2 className="size-3.5" />
          Export or import
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onClear} className="cursor-pointer text-xs">
          <Eraser className="size-3.5" />
          Empty the deck
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          variant="destructive"
          className="cursor-pointer text-xs"
        >
          <Trash2 className="size-3.5" />
          Delete deck
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
