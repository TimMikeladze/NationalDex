"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { HoloCard } from "@/components/holo-card";
import { cn } from "@/lib/utils";
import type { TcgCardBrief, TcgLanguage } from "@/types/tcg";
import { TcgCardImage } from "./tcg-card-image";
import { TcgCardLightbox } from "./tcg-card-lightbox";

/**
 * The artwork on a card's page. Card text is printed small, so tapping the
 * scan opens the same viewer the grid uses — as large as the screen allows,
 * the way you would hold a card up to read it.
 */
export function TcgCardZoom({
  card,
  language,
  setName,
  className,
}: {
  card: TcgCardBrief;
  language?: TcgLanguage;
  setName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative block w-full cursor-zoom-in outline-none",
          className,
        )}
        title={`Enlarge ${card.name}`}
      >
        <HoloCard size="lg">
          <TcgCardImage
            image={card.image}
            alt={card.name}
            setName={setName}
            localId={card.localId}
            quality="high"
            width={600}
            height={825}
            priority
          />
        </HoloCard>
        <span className="absolute bottom-2 right-2 z-10 flex size-7 items-center justify-center bg-background/85 text-muted-foreground backdrop-blur transition-colors group-hover:text-foreground">
          <Maximize2 className="size-3.5" />
        </span>
      </button>

      <TcgCardLightbox
        card={open ? card : null}
        language={language}
        setName={setName}
        linkToCard={false}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
