"use client";

import { type MotionValue, motion } from "motion/react";
import type { DexPokemonListItem } from "@/lib/dex-pokemon";
import { STAT_KEYS, STAT_LABELS } from "@/lib/dex-pokemon";
import { GEN_RANGES } from "@/lib/pkmn";
import { cn } from "@/lib/utils";
import { TYPE_COLORS } from "@/types/pokemon";
import { PokemonImage } from "./pokemon-image";
import { TypeBadge } from "./type-badge";

/** Short labels — six rows have to fit across a phone-sized card. */
const SHORT_STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

/**
 * Where a bar tops out. Almost every base stat sits under this, so the bars
 * use their whole length instead of crowding the left third the way a 255
 * scale does; the handful above it simply fill the bar.
 */
const STAT_BAR_MAX = 180;

function generationOf(dexNumber: number) {
  return GEN_RANGES.find((gen) => dexNumber >= gen.min && dexNumber <= gen.max);
}

/**
 * A Pokémon dealt as a card: tinted by its types, the sprite large in the
 * middle, and its base stats along the bottom — the numbers worth having in
 * hand when deciding whether to keep one. Sized off its own width (container
 * units) so it reads the same in the deck, a peek, or anywhere else.
 */
export function PokemonSwipeFace({
  pokemon,
  sprite,
  priority = false,
  captionFade,
  className,
}: {
  pokemon: DexPokemonListItem;
  sprite: string;
  priority?: boolean;
  /** Fades the stat panel on cards further back in a stack. */
  captionFade?: MotionValue<number>;
  className?: string;
}) {
  const [primary, secondary] = pokemon.types;
  const main = TYPE_COLORS[primary] ?? "#888888";
  const accent = secondary ? TYPE_COLORS[secondary] : main;
  const generation = generationOf(pokemon.baseId);

  return (
    <div
      className={cn(
        "@container relative flex size-full select-none flex-col overflow-hidden bg-card text-card-foreground",
        className,
      )}
      style={
        {
          "--face-main": main,
          "--face-accent": accent,
        } as React.CSSProperties
      }
    >
      {/* The type wash: strongest behind the sprite, fading toward the stats
          so the numbers sit on something calm. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 dark:opacity-40"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 34%, var(--face-main) 0%, color-mix(in oklab, var(--face-accent) 60%, transparent) 45%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[1.6cqw]"
        style={{
          background:
            "linear-gradient(90deg, var(--face-main), var(--face-accent))",
        }}
      />

      {/* Number, generation and name */}
      <div className="relative px-[6cqw] pt-[6cqw]">
        <div className="flex items-baseline justify-between gap-2 text-[3.6cqw] tabular-nums text-muted-foreground">
          <span>#{pokemon.id.toString().padStart(4, "0")}</span>
          {generation && (
            <span className="uppercase tracking-wider">
              {generation.name} · {generation.label}
            </span>
          )}
        </div>
        <h2 className="mt-[1cqw] truncate text-[8cqw] font-semibold leading-tight">
          {pokemon.name}
        </h2>
        <div className="mt-[2cqw] flex flex-wrap gap-[1.5cqw]">
          {pokemon.types.map((type) => (
            <TypeBadge
              key={type}
              type={type}
              className="px-[2cqw] py-[0.6cqw] text-[3.4cqw]"
            />
          ))}
          {pokemon.isLegendary && <Tag>legendary</Tag>}
          {pokemon.isMythical && <Tag>mythical</Tag>}
          {pokemon.isParadox && <Tag>paradox</Tag>}
          {pokemon.isUltraBeast && <Tag>ultra beast</Tag>}
          {pokemon.isMega && <Tag>mega</Tag>}
        </div>
      </div>

      {/* The sprite, as large as the card allows. A soft floor shadow keeps a
          small sprite from floating in the middle of nowhere. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div
          aria-hidden
          className="absolute bottom-[10%] h-[5cqw] w-[42cqw] rounded-[50%] bg-black/15 blur-[2cqw] dark:bg-black/40"
        />
        <PokemonImage
          src={sprite}
          alt={pokemon.name}
          pokemonId={pokemon.id}
          width={256}
          height={256}
          priority={priority}
          className="relative h-full max-h-[58cqw] w-auto max-w-[70cqw] object-contain drop-shadow-[0_1.5cqw_1.5cqw_rgb(0_0_0/0.18)]"
        />
      </div>

      {/* Base stats */}
      <motion.div
        style={captionFade ? { opacity: captionFade } : undefined}
        className="relative mx-[4cqw] mb-[4cqw] space-y-[1.3cqw] rounded-[2cqw] bg-background/75 px-[3.5cqw] py-[3cqw]"
      >
        {STAT_KEYS.map((key) => {
          const value = pokemon.stats[key];
          return (
            <div
              key={key}
              className="flex items-center gap-[2.5cqw] text-[3.4cqw]"
              title={STAT_LABELS[key]}
            >
              <span className="w-[8cqw] shrink-0 text-muted-foreground">
                {SHORT_STAT_LABELS[key]}
              </span>
              <span className="w-[7cqw] shrink-0 text-right font-medium tabular-nums">
                {value}
              </span>
              <span className="h-[1.6cqw] flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (value / STAT_BAR_MAX) * 100)}%`,
                    background:
                      "linear-gradient(90deg, var(--face-main), var(--face-accent))",
                  }}
                />
              </span>
            </div>
          );
        })}
        <div className="flex items-center justify-between border-t pt-[1.5cqw] text-[3.4cqw]">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">
            {pokemon.stats.bst}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border px-[2cqw] py-[0.6cqw] text-[3.4cqw] uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}
