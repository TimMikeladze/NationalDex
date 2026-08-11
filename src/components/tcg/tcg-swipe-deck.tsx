"use client";

import {
  Heart,
  ListPlus,
  Maximize2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { cn } from "@/lib/utils";
import type { TcgCardBrief, TcgGame, TcgLanguage } from "@/types/tcg";
import {
  cardImageUrl,
  DEFAULT_TCG_LANGUAGE,
  formatLocalId,
  gameForCardId,
  withTcgLanguage,
} from "@/types/tcg";
import { TcgCardImage } from "./tcg-card-image";
import {
  commitThreshold,
  FlyingCard,
  type SwipeAction,
  SwipeCardFace,
  type SwipeThrow,
  TcgSwipeCard,
} from "./tcg-swipe-card";

// =============================================================================
// The stack
// =============================================================================

/**
 * How the cards behind the top one sit. Each one animates into the slot above
 * as the top card is dragged away, so the whole stack moves together rather
 * than the next card appearing once the old one has gone.
 */
const DEPTH = [
  { scale: 1, y: 0, opacity: 1 },
  { scale: 0.94, y: 18, opacity: 1 },
  { scale: 0.88, y: 36, opacity: 0.55 },
] as const;

/** Cards kept mounted behind the top one. */
const STACK_SIZE = DEPTH.length;

/** Cards left in the deck before the next page is requested. */
const PREFETCH_AT = 6;

/** Images fetched ahead of the stack, so a card is never blank on arrival. */
const PRELOAD_AHEAD = 6;

/** How far off the edge an undone card starts, as a share of the card's width. */
const REWIND_DISTANCE = 1.25;

interface StackedCardProps {
  card: TcgCardBrief;
  game?: TcgGame;
  depth: number;
  progress: MotionValue<number>;
}

/** A card waiting its turn, interpolating toward the slot in front of it. */
function StackedCard({ card, game, depth, progress }: StackedCardProps) {
  const from = DEPTH[depth];
  const to = DEPTH[depth - 1] ?? DEPTH[0];

  const scale = useTransform(progress, [0, 1], [from.scale, to.scale]);
  const y = useTransform(progress, [0, 1], [from.y, to.y]);
  const opacity = useTransform(progress, [0, 1], [from.opacity, to.opacity]);

  return (
    <motion.div
      aria-hidden
      style={{ scale, y, opacity }}
      className="pointer-events-none absolute inset-0 rounded-xl bg-background shadow-xl shadow-black/20"
    >
      <SwipeCardFace card={card} game={game} />
    </motion.div>
  );
}

// =============================================================================
// Controls
// =============================================================================

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "lg";
  className?: string;
  children: React.ReactNode;
}

