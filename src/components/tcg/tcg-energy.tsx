"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { TCG_ENERGY_COLORS, tcgTypeToPokemonType } from "@/types/tcg";

/** A single energy symbol, as printed in an attack's cost. */
export function EnergyDot({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const color = TCG_ENERGY_COLORS[type] ?? "#94A3B8";

  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: color }}
      title={type}
    >
      {type.charAt(0)}
    </span>
  );
}

/**
 * An energy type badge. The card game's eleven energy types collapse the video
 * games' eighteen, so the ones with a counterpart link through to that type's
 * page and the rest stay plain.
 */
export function EnergyBadge({
  type,
  linkable = false,
  className,
}: {
  type: string;
  linkable?: boolean;
  className?: string;
}) {
  const color = TCG_ENERGY_COLORS[type] ?? "#94A3B8";
  const pokemonType = linkable ? tcgTypeToPokemonType(type) : null;

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider",
        className,
      )}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {type}
    </span>
  );

  if (!pokemonType) return badge;

  return (
    <Link
      href={`/types/${pokemonType.toLowerCase()}`}
      className="transition-opacity hover:opacity-80"
      title={`${pokemonType} type`}
    >
      {badge}
    </Link>
  );
}

/** The energy cost of an attack, or a dash for free attacks. */
export function EnergyCost({ cost }: { cost?: string[] }) {
  if (!cost || cost.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {cost.map((type, index) => (
        <EnergyDot key={`${type}-${index}`} type={type} />
      ))}
    </span>
  );
}
