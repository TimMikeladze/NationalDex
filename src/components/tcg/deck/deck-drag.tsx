"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { TcgCardImage } from "../tcg-card-image";

/** The card being carried, in the little a drag needs to draw it. */
export interface DragCard {
  id: string;
  name: string;
  localId: string;
  image?: string;
}

export interface DeckDragPayload {
  /** Where the card was picked up — a drop means different things from each. */
  source: "search" | "deck";
  card: DragCard;
}

interface DropZone {
  id: string;
  accepts: (payload: DeckDragPayload) => boolean;
  onDrop: (payload: DeckDragPayload) => void;
}

interface DeckDragContextValue {
  /** What is currently being carried, or null when nothing is. */
  payload: DeckDragPayload | null;
  /** The zone the pointer is over, so it can light up. */
  overZoneId: string | null;
  begin: (
    payload: DeckDragPayload,
    event: React.PointerEvent<HTMLElement>,
  ) => void;
  registerZone: (zone: DropZone) => () => void;
  /** True just after a drag ended, so the click it would fire is ignored. */
  justDragged: () => boolean;
}

const DeckDragContext = createContext<DeckDragContextValue | null>(null);

/** How far a mouse moves before a press becomes a drag. */
const MOUSE_THRESHOLD = 6;

/**
 * How long a finger rests before a press becomes a drag. Below this the touch
 * is a scroll — a card grid is something you swipe through far more often than
 * you drag from, so scrolling wins ties.
 */
const TOUCH_HOLD_MS = 220;

/** How far a finger may drift during the hold before it counts as a scroll. */
const TOUCH_SLOP = 12;

/** The window after a drag in which a click is a leftover, not an intent. */
const CLICK_SUPPRESSION_MS = 320;

interface DragState {
  payload: DeckDragPayload;
  x: number;
  y: number;
}

/**
 * Dragging cards, in the one gesture that works with a mouse and with a finger.
 *
 * Building a deck is a physical habit — you pull a card out of the binder and
 * put it in the pile — so the builder lets you do exactly that. It is built on
 * pointer events rather than HTML drag and drop, which does not exist on a
 * phone at all, and every drag has a button beside it that does the same thing
 * for anyone not using a pointer.
 */
export function DeckDragProvider({ children }: { children: React.ReactNode }) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overZoneId, setOverZoneId] = useState<string | null>(null);

  const zones = useRef(new Map<string, DropZone>());
  const dragEndedAt = useRef(0);
  const gesture = useRef<{
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    payload: DeckDragPayload;
    active: boolean;
    holdTimer: number | null;
  } | null>(null);

  const registerZone = useCallback((zone: DropZone) => {
    zones.current.set(zone.id, zone);
    return () => {
      zones.current.delete(zone.id);
    };
  }, []);

  const zoneAt = useCallback((x: number, y: number): DropZone | null => {
    const element = document.elementFromPoint(x, y);
    const host = element?.closest("[data-deck-drop-zone]");
    const id = host?.getAttribute("data-deck-drop-zone");
    return id ? (zones.current.get(id) ?? null) : null;
  }, []);

  const finish = useCallback(() => {
    const current = gesture.current;
    if (current?.holdTimer) window.clearTimeout(current.holdTimer);
    if (current?.active) dragEndedAt.current = Date.now();
    gesture.current = null;
    setDrag(null);
    setOverZoneId(null);
  }, []);

  const begin = useCallback(
    (payload: DeckDragPayload, event: React.PointerEvent<HTMLElement>) => {
      // Right and middle clicks belong to the browser.
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const { clientX, clientY, pointerId, pointerType } = event;

      const startDragging = () => {
        const current = gesture.current;
        if (!current || current.active) return;
        current.active = true;
        setDrag({ payload, x: clientX, y: clientY });
      };

      gesture.current = {
        pointerId,
        pointerType,
        startX: clientX,
        startY: clientY,
        payload,
        active: false,
        holdTimer:
          pointerType === "mouse"
            ? null
            : window.setTimeout(startDragging, TOUCH_HOLD_MS),
      };
    },
    [],
  );

  // The gesture is followed on the window rather than on the card: a drag
  // leaves the element it started on immediately, and has to survive being let
  // go anywhere on the page.
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || event.pointerId !== current.pointerId) return;

      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;

      if (!current.active) {
        const distance = Math.hypot(dx, dy);
        if (current.pointerType === "mouse") {
          if (distance < MOUSE_THRESHOLD) return;
          current.active = true;
          setDrag({
            payload: current.payload,
            x: event.clientX,
            y: event.clientY,
          });
        } else {
          // A finger that moves before the hold is over is scrolling the page.
          if (distance > TOUCH_SLOP) {
            if (current.holdTimer) window.clearTimeout(current.holdTimer);
            gesture.current = null;
          }
          return;
        }
      }

      setDrag((state) =>
        state ? { ...state, x: event.clientX, y: event.clientY } : state,
      );
      setOverZoneId((previous) => {
        const zone = zoneAt(event.clientX, event.clientY);
        const next = zone?.accepts(current.payload) ? zone.id : null;
        return next === previous ? previous : next;
      });
    };

    const handleUp = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || event.pointerId !== current.pointerId) return;

      if (current.active) {
        const zone = zoneAt(event.clientX, event.clientY);
        if (zone?.accepts(current.payload)) zone.onDrop(current.payload);
      }
      finish();
    };

    const handleCancel = () => finish();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };

    // While a card is being carried, the page must not scroll out from under
    // it. Only a live drag preventDefaults, so an ordinary swipe is untouched.
    const handleTouchMove = (event: TouchEvent) => {
      if (gesture.current?.active) event.preventDefault();
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [finish, zoneAt]);

  const justDragged = useCallback(
    () => Date.now() - dragEndedAt.current < CLICK_SUPPRESSION_MS,
    [],
  );

  const value = useMemo<DeckDragContextValue>(
    () => ({
      payload: drag?.payload ?? null,
      overZoneId,
      begin,
      registerZone,
      justDragged,
    }),
    [drag?.payload, overZoneId, begin, registerZone, justDragged],
  );

  return (
    <DeckDragContext.Provider value={value}>
      {children}
      {drag && <DragLayer state={drag} />}
    </DeckDragContext.Provider>
  );
}

