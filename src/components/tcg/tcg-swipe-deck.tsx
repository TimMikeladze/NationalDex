"use client";

import {
  Heart,
  ListPlus,
  Maximize2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { motion, useMotionValue, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { Button } from "@/components/ui/button";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { cn } from "@/lib/utils";
import type { TcgCardBrief, TcgLanguage } from "@/types/tcg";
import { cardImageUrl, DEFAULT_TCG_LANGUAGE, gameForCardId } from "@/types/tcg";
import { TcgCardLightbox } from "./tcg-card-lightbox";
import {
  CORNER_RATIO,
  commitThreshold,
  DEPTH_Y,
  DEPTH_Z,
  DeckCard,
  type SwipeAction,
  type SwipeThrow,
} from "./tcg-swipe-card";

/** Every trading card, ever, is 63x88mm. */
const CARD_RATIO = 63 / 88;

/** Past this the card stops feeling like something you could hold. */
const MAX_CARD_WIDTH = 430;

/**
 * Cards kept mounted: three seen, plus one waiting invisibly behind them. The
 * hidden one is what lets a card fade up into the stack instead of appearing.
 */
const WINDOW = 4;

/** Cards left in the deck before the next page is requested. */
const PREFETCH_AT = 8;

/** Images fetched ahead of the window, so a card is never blank on arrival. */
const PRELOAD_AHEAD = 6;

/** Depth of the stage's vanishing point. Lower is a stronger 3D read. */
const PERSPECTIVE = 1100;

/** How far off the edge an undone card starts, as a share of the card's width. */
const REWIND_DISTANCE = 1.2;

/** The deepest card still drawn; the one behind it is fully faded out. */
const DEEPEST_VISIBLE = 2;

/** Breathing room under the stack, so it never quite reaches the buttons. */
const STACK_CLEARANCE = 8;

/**
 * How far the stack hangs below the front card's bottom edge. The cards behind
 * are pushed down and then pulled part of the way back up by the perspective,
 * so it is worth working out rather than guessing — this is the room that has
 * to stay clear, or the deck sits on top of the buttons under it.
 */
const DEEPEST_SCALE = PERSPECTIVE / (PERSPECTIVE + DEEPEST_VISIBLE * DEPTH_Z);
const DEEPEST_DROP = DEEPEST_VISIBLE * DEPTH_Y;

function stackOverhang(cardHeight: number) {
  const bottom = (cardHeight / 2 + DEEPEST_DROP) * DEEPEST_SCALE;
  return Math.max(0, bottom - cardHeight / 2);
}

/**
 * The tallest card whose whole stack still fits in `available`. Solved rather
 * than iterated: the overhang is itself a function of card height, so guessing
 * a height and correcting once leaves the deck a few pixels over — which is
 * exactly enough to sit on the buttons.
 *
 *   height + overhang(height) = available
 *   height * (1 + scale) / 2 + drop * scale = available
 */
function fittingCardHeight(available: number) {
  return Math.max(
    0,
    ((available - DEEPEST_DROP * DEEPEST_SCALE) * 2) / (1 + DEEPEST_SCALE),
  );
}

// Measuring the stage has to happen before the browser paints, or the deck is
// briefly the wrong size — but it must not run on the server.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

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
      whileHover={disabled ? undefined : { scale: 1.08, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 480, damping: 26 }}
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
  /** Offered alongside "start over" once the whole deck has been swiped. */
  exhaustedAction?: React.ReactNode;
  className?: string;
}

interface HistoryEntry {
  card: TcgCardBrief;
  action: SwipeAction;
  /** Whether this swipe is what favourited the card — undo only reverts its own. */
  favorited: boolean;
}

interface Flight {
  /** Position in the deck, which is what keeps this card's identity stable. */
  slot: number;
  card: TcgCardBrief;
  thrown: SwipeThrow;
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
  exhaustedAction,
  className,
}: TcgSwipeDeckProps) {
  const { isFavoriteCard, addFavoriteCard, removeFavoriteCard } =
    useCardFavorites();
  const reduceMotion = useReducedMotion() ?? false;

  const arenaRef = useRef<HTMLDivElement>(null);
  const [arena, setArena] = useState({ width: 0, height: 0 });

  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [zoomed, setZoomed] = useState<TcgCardBrief | null>(null);
  const [listing, setListing] = useState<TcgCardBrief | null>(null);
  const [announcement, setAnnouncement] = useState("");
  /** The card an undo is bringing back, and the edge it comes in from. */
  const [rewind, setRewind] = useState<{
    slot: number;
    x: number;
    y: number;
  } | null>(null);

  /** How far the card in hand has been dragged, 0 to 1. Drives the stack. */
  const progress = useMotionValue(0);

  // The card is as large as the space left over allows, rather than a guess in
  // viewport units — the chrome above and below it is not the same on every
  // device, and a card that has to be scrolled to is a card you cannot swipe.
  useIsomorphicLayoutEffect(() => {
    const element = arenaRef.current;
    if (!element) return;

    const measure = () =>
      setArena({
        width: element.clientWidth,
        height: element.clientHeight,
      });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Sized against the room the whole stack needs, not just the front card, so
  // the cards behind have somewhere to sit that is not on top of the controls.
  const cardWidth =
    arena.width > 0 && arena.height > 0
      ? Math.min(
          arena.width,
          fittingCardHeight(arena.height - STACK_CLEARANCE) * CARD_RATIO,
          MAX_CARD_WIDTH,
        )
      : 0;
  const cardHeight = cardWidth / CARD_RATIO;
  const overhang = cardWidth > 0 ? stackOverhang(cardHeight) : 0;
  const threshold = commitThreshold(cardWidth || 320);
  // The placeholders share the cards' cut corner, so nothing squares off.
  const radius = (cardWidth || 320) * CORNER_RATIO;

  const gameFor = useCallback(
    (card: TcgCardBrief) =>
      showGame ? gameForCardId(card.id, pocketSetIds) : undefined,
    [showGame, pocketSetIds],
  );

  const visible = useMemo(
    () =>
      Array.from({ length: WINDOW }, (_, depth) => ({
        slot: index + depth,
        card: cards[index + depth],
        depth,
      })).filter((entry) => entry.card !== undefined),
    [cards, index],
  );

  const top = visible[0]?.card;
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
      index + WINDOW,
      index + WINDOW + PRELOAD_AHEAD,
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

      setFlights((current) => [
        ...current,
        {
          slot: index,
          card,
          thrown: {
            action,
            velocityX: thrown?.velocityX ?? 0,
            velocityY: thrown?.velocityY ?? 0,
          },
        },
      ]);
      setHistory((current) => [
        ...current,
        { card, action, favorited: action === "keep" && !alreadyFavorite },
      ]);
      setAnnouncement(`${card.name} ${ACTION_LABELS[action]}.`);
      setIndex((current) => current + 1);

      // The card promoted into the front slot is already sitting at the front
      // slot's position, because the stack followed the drag all the way. This
      // hands it over with nothing left to move.
      progress.set(0);
    },
    [cards, index, isFavoriteCard, addFavoriteCard, progress],
  );

  const undo = useCallback(() => {
    const entry = history[history.length - 1];
    if (!entry) return;

    const slot = index - 1;
    if (entry.favorited) removeFavoriteCard(entry.card.id);
    setHistory((current) => current.slice(0, -1));
    setIndex(Math.max(0, slot));
    setAnnouncement(`${entry.card.name} brought back.`);
    progress.set(0);

    // If it is still on its way out, drop that copy — the card is about to be
    // dealt back into the stack and two of it would collide.
    setFlights((current) => current.filter((flight) => flight.slot !== slot));

    // It comes back along the line it left on, from just off the edge rather
    // than from wherever it actually got to, so undo lands quickly.
    setRewind(
      reduceMotion
        ? null
        : {
            slot,
            x:
              entry.action === "list"
                ? 0
                : (entry.action === "keep" ? 1 : -1) *
                  REWIND_DISTANCE *
                  (cardWidth || 320),
            y:
              entry.action === "list"
                ? -REWIND_DISTANCE * (cardHeight || 440)
                : 0,
          },
    );
  }, [
    history,
    index,
    removeFavoriteCard,
    reduceMotion,
    cardWidth,
    cardHeight,
    progress,
  ]);

  const restart = useCallback(() => {
    setIndex(0);
    setHistory([]);
    setFlights([]);
    setRewind(null);
    progress.set(0);
    setAnnouncement("Deck restarted.");
  }, [progress]);

  const retire = useCallback((slot: number) => {
    setFlights((current) => current.filter((flight) => flight.slot !== slot));
  }, []);

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
  const showDeck = !isLoading || remaining > 0;

  return (
    <div
      className={cn(
        // No percentage height: this stretches to its flex parent instead,
        // which is the only thing that reliably has a height to give.
        "flex w-full flex-col items-center gap-3",
        className,
      )}
    >
      {/* How far through the deck this is. The bar alone — a running tally of
          cards seen and cards kept turned a browse into a score to finish. */}
      <div className="h-0.5 w-full max-w-sm shrink-0 overflow-hidden bg-muted">
        <motion.div
          className="h-full bg-foreground"
          animate={{ scaleX: cards.length > 0 ? index / cards.length : 0 }}
          style={{ originX: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 30 }}
        />
      </div>

      {/* The stage takes whatever height is left, and the card takes all of it */}
      <div
        ref={arenaRef}
        className="flex min-h-0 w-full flex-1 items-center justify-center"
      >
        <div
          className={cn(
            "relative",
            cardWidth === 0 && "aspect-[63/88] h-full max-w-full",
          )}
          style={{
            perspective: PERSPECTIVE,
            transformStyle: "preserve-3d",
            // Centring counts the margin, so the whole stack lands inside the
            // stage rather than the front card alone.
            marginBottom: overhang,
            ...(cardWidth > 0
              ? { width: cardWidth, height: cardHeight }
              : undefined),
          }}
        >
          {!showDeck && (
            <div
              className="absolute inset-0 animate-pulse bg-muted"
              style={{ borderRadius: radius }}
            />
          )}

          {showDeck && exhausted && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-dashed px-6 text-center"
              style={{ borderRadius: radius }}
            >
              {cards.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {emptyMessage}
                  </p>
                  {emptyAction}
                </>
              ) : (
                <>
                  <Sparkles className="size-5 text-muted-foreground" />
                  <p className="text-sm">That is the whole deck.</p>
                  <p className="text-xs text-muted-foreground">
                    {kept} of {history.length} card
                    {history.length === 1 ? "" : "s"} kept
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={restart}>
                      start over
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/favorites">see favorites</Link>
                    </Button>
                  </div>
                  {exhaustedAction}
                </>
              )}
            </div>
          )}

          {/* One list, keyed by the slot each card holds in the deck. Cards
              thrown stay ahead of the ones still in the stack, so promoting or
              throwing a card never moves it in this list — and a card that is
              never moved is never remounted, which is what keeps its artwork on
              screen without a blink. */}
          {showDeck &&
            cardWidth > 0 &&
            [
              ...flights.map((flight) => ({
                slot: flight.slot,
                card: flight.card,
                depth: 0,
                thrown: flight.thrown,
              })),
              ...visible.map((entry) => ({ ...entry, thrown: null })),
            ].map((entry) => (
              <DeckCard
                key={entry.slot}
                card={entry.card}
                game={gameFor(entry.card)}
                depth={entry.depth}
                lead={entry.thrown === null && entry.depth === 0}
                thrown={entry.thrown}
                progress={progress}
                enterFrom={rewind?.slot === entry.slot ? rewind : null}
                width={cardWidth}
                height={cardHeight}
                threshold={threshold}
                onCommit={(thrown) => commit(thrown.action, thrown)}
                onOpen={() => setZoomed(entry.card)}
                onExited={() => retire(entry.slot)}
                reduceMotion={reduceMotion}
              />
            ))}
        </div>
      </div>

      {/* Every gesture, as a button */}
      <div className="flex shrink-0 items-center gap-3">
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

        {/* Filled in rather than merely outlined once the card is a favorite:
            the heart is the only thing on screen that can say you already have
            this one, and an outline reads as "not yet" at a glance. */}
        <ControlButton
          label={
            topIsFavorite
              ? "Already in your favorites — keep"
              : "Keep — adds to your favorites"
          }
          onClick={() => commit("keep")}
          disabled={!top}
          className={cn(
            topIsFavorite
              ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
              : "text-emerald-500 hover:border-emerald-500/60 hover:bg-emerald-500/10",
          )}
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

      <p className="hidden shrink-0 text-center text-[10px] uppercase tracking-wider text-muted-foreground md:block">
        ← pass · → keep · ↑ list · space look closer · z undo
      </p>

      {/* Swipes are silent to a screen reader otherwise */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* A closer look, in place — leaving the page would lose the deck */}
      <TcgCardLightbox
        card={zoomed}
        language={language}
        onClose={() => setZoomed(null)}
      />

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
