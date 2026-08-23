"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { DeckIssue, DeckIssueLevel } from "@/lib/deck";
import { cn } from "@/lib/utils";
import type { DeckFormat } from "@/types/deck";

const LEVEL_ICONS: Record<DeckIssueLevel, typeof CircleAlert> = {
  error: CircleAlert,
  warning: TriangleAlert,
  note: Info,
};

const LEVEL_COLORS: Record<DeckIssueLevel, string> = {
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-500",
  note: "text-muted-foreground",
};

/**
 * Everything standing between this list and a deck you could hand to a judge,
 * worst first.
 *
 * The three levels are three different conversations: an error is the deck
 * being illegal, a warning is the deck being unreliable, and a note is
 * something a good player would at least have thought about. Keeping them apart
 * is what stops "no Rare Candy" reading as loudly as "61 cards".
 */
export function DeckIssues({
  issues,
  format,
  isEmpty,
  onFocus,
  focusedId,
}: {
  issues: DeckIssue[];
  format: DeckFormat;
  /** A deck with nothing in it is not failing, it just has not started. */
  isEmpty: boolean;
  onFocus: (issue: DeckIssue) => void;
  focusedId: string | null;
}) {
  const errors = issues.filter((issue) => issue.level === "error");

  if (isEmpty) {
    return (
      <p className="px-1 py-8 text-center text-xs text-muted-foreground">
        {format.deckSize} cards, at most {format.maxCopies} of a name
        {format.basicEnergyUncapped ? " (Basic Energy aside)" : ""}, and at
        least one Basic Pokemon. The list checks itself as you build.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-2 text-xs",
          errors.length === 0
            ? "text-emerald-600 dark:text-emerald-500"
            : "text-destructive",
        )}
      >
        {errors.length === 0 ? (
          <CircleCheck className="size-4 shrink-0" />
        ) : (
          <CircleAlert className="size-4 shrink-0" />
        )}
        <span>
          {errors.length === 0
            ? `Legal for ${format.name}`
            : `${errors.length} thing${errors.length === 1 ? "" : "s"} to fix for ${format.name}`}
        </span>
      </div>

      {issues.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing to flag — the counts, the lines and the energy all hold up.
        </p>
      ) : (
        <ul className="space-y-1">
          {issues.map((issue) => {
            const Icon = LEVEL_ICONS[issue.level];
            const focusable = (issue.cardIds?.length ?? 0) > 0;

            return (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => onFocus(issue)}
                  disabled={!focusable}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors",
                    focusable && "hover:bg-muted",
                    focusedId === issue.id && "bg-muted",
                    !focusable && "cursor-default",
                  )}
                  title={focusable ? "Show these cards in the deck" : undefined}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      LEVEL_COLORS[issue.level],
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">
                      {issue.title}
                    </span>
                    {issue.detail && (
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {issue.detail}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
