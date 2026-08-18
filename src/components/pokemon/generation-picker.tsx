"use client";

import { ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { Fragment, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { GENERATIONS, getGenerationName } from "@/lib/pkmn";
import { getSpriteSet, getSpriteSetGroups } from "@/lib/sprites";
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
  /**
   * Replaces the default pill with something else to press — used where the
   * picker is a settings row rather than a toolbar button, so the whole row
   * opens the menu instead of just the icon at its end.
   */
  trigger?: React.ReactNode;
}

/**
 * Chooses which generation's games the dex is read as, and which sprite sheet
 * Pokemon are drawn with. Both are global and persisted, so every page (dex,
 * moves, abilities, items, types, teams) follows them. The sprites track the
 * chosen generation until a set is pinned, which is why the two share a menu.
 */
export function GenerationPicker({
  availableGenerations,
  size = "default",
  align = "end",
  className,
  trigger,
}: GenerationPickerProps) {
  const { preferredGeneration, setPreferredGeneration } =
    useGenerationPreference();
  const {
    spriteSetOverride,
    generationSpriteSet,
    followsGeneration,
    setSpriteSetOverride,
  } = useSpritePreferences();

  const isAvailable = (genNum: number) =>
    !availableGenerations || availableGenerations.includes(genNum);

  // The sprite sets used to fly out beside the menu. There is no room beside
  // anything on a phone — a 15rem menu and a 14rem flyout do not fit in 24rem
  // of screen — so the second level opens in place instead, and the menu is
  // never wider than the viewport it has to sit in.
  const [spritesOpen, setSpritesOpen] = useState(false);

  return (
    <DropdownMenu
      onOpenChange={(next) => {
        if (!next) setSpritesOpen(false);
      }}
    >
      {trigger ? (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-1.5 rounded-md transition-colors hover:bg-muted",
            size === "compact" ? "h-8 px-2" : "px-3 py-1.5",
            preferredGeneration !== null
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
            className,
          )}
          title="View the dex as a specific generation's games, and pick its sprites"
        >
          <Gamepad2 className="size-4" strokeWidth={1.5} />
          {/* On narrow screens the icon stands alone, like the toolbar's other
              actions — the active generation is still named on the page itself. */}
          <span className="hidden sm:inline text-xs lowercase whitespace-nowrap">
            {preferredGeneration !== null
              ? getGenerationName(preferredGeneration)
              : "national"}
          </span>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align={align}
        // Never wider than the screen it has to fit inside, and never pressed
        // against the edge of it.
        className="max-h-[70dvh] w-[min(15rem,calc(100vw-1.5rem))] overflow-y-auto"
        collisionPadding={12}
      >
        {spritesOpen ? (
          <>
            <DropdownMenuItem
              onSelect={(event) => {
                // Going back a level is not a choice — the menu stays open.
                event.preventDefault();
                setSpritesOpen(false);
              }}
              className="cursor-pointer"
            >
              <ChevronLeft className="size-4 opacity-50" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                sprites
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setSpriteSetOverride(null)}
              className={cn("cursor-pointer", followsGeneration && "bg-muted")}
            >
              <span className="whitespace-nowrap">Match generation</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">
                {getSpriteSet(generationSpriteSet).label}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {getSpriteSetGroups().map((group) => (
              <Fragment key={group.group}>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {group.group}
                </DropdownMenuLabel>
                {group.sets.map((set) => (
                  <DropdownMenuItem
                    key={set.id}
                    onSelect={() => setSpriteSetOverride(set.id)}
                    className={cn(
                      "cursor-pointer",
                      spriteSetOverride === set.id && "bg-muted",
                    )}
                  >
                    {set.label}
                  </DropdownMenuItem>
                ))}
              </Fragment>
            ))}
          </>
        ) : (
          <>
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
              <span className="ml-auto text-xs text-muted-foreground">
                latest
              </span>
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
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {generation.label}
                </span>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              sprites
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setSpritesOpen(true);
              }}
              className="cursor-pointer"
            >
              <span className="min-w-0 flex-1 truncate">
                {getSpriteSet(spriteSetOverride ?? generationSpriteSet).label}
              </span>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {followsGeneration ? "matched" : "pinned"}
              </span>
              <ChevronRight className="size-3.5 shrink-0 opacity-50" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
