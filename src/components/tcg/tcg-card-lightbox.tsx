"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TcgCardBrief, TcgLanguage } from "@/types/tcg";
import {
  DEFAULT_TCG_LANGUAGE,
  formatLocalId,
  withTcgLanguage,
} from "@/types/tcg";
import { TcgCardImage } from "./tcg-card-image";

interface TcgCardLightboxProps {
  /** The card being held up. `null` closes the viewer. */
  card: TcgCardBrief | null;
  language?: TcgLanguage;
  setName?: string;
  onClose: () => void;
  /** Given when the caller has a list to walk — a grid, a rail, a set. */
  onPrevious?: () => void;
  onNext?: () => void;
  /** Off on the card's own page, where the link would lead back to itself. */
  linkToCard?: boolean;
}

/**
 * A card held up to the light: the scan as large as the screen allows, the one
 * line that names it, and a way through to the full card. Every place that
 * shows card artwork opens this same viewer, so looking closer is one gesture
 * across the grid, the rails and the deck.
 */
export function TcgCardLightbox({
  card,
  language = DEFAULT_TCG_LANGUAGE,
  setName,
  onClose,
  onPrevious,
  onNext,
  linkToCard = true,
}: TcgCardLightboxProps) {
  // Arrow keys walk the same list the viewer was opened from, so a grid can be
  // read card by card without closing anything.
  useEffect(() => {
    if (!card) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft" && onPrevious) {
        event.preventDefault();
        onPrevious();
      } else if (event.key === "ArrowRight" && onNext) {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [card, onNext, onPrevious]);

  const walkable = Boolean(onPrevious || onNext);

  return (
    <Dialog
      open={card !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[min(100vw-1.5rem,34rem)] max-w-none border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">{card?.name ?? "Card"}</DialogTitle>
        {card && (
          <div className="space-y-2">
            <TcgCardImage
              key={card.id}
              image={card.image}
              alt={card.name}
              setName={setName}
              localId={card.localId}
              quality="high"
              width={900}
              height={1238}
              priority
              className="max-h-[78dvh] w-full object-contain"
            />

            <div className="flex items-center gap-1 bg-background/90 px-1 py-1 backdrop-blur">
              {walkable && (
                <StepButton
                  label="Previous card"
                  onClick={onPrevious}
                  icon={<ChevronLeft className="size-4" />}
                />
              )}

              <p className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
                {card.name}{" "}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatLocalId(card.localId)}
                </span>
              </p>

              {linkToCard && (
                <Link
                  href={withTcgLanguage(
                    `/cards/${card.id.toLowerCase()}`,
                    language,
                  )}
                  className="shrink-0 px-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  full card →
                </Link>
              )}

              {walkable && (
                <StepButton
                  label="Next card"
                  onClick={onNext}
                  icon={<ChevronRight className="size-4" />}
                />
              )}

              <StepButton
                label="Close"
                onClick={onClose}
                icon={<X className="size-4" />}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** One step through the list the viewer was opened from. */
function StepButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick?: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={label}
      aria-label={label}
      className="shrink-0 p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
    >
      {icon}
    </button>
  );
}
