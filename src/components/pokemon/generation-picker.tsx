"use client";

import { Gamepad2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { GENERATIONS, getGenerationName } from "@/lib/pkmn";
import { cn } from "@/lib/utils";

export interface GenerationPickerProps {
  /**
   * Generations that can be picked here. Anything outside the list is shown
   * disabled — used on a Pokemon's page, where it may not exist in every
   * generation. Defaults to all generations.
   */
  availableGenerations?: number[];
  /** Compact fits a toolbar row; default suits the app header. */
  size?: "default" | "compact";
  align?: "start" | "end";
  className?: string;
}

/**
 * Chooses which generation's games the dex is read as. The choice is global and
 * persisted, so every page (dex, moves, abilities, items, types, teams) follows
 * it.
 */
export function GenerationPicker({
  availableGenerations,
  size = "default",
  align = "end",
  className,
}: GenerationPickerProps) {
  const { preferredGeneration, setPreferredGeneration } =
    useGenerationPreference();

  const isAvailable = (genNum: number) =>
    !availableGenerations || availableGenerations.includes(genNum);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1.5 rounded-md transition-colors hover:bg-muted",
          size === "compact" ? "h-8 px-2" : "px-3 py-1.5",
          preferredGeneration !== null
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
          className,
        )}
        title="View the dex as a specific generation's games"
      >
        <Gamepad2 className="size-4" strokeWidth={1.5} />
        <span className="text-xs lowercase whitespace-nowrap">
          {preferredGeneration !== null
            ? getGenerationName(preferredGeneration)
            : "national"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          view as
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => setPreferredGeneration(null)}
          className={cn(
            "cursor-pointer",
            preferredGeneration === null && "bg-muted",
          )}
        >
          National Dex
          <span className="ml-auto text-xs text-muted-foreground">latest</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {GENERATIONS.map((generation) => (
          <DropdownMenuItem
            key={generation.num}
            disabled={!isAvailable(generation.num)}
            onSelect={() => setPreferredGeneration(generation.num)}
            className={cn(
              "cursor-pointer",
              preferredGeneration === generation.num && "bg-muted",
            )}
          >
            {generation.name}
            <span className="ml-auto text-xs text-muted-foreground">
              {generation.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
