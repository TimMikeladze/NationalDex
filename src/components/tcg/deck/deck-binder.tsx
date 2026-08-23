"use client";

import { Maximize2, Minus, Plus, TriangleAlert } from "lucide-react";
import {
  chanceOfAtLeastOne,
  copiesAllowed,
  type DeckGroup,
  formatPercent,
  isBasicEnergy,
  pokemonStage,
} from "@/lib/deck";
import { cn } from "@/lib/utils";
import type { Deck, DeckCard, DeckEntry, DeckFormat } from "@/types/deck";
import { formatLocalId, TCG_ENERGY_COLORS } from "@/types/tcg";
import { TcgCardImage } from "../tcg-card-image";
import { useDeckDragSource } from "./deck-drag";

export type DeckView = "binder" | "list";

interface DeckBinderProps {
  deck: Deck;
  format: DeckFormat;
  groups: DeckGroup[];
  view: DeckView;
  /** Cards an issue is pointing at, so the binder can show which ones. */
  flagged: Set<string>;
  /** Why a card cannot be played here, by card id. */
  illegal: Map<string, string>;
  onAdd: (card: DeckCard) => void;
  onRemove: (cardId: string) => void;
  onPeek: (cardId: string) => void;
}

/**
 * The deck as a binder.
 *
 * A deck list is not a bag of sixty cards, it is four or five piles a player
 * counts separately — Basics against Stage 2s, Supporters against Items, energy
 * against the attacks that need it — so the binder files every card under its
 * heading automatically and puts the count on the card. Copies sit as one
 * stack, because "three Iono" is one decision rather than three cards.
 */