function ControlButton({
  label,
  onClick,
  disabled,
  size = "lg",
  className,
  children,
}: ControlButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      whileHover={disabled ? undefined : { scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
      className={cn(
        "flex items-center justify-center rounded-full border bg-background shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-35",
        size === "lg" ? "size-14" : "size-11",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

// =============================================================================
// Deck
// =============================================================================

interface TcgSwipeDeckProps {
  cards: TcgCardBrief[];
  pocketSetIds?: string[];
  /** Catalogue the cards came from, carried into every link out of the deck. */
  language?: TcgLanguage;
  showGame?: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  /** Asked for another page once the deck is nearly spent. */
  onNeedMore?: () => void;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

interface HistoryEntry {
  card: TcgCardBrief;
  action: SwipeAction;
  /** Whether this swipe is what favourited the card — undo only reverts its own. */
  favorited: boolean;
}

interface Flight extends SwipeThrow {
  key: string;
  card: TcgCardBrief;
  game?: TcgGame;
}

const ACTION_LABELS: Record<SwipeAction, string> = {
  keep: "kept",
  pass: "passed",
  list: "sent to a list",
};

/**
 * A deck of cards, one at a time. Swipe right to favourite, left to skip, up to
 * file it in a list — and tap to look closer. Everything the gesture does is
 * also on a button and a key, because a swipe-only screen is a screen some
 * people cannot use at all.
 */
export function TcgSwipeDeck({
  cards,
  pocketSetIds,
  language = DEFAULT_TCG_LANGUAGE,
  showGame = true,
  isLoading = false,
  hasMore = false,
  onNeedMore,
  emptyMessage = "No cards match these filters",
  emptyAction,
  className,
}: TcgSwipeDeckProps) {
  const { isFavoriteCard, addFavoriteCard, removeFavoriteCard } =
    useCardFavorites();
  const reduceMotion = useReducedMotion() ?? false;

  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [zoomed, setZoomed] = useState<TcgCardBrief | null>(null);
  const [listing, setListing] = useState<TcgCardBrief | null>(null);
  const [announcement, setAnnouncement] = useState("");
  /** The card an undo is bringing back, and the edge it comes in from. */
  const [rewind, setRewind] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const flightId = useRef(0);

  // One set of values for the whole deck: the top card drives them, and the
  // cards behind it read them. That is what ties the stack together.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const grabDir = useMotionValue(1);

  const threshold = commitThreshold(width);
  const progress = useTransform<number, number>([x, y], ([latestX, latestY]) =>
    Math.min(1, Math.max(Math.abs(latestX), Math.max(0, -latestY)) / threshold),
  );

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const gameFor = useCallback(
    (card: TcgCardBrief) =>
      showGame ? gameForCardId(card.id, pocketSetIds) : undefined,
    [showGame, pocketSetIds],
  );

  const visible = cards.slice(index, index + STACK_SIZE);
  const top = visible[0];
  const remaining = Math.max(0, cards.length - index);
  const exhausted = !isLoading && !hasMore && remaining === 0;
  const kept = useMemo(
    () => history.filter((entry) => entry.action !== "pass").length,
    [history],
  );

  // Ask for the next page well before the deck runs dry, so a fast swiper never
  // hits a spinner.
  useEffect(() => {
    if (hasMore && remaining <= PREFETCH_AT) onNeedMore?.();
  }, [hasMore, remaining, onNeedMore]);

  // Artwork is the whole point here — pull the next few in before they are
  // needed rather than showing a card that has not finished decoding.
  useEffect(() => {
    if (typeof window === "undefined") return;
    for (const card of cards.slice(
      index + STACK_SIZE,
      index + STACK_SIZE + PRELOAD_AHEAD,
    )) {
      const src = cardImageUrl(card.image, "high");
      if (!src) continue;
      const image = new window.Image();
      image.src = src;
    }
  }, [cards, index]);

  const commit = useCallback(
    (action: SwipeAction, thrown?: SwipeThrow) => {
      const card = cards[index];
      if (!card) return;

      const alreadyFavorite = isFavoriteCard(card.id);
      if (action === "keep" && !alreadyFavorite) addFavoriteCard(card);
      if (action === "list") setListing(card);

      flightId.current += 1;
      setFlights((current) => [
        ...current,
        {
          key: `${card.id}-${flightId.current}`,
          card,
          game: gameFor(card),
          action,
          x: thrown?.x ?? 0,
          y: thrown?.y ?? 0,
          rotate: thrown?.rotate ?? 0,
          velocityX: thrown?.velocityX ?? 0,
          velocityY: thrown?.velocityY ?? 0,
        },
      ]);

      setHistory((current) => [
        ...current,
        { card, action, favorited: action === "keep" && !alreadyFavorite },
      ]);
      setAnnouncement(`${card.name} ${ACTION_LABELS[action]}.`);
      setIndex((current) => current + 1);

      // The next card starts square, in the same commit as the old one leaves.
      x.set(0);
      y.set(0);
      grabDir.set(1);
    },
    [cards, index, isFavoriteCard, addFavoriteCard, gameFor, x, y, grabDir],
  );

  const undo = useCallback(() => {
    const entry = history[history.length - 1];
    if (!entry) return;

    if (entry.favorited) removeFavoriteCard(entry.card.id);
    setHistory((current) => current.slice(0, -1));
    setIndex((current) => Math.max(0, current - 1));
    setAnnouncement(`${entry.card.name} brought back.`);

    x.set(0);
    y.set(0);

    // It comes back along the line it left on — from just off the edge rather
    // than from where it actually ended up, so undo lands quickly.
    setRewind(
      reduceMotion
        ? null
        : {
            id: entry.card.id,
            x:
              entry.action === "list"
                ? 0
                : entry.action === "keep"
                  ? REWIND_DISTANCE * width
                  : -REWIND_DISTANCE * width,
            y: entry.action === "list" ? -REWIND_DISTANCE * width : 0,
          },
    );
  }, [history, removeFavoriteCard, reduceMotion, width, x, y]);

  const restart = useCallback(() => {
    setIndex(0);
    setHistory([]);
    x.set(0);
    y.set(0);
    setAnnouncement("Deck restarted.");
  }, [x, y]);

  // The gesture has a keyboard twin. A dialog owns the keyboard while it is
  // open, and a swipe should never fire from inside a text field.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (zoomed || listing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Anything focused owns its own keys — the deck only claims the ones
      // nobody else is listening for.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(
          target?.tagName ?? "",
        )
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          if (top) commit("pass");
          break;
        case "ArrowRight":
          if (top) commit("keep");
          break;
        case "ArrowUp":
          if (top) commit("list");
          break;
        case "z":
        case "Z":
        case "Backspace":
          undo();
          break;
        case "Enter":
        case " ":
          if (top) setZoomed(top);
          break;
        default:
          return;
      }
      event.preventDefault();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commit, undo, top, zoomed, listing]);

  const topIsFavorite = top ? isFavoriteCard(top.id) : false;

  return (
    // `w-full` matters: centred in a flex parent this box would otherwise
    // shrink to the width of the button row and take the card down with it.
    <div className={cn("flex w-full flex-col items-center gap-4", className)}>
      {/* How far through the deck this is */}
      <div className="flex w-full max-w-sm items-center gap-3">
        <div className="h-0.5 flex-1 overflow-hidden bg-muted">
          <motion.div
            className="h-full bg-foreground"
            animate={{
              scaleX: cards.length > 0 ? index / cards.length : 0,
            }}
            style={{ originX: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 30 }}
          />
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {Math.min(index + 1, cards.length)} / {cards.length}
          {hasMore ? "+" : ""}
        </span>
      </div>

      {/* The stage. Width is capped by height too, so the whole card is always
          on screen without the page scrolling under the gesture. */}
      <div
        ref={stageRef}
        // Capped by height as well as width: a card that runs off the bottom
        // puts the page under the gesture, and then a swipe scrolls instead.
        className="relative aspect-[63/88] w-full max-w-[min(24rem,84vw,42dvh)]"
      >
        {isLoading && remaining === 0 ? (
          <div className="absolute inset-0 animate-pulse rounded-xl bg-muted" />
        ) : exhausted && cards.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            {emptyAction}
          </div>
        ) : exhausted ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center">
            <Sparkles className="size-5 text-muted-foreground" />
            <p className="text-sm">That is the whole deck.</p>
            <p className="text-xs text-muted-foreground">
              {kept} of {history.length} card{history.length === 1 ? "" : "s"}{" "}
              kept
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restart}>
                start over
              </Button>
              <Button size="sm" asChild>
                <Link href="/favorites">see favorites</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Back to front, so the top card is last in paint order */}
            {visible
              .map((card, depth) => ({ card, depth }))
              .slice(1)
              .reverse()
              .map(({ card, depth }) => (
                <StackedCard
                  key={card.id}
                  card={card}
                  game={gameFor(card)}
                  depth={depth}
                  progress={progress}
                />
              ))}

            {top && (
              <TcgSwipeCard
                key={top.id}
                card={top}
                game={gameFor(top)}
                x={x}
                y={y}
                grabDir={grabDir}
                threshold={threshold}
                onCommit={(thrown) => commit(thrown.action, thrown)}
                onOpen={() => setZoomed(top)}
                enterFrom={rewind?.id === top.id ? rewind : null}
                reduceMotion={reduceMotion}
              />
            )}

            {!top && (
              <div className="absolute inset-0 animate-pulse rounded-xl bg-muted" />
            )}
          </>
        )}

        {/* Cards on their way out, above everything and out of the way */}
        {flights.map((flight) => (
          <FlyingCard
            key={flight.key}
            card={flight.card}
            game={flight.game}
            thrown={flight}
            reduceMotion={reduceMotion}
            onDone={() =>
              setFlights((current) =>
                current.filter((entry) => entry.key !== flight.key),
              )
            }
          />
        ))}
      </div>

      {/* Every gesture, as a button */}
      <div className="flex items-center gap-3">
        <ControlButton
          label="Undo last swipe"
          size="sm"
          onClick={undo}
          disabled={history.length === 0}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" />
        </ControlButton>

        <ControlButton
          label="Pass"
          onClick={() => commit("pass")}
          disabled={!top}
          className="text-rose-500 hover:border-rose-500/60 hover:bg-rose-500/10"
        >
          <X className="size-6" />
        </ControlButton>

        <ControlButton
          label="Add to a list"
          size="sm"
          onClick={() => commit("list")}
          disabled={!top}
          className="text-sky-500 hover:border-sky-500/60 hover:bg-sky-500/10"
        >
          <ListPlus className="size-4" />
        </ControlButton>

        <ControlButton
          label={topIsFavorite ? "Already a favorite — keep" : "Keep"}
          onClick={() => commit("keep")}
          disabled={!top}
          className="text-emerald-500 hover:border-emerald-500/60 hover:bg-emerald-500/10"
        >
          <Heart className={cn("size-6", topIsFavorite && "fill-current")} />
        </ControlButton>

        <ControlButton
          label="Look closer"
          size="sm"
          onClick={() => top && setZoomed(top)}
          disabled={!top}
          className="text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="size-4" />
        </ControlButton>
      </div>

      <p className="hidden text-center text-[10px] uppercase tracking-wider text-muted-foreground md:block">
        ← pass · → keep · ↑ list · space look closer · z undo
      </p>

      {/* Swipes are silent to a screen reader otherwise */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* A closer look, in place — leaving the page would lose the deck */}
      <Dialog open={zoomed !== null} onOpenChange={() => setZoomed(null)}>
        <DialogContent className="max-w-[min(100vw-1.5rem,30rem)] border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{zoomed?.name}</DialogTitle>
          {zoomed && (
            <div className="space-y-3">
              <TcgCardImage
                image={zoomed.image}
                alt={zoomed.name}
                localId={zoomed.localId}
                quality="high"
                width={900}
                height={1238}
                priority
                className="max-h-[78dvh] w-full object-contain"
              />
              <div className="flex items-center justify-between gap-3 bg-background/90 px-3 py-2 backdrop-blur">
                <p className="min-w-0 truncate text-sm font-medium">
                  {zoomed.name}{" "}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatLocalId(zoomed.localId)}
                  </span>
                </p>
                <Link
                  href={withTcgLanguage(
                    `/cards/${zoomed.id.toLowerCase()}`,
                    language,
                  )}
                  className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  full card →
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Opened by an up-swipe; the card has already moved on behind it */}
      {listing && (
        <AddToListDialog
          key={listing.id}
          itemType="card"
          itemId={listing.id}
          itemName={listing.name}
          itemSprite={cardImageUrl(listing.image, "low")}
          open
          onOpenChange={(next) => {
            if (!next) setListing(null);
          }}
        />
      )}
    </div>
  );
}
