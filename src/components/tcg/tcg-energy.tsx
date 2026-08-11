"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  energyTextColor,
  TCG_ENERGY_COLORS,
  TCG_ENERGY_TYPES,
  tcgTypeToPokemonType,
} from "@/types/tcg";

const FALLBACK_COLOR = "#94A3B8";

/**
 * The printed energy symbols, saved locally from Bulbagarden Archives. Each
 * one already carries its own coloured disc, so the symbol is the whole icon —
 * nothing is drawn behind it.
 */
const ENERGY_ICONS = new Set<string>(TCG_ENERGY_TYPES);

/**
 * The shorthand players write energy in — G for Grass, R for Fire, N for
 * Dragon. Only reached for an energy with no symbol on file, which is anything
 * the card game adds after this was written.
 */
const ENERGY_SHORTHAND: Record<string, string> = {
  Grass: "G",
  Fire: "R",
  Water: "W",
  Lightning: "L",
  Psychic: "P",
  Fighting: "F",
  Darkness: "D",
  Metal: "M",
  Fairy: "Y",
  Dragon: "N",
  Colorless: "C",
};

/** A single energy symbol, as printed in an attack's cost. */
export function EnergyDot({
  type,
  size = "default",
  className,
}: {
  type: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "size-4" : "size-5";

  if (!ENERGY_ICONS.has(type)) {
    const color = TCG_ENERGY_COLORS[type] ?? FALLBACK_COLOR;
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white",
          sizeClass,
          size === "sm" ? "text-[9px]" : "text-[10px]",
          className,
        )}
        style={{ backgroundColor: color }}
        title={type}
      >
        {ENERGY_SHORTHAND[type] ?? type.charAt(0).toUpperCase()}
        <span className="sr-only">{type}</span>
      </span>
    );
  }

  return (
    <Image
      src={`/tcg/energy/${type.toLowerCase()}.png`}
      alt={type}
      title={type}
      width={40}
      height={40}
      className={cn("shrink-0 object-contain", sizeClass, className)}
    />
  );
}

/**
 * An energy type badge. The card game's eleven energy types collapse the video
 * games' eighteen, so the ones with a counterpart link through to that type's
 * page and the rest stay plain.
 */
export function EnergyBadge({
  type,
  value,
  linkable = false,
  className,
}: {
  type: string;
  /** A weakness or resistance modifier, printed alongside the type. */
  value?: string;
  linkable?: boolean;
  className?: string;
}) {
  const color = TCG_ENERGY_COLORS[type] ?? FALLBACK_COLOR;
  const pokemonType = linkable ? tcgTypeToPokemonType(type) : null;

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded py-1 pl-1 pr-2 text-[10px] font-medium uppercase tracking-wider",
        "text-(--energy-fg) dark:text-(--energy-fg-dark)",
        className,
      )}
      style={
        {
          backgroundColor: `${color}20`,
          "--energy-fg": energyTextColor(type),
          "--energy-fg-dark": color,
        } as React.CSSProperties
      }
    >
      <EnergyDot type={type} size="sm" />
      {type}
      {value && <span className="tabular-nums opacity-80">{value}</span>}
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
export function EnergyCost({
  cost,
  className,
}: {
  cost?: string[];
  className?: string;
}) {
  if (!cost || cost.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <span className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {cost.map((type, index) => (
        <EnergyDot key={`${type}-${index}`} type={type} />
      ))}
    </span>
  );
}

/** Retreat cost, printed as the colorless energies it actually costs. */
export function RetreatCost({ retreat }: { retreat: number }) {
  if (retreat === 0) {
    return <span className="text-xs text-muted-foreground">free</span>;
  }

  return (
    <EnergyCost cost={Array.from({ length: retreat }, () => "Colorless")} />
  );
}