export function DeckBinder({
  deck,
  format,
  groups,
  view,
  flagged,
  illegal,
  onAdd,
  onRemove,
  onPeek,
}: DeckBinderProps) {
  const total = deck.entries.reduce((sum, entry) => sum + entry.count, 0);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">This deck is empty</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Drag a card in from the search, or tap one to add it. Cards file
          themselves under the right heading as they arrive.
        </p>
      </div>
    );
  }

  return (
    <div className="@container space-y-6">
      {groups.map((group) => (
        <section key={group.id} className="space-y-2">
          <header className="flex items-center gap-2 px-0.5">
            {group.color && (
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: group.color }}
                aria-hidden="true"
              />
            )}
            <h3 className="text-xs font-medium uppercase tracking-wider">
              {group.label}
            </h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {group.count}
            </span>
            <span className="h-px flex-1 bg-border" />
          </header>

          {view === "binder" ? (
            <div className="grid grid-cols-3 gap-2 @sm:grid-cols-4 @xl:grid-cols-5 @3xl:grid-cols-6 @5xl:grid-cols-8">
              {group.entries.map((entry) => (
                <BinderPocket
                  key={entry.card.id}
                  entry={entry}
                  deck={deck}
                  format={format}
                  total={total}
                  flagged={flagged.has(entry.card.id)}
                  illegalReason={illegal.get(entry.card.id)}
                  onAdd={onAdd}
                  onRemove={onRemove}
                  onPeek={onPeek}
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y border-y">
              {group.entries.map((entry) => (
                <DeckListRow
                  key={entry.card.id}
                  entry={entry}
                  deck={deck}
                  format={format}
                  total={total}
                  flagged={flagged.has(entry.card.id)}
                  illegalReason={illegal.get(entry.card.id)}
                  onAdd={onAdd}
                  onRemove={onRemove}
                  onPeek={onPeek}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

interface EntryProps {
  entry: DeckEntry;
  deck: Deck;
  format: DeckFormat;
  total: number;
  flagged: boolean;
  illegalReason?: string;
  onAdd: (card: DeckCard) => void;
  onRemove: (cardId: string) => void;
  onPeek: (cardId: string) => void;
}

/**
 * The odds of drawing at least one copy in the opening hand. It is the number
 * that decides whether a card is a three-of or a four-of, so it sits on the
 * card rather than in a table somewhere else.
 */
function openingOdds(entry: DeckEntry, total: number, hand: number) {
  if (total <= 0) return null;
  return chanceOfAtLeastOne(total, entry.count, hand);
}

function BinderPocket({
  entry,
  deck,
  format,
  total,
  flagged,
  illegalReason,
  onAdd,
  onRemove,
  onPeek,
}: EntryProps) {
  const { dragProps, isDragging, wasDragged } = useDeckDragSource({
    source: "deck",
    card: entry.card,
  });

  const odds = openingOdds(entry, total, format.openingHand);
  const canAdd = copiesAllowed(entry.card, deck, format) > 0;
  const stackDepth = Math.min(entry.count - 1, 2);

  return (
    <div
      className={cn("group relative", isDragging && "opacity-40")}
      {...dragProps}
    >
      {/* The copies behind the top card, so a four-of reads as a stack from
          across the room rather than as a number to be read. */}
      {Array.from({ length: stackDepth }, (_, index) => (
        <div
          key={`layer-${index}`}
          aria-hidden="true"
          className="absolute inset-0 rounded-[2px] border bg-muted"
          style={{
            transform: `translate(${(index + 1) * 3}px, ${(index + 1) * -3}px)`,
            zIndex: -1,
          }}
        />
      ))}

      <button
        type="button"
        onClick={() => {
          if (wasDragged()) return;
          onPeek(entry.card.id);
        }}
        title={`${entry.card.name} — ${entry.card.setName} ${formatLocalId(entry.card.localId)}${
          odds !== null
            ? `. ${formatPercent(odds)} to open with one of the ${entry.count}.`
            : ""
        }`}
        className={cn(
          "relative block w-full bg-muted/30 ring-1 ring-transparent transition-shadow",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          flagged && "ring-2 ring-amber-500",
          illegalReason && "ring-2 ring-destructive",
        )}
      >
        <TcgCardImage
          image={entry.card.image}
          alt={entry.card.name}
          localId={entry.card.localId}
          setName={entry.card.setName}
        />

        {/* How many copies — the one number a deck list is made of. */}
        <span className="absolute bottom-1 left-1 min-w-6 rounded-sm bg-background/90 px-1 py-0.5 text-center text-xs font-semibold tabular-nums backdrop-blur">
          {entry.count}
        </span>

        {illegalReason && (
          <span
            className="absolute left-1 top-1 flex items-center gap-1 rounded-sm bg-destructive px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white"
            title={illegalReason}
          >
            <TriangleAlert className="size-2.5" />
          </span>
        )}
      </button>

      {/* Adding and removing copies. Always reachable on a touch screen, out of
          the way of the artwork on a pointer. */}
      <div className="absolute right-1 top-1 flex flex-col gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <StackButton
          label={`Add a copy of ${entry.card.name}`}
          onClick={() => onAdd(entry.card)}
          disabled={!canAdd}
        >
          <Plus className="size-3.5" />
        </StackButton>
        <StackButton
          label={`Remove a copy of ${entry.card.name}`}
          onClick={() => onRemove(entry.card.id)}
        >
          <Minus className="size-3.5" />
        </StackButton>
        <StackButton
          label={`Look closer at ${entry.card.name}`}
          onClick={() => onPeek(entry.card.id)}
          className="hidden md:flex"
        >
          <Maximize2 className="size-3.5" />
        </StackButton>
      </div>
    </div>
  );
}

function StackButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-6 items-center justify-center bg-background/85 text-muted-foreground backdrop-blur transition-colors",
        "hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * The same card as a line in a deck list. Counting is what a list is for, so it
 * leads with the count and says what the card is and how often it will be in
 * the opening hand.
 */
function DeckListRow({
  entry,
  deck,
  format,
  total,
  flagged,
  illegalReason,
  onAdd,
  onRemove,
  onPeek,
}: EntryProps) {
  const { dragProps, isDragging } = useDeckDragSource({
    source: "deck",
    card: entry.card,
  });

  const odds = openingOdds(entry, total, format.openingHand);
  const canAdd = copiesAllowed(entry.card, deck, format) > 0;
  const stage =
    entry.card.category === "Pokemon" ? pokemonStage(entry.card) : null;

  return (
    <li
      className={cn(
        "flex items-center gap-2 py-1.5",
        isDragging && "opacity-40",
        flagged && "bg-amber-500/10",
      )}
      {...dragProps}
    >
      <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums">
        {entry.count}
      </span>

      <button
        type="button"
        onClick={() => onPeek(entry.card.id)}
        className="w-7 shrink-0"
        title={`Look closer at ${entry.card.name}`}
      >
        <TcgCardImage
          image={entry.card.image}
          alt={entry.card.name}
          localId={entry.card.localId}
          className="w-full"
        />
      </button>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm">{entry.card.name}</span>
          {illegalReason && (
            <span title={illegalReason} className="shrink-0 text-destructive">
              <TriangleAlert className="size-3" />
              <span className="sr-only">{illegalReason}</span>
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="truncate">
            {entry.card.setName} {formatLocalId(entry.card.localId)}
          </span>
          {stage && stage !== "Basic" && (
            <span className="shrink-0 uppercase tracking-wider">{stage}</span>
          )}
          {entry.card.types?.map((type) => (
            <span
              key={type}
              className="shrink-0 rounded px-1 uppercase tracking-wider"
              style={{
                backgroundColor: `${TCG_ENERGY_COLORS[type] ?? "#94A3B8"}22`,
              }}
            >
              {type}
            </span>
          ))}
        </span>
      </span>

      {/* Basic Energy is drawn to be redrawn, so its opening odds say nothing. */}
      {odds !== null && !isBasicEnergy(entry.card) && (
        <span
          className="hidden w-12 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground sm:block"
          title={`${formatPercent(odds, 1)} chance of at least one in the opening ${format.openingHand}`}
        >
          {formatPercent(odds)}
        </span>
      )}

      <span className="flex shrink-0 items-center">
        <StackButton
          label={`Remove a copy of ${entry.card.name}`}
          onClick={() => onRemove(entry.card.id)}
        >
          <Minus className="size-3.5" />
        </StackButton>
        <StackButton
          label={`Add a copy of ${entry.card.name}`}
          onClick={() => onAdd(entry.card)}
          disabled={!canAdd}
        >
          <Plus className="size-3.5" />
        </StackButton>
      </span>
    </li>
  );
}
