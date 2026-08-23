"use client";

import { cn } from "@/lib/utils";

/**
 * The dex's chip: a pill that is either off (muted) or on (inverted). Card
 * filters use the same one the Pokemon filter panel does so a filter reads the
 * same wherever it appears.
 */
export function Chip({
  selected,
  onClick,
  children,
  className,
  title,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        selected
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The small all-caps heading every section in the dex is labelled with. */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block text-[10px] uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A labelled group of chips inside the filter panel. */
export function FilterSection({
  label,
  hint,
  onClear,
  children,
}: {
  label: string;
  hint?: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <h4 className="text-xs font-medium text-muted-foreground">
          {label}
          {hint && <span className="ml-1 font-normal">{hint}</span>}
        </h4>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            clear
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