function useDeckDragContext(): DeckDragContextValue {
  const context = useContext(DeckDragContext);
  if (!context) {
    throw new Error("Deck drag components must be inside a DeckDragProvider");
  }
  return context;
}

/** The card under the pointer, drawn as if it were being carried. */
function DragLayer({ state }: { state: DragState }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] w-24 -translate-x-1/2 -translate-y-1/2 rotate-3 opacity-90 drop-shadow-2xl"
      style={{ left: state.x, top: state.y }}
      aria-hidden="true"
    >
      <TcgCardImage
        image={state.payload.card.image}
        alt=""
        localId={state.payload.card.localId}
        className="w-full"
      />
    </div>,
    document.body,
  );
}

/**
 * Makes a card pick-up-able. Spread the returned props onto whatever draws the
 * card; `wasDragged` tells a click handler that the press it is answering was
 * really a drag.
 */
export function useDeckDragSource(payload: DeckDragPayload) {
  const { begin, justDragged, payload: carried } = useDeckDragContext();

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => begin(payload, event),
    [begin, payload],
  );

  return {
    dragProps: {
      onPointerDown,
      /**
       * A card is a picture, and the browser's own idea of dragging a picture
       * is to tear it off as a file. That gesture cancels the pointer the
       * moment it starts — the card would stick to the cursor for one frame
       * and then die — so the native drag is refused and this one takes over.
       */
      onDragStart: (event: React.DragEvent<HTMLElement>) =>
        event.preventDefault(),
      draggable: false,
      // Vertical scrolling still belongs to the page — the drag is what
      // happens when a finger stays put instead. Nothing should be selected
      // by a press that turns out to be a drag, either.
      style: {
        touchAction: "pan-y" as const,
        WebkitUserSelect: "none" as const,
        userSelect: "none" as const,
      },
    },
    isDragging: carried?.card.id === payload.card.id,
    wasDragged: justDragged,
  };
}

/**
 * Marks an area as somewhere cards can be dropped. The zone lights up only for
 * a drag it would actually accept, so a card from the deck does not make the
 * deck itself look like a target.
 */
export function useDeckDropZone(options: {
  id: string;
  accepts?: (payload: DeckDragPayload) => boolean;
  onDrop: (payload: DeckDragPayload) => void;
}) {
  const { registerZone, payload, overZoneId } = useDeckDragContext();
  const { id, accepts, onDrop } = options;

  const handlers = useRef({ accepts, onDrop });
  handlers.current = { accepts, onDrop };

  useEffect(
    () =>
      registerZone({
        id,
        accepts: (dragged) => handlers.current.accepts?.(dragged) ?? true,
        onDrop: (dragged) => handlers.current.onDrop(dragged),
      }),
    [id, registerZone],
  );

  const armed = payload !== null && (accepts?.(payload) ?? true);

  return {
    dropProps: { "data-deck-drop-zone": id },
    /** A drag is in progress that this zone would take. */
    isArmed: armed,
    /** The card is over this zone right now. */
    isOver: armed && overZoneId === id,
  };
}

/** The dashed outline a zone wears while a card is in the air. */
export function dropZoneClasses(isArmed: boolean, isOver: boolean): string {
  return cn(
    // Inset rather than an outline: these zones scroll their own content, and
    // an outline drawn outside the box is the first thing to get clipped.
    "transition-colors",
    isArmed && "ring-2 ring-inset ring-border",
    isOver && "bg-foreground/5 ring-foreground",
  );
}
