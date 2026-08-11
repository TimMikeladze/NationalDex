"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TcgCardImage } from "./tcg-card-image";

/**
 * The artwork on a card's page. Card text is printed small, so tapping the
 * scan opens it as large as the screen allows — the way you would hold a card
 * up to read it.
 */
export function TcgCardZoom({
  image,
  alt,
  setName,
  localId,
  className,
}: {
  image?: string | null;
  alt: string;
  setName?: string;
  localId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative block w-full cursor-zoom-in outline-none",
            className,
          )}
          title="Enlarge card"
        >
          <TcgCardImage
            image={image}
            alt={alt}
            setName={setName}
            localId={localId}
            quality="high"
            width={600}
            height={825}
            priority
            className="shadow-lg transition-transform duration-200 group-active:scale-[0.99]"
          />
          <span className="absolute bottom-2 right-2 flex size-7 items-center justify-center bg-background/85 text-muted-foreground backdrop-blur transition-colors group-hover:text-foreground">
            <Maximize2 className="size-3.5" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="max-w-[min(100vw-1.5rem,32rem)] border-0 bg-transparent p-0 shadow-none sm:max-w-md"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <TcgCardImage
          image={image}
          alt={alt}
          setName={setName}
          localId={localId}
          quality="high"
          width={900}
          height={1238}
          priority
          className="max-h-[85dvh] w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
