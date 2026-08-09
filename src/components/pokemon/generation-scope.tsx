"use client";

import { Gamepad2 } from "lucide-react";
import { getGenerationGames, getGenerationName } from "@/lib/pkmn";
import { cn } from "@/lib/utils";

export interface GenerationScopeProps {
  /** Generation the page is being read as, or null for the latest data. */
  activeGeneration: number | null;
  /**
   * Set when the preferred generation could not be honoured, so the page falls
   * back to the latest data and says why.
   */
  unavailableGeneration?: number | null;
  /** What the notice is about, e.g. "Kakuna" or "Alluring Voice". */
  subject: string;
  className?: string;
}

/**
 * The badge every page shows while it is scoped to a generation, plus the note
 * shown when the subject didn't exist in the generation the user picked.
 */
export function GenerationScope({
  activeGeneration,
  unavailableGeneration = null,
  subject,
  className,
}: GenerationScopeProps) {
  if (unavailableGeneration !== null) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {subject} is not in {getGenerationName(unavailableGeneration)} (
        {getGenerationGames(unavailableGeneration)}) — showing the latest data.
      </p>
    );
  }

  if (activeGeneration === null) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded border border-border bg-muted text-muted-foreground px-2 py-0.5 text-xs",
        className,
      )}
    >
      <Gamepad2 className="size-3" />
      {getGenerationName(activeGeneration)} data (
      {getGenerationGames(activeGeneration)})
    </span>
  );
}

/**
 * Resolves the preference against what a page can actually show: the generation
 * to render, and the one that had to be dropped (if any).
 */
export function resolveGenerationScope(
  preferredGeneration: number | null,
  availableGenerations: number[],
) {
  const activeGeneration =
    preferredGeneration !== null &&
    availableGenerations.includes(preferredGeneration)
      ? preferredGeneration
      : null;

  return {
    activeGeneration,
    unavailableGeneration:
      preferredGeneration !== null && activeGeneration === null
        ? preferredGeneration
        : null,
  };
}
