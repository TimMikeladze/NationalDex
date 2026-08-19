"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DeckFormat, DeckFormatId } from "@/types/deck";
import {
  DECK_FORMAT_IDS,
  DECK_FORMATS,
  standardRegulationMarks,
} from "@/types/deck";

/**
 * The one line that says what a format actually asks of a deck. Written the way
 * a player would say it out loud rather than as a table of fields.
 */
export function formatRulesSummary(format: DeckFormat): string {
  const parts = [
    `${format.deckSize} cards`,
    format.maxCopies === 1
      ? "one of each"
      : `max ${format.maxCopies} of a name`,
  ];
  if (format.basicEnergyUncapped) parts.push("Basic Energy uncapped");
  if (!format.usesEnergyCards) parts.push("no energy cards");
  if (format.maxAceSpec > 0) parts.push(`${format.maxAceSpec} ACE SPEC`);
  if (!format.ruleBoxAllowed) parts.push("no rule boxes");
  if (format.singleTypeOnly) parts.push("single type");
  // Which rotation the builder thinks is current, said out loud: it is the one
  // thing here that goes stale on a schedule, and a player will know.
  if (format.pool === "standard") {
    parts.push(`marks ${standardRegulationMarks().join("/")}`);
  }
  return parts.join(" · ");
}

/** The format as a badge — the two or three letters a player writes on a list. */
export function DeckFormatBadge({
  format,
  className,
}: {
  format: DeckFormat;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
      title={`${format.name} — ${formatRulesSummary(format)}`}
    >
      {format.short}
    </span>
  );
}

/**
 * Which rule set the deck is being built to.
 *
 * The format is not a filter on top of a deck, it is the deck's premise: it
 * decides how many cards go in, how many copies of a name, which cards exist at
 * all, and what the builder is checking against. So it is picked once, at the
 * top, and everything below answers to it.
 */
export function DeckFormatPicker({
  value,
  onChange,
  className,
}: {
  value: DeckFormatId;
  onChange: (formatId: DeckFormatId) => void;
  className?: string;
}) {
  const format = DECK_FORMATS[value];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
            className,
          )}
          title={`${format.name} — ${formatRulesSummary(format)}`}
        >
          {format.name}
          <ChevronsUpDown className="size-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(22rem,calc(100vw-1.5rem))] p-1"
      >
        <ul>
          {DECK_FORMAT_IDS.map((id) => {
            const option = DECK_FORMATS[id];
            const selected = id === value;

            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onChange(id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted",
                    selected && "bg-muted",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-xs font-medium">{option.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {option.game === "pocket" ? "Pocket" : "TCG"}
                      </span>
                    </span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">
                      {option.blurb}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                      {formatRulesSummary(option)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
