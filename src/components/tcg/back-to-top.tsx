"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * An infinite grid has no bottom to reach and no header to tap, so scrolling
 * back is otherwise a long swipe. Appears once there is enough behind you to
 * make it worth offering.
 */
export function BackToTop({ threshold = 1600 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector("main");
    if (!scrollContainer) return;

    const handleScroll = () => {
      setVisible(scrollContainer.scrollTop > threshold);
    };

    handleScroll();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return (
    <button
      type="button"
      onClick={() =>
        document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" })
      }
      aria-label="Back to top"
      title="Back to top"
      className={cn(
        // Sits on the mobile bottom nav, home indicator included, using the
        // height the shell measured rather than a guess at it plus a raw
        // safe-area inset the browser may already have reserved.
        "fixed bottom-[calc(var(--app-bottom-inset,3.5rem)+0.5rem)] right-4 z-40 lg:bottom-6",
        "flex size-10 items-center justify-center border bg-background/90 text-muted-foreground shadow-sm backdrop-blur",
        "transition-all duration-200 hover:text-foreground",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
