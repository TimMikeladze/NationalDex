"use client";

import {
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  Heart,
  ListPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { useSecondaryToolbar } from "@/components/app-shell";
import { StatBar } from "@/components/pokemon/stat-bar";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useComparison } from "@/hooks/use-comparison";
import { useFavorites } from "@/hooks/use-favorites";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import {
  calculateTypeEffectiveness,
  useEvolutionChain,
  usePokemonMoves,
  usePokemonWithSpecies,
} from "@/hooks/use-pokemon";
import { getDexPokemonVariationsByDexNumber } from "@/lib/dex-pokemon";
import { toID } from "@/lib/pkmn";
import { pokemonSprite, pokemonSpriteById, type SpriteGen } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type {
  EvolutionChainLink,
  Pokemon,
  PokemonMove,
  PokemonSpecies,
} from "@/types/pokemon";

const MAX_POKEMON_ID = 1025;

const isAnimatedSprite = (src: string) => src.toLowerCase().endsWith(".gif");

const MOVES_SKELETON_GROUP_KEYS = Array.from(
  { length: 3 },
  (_, i) => `moves-skel-group-${i}`,
);
const MOVES_SKELETON_ROW_KEYS = Array.from(
  { length: 4 },
  (_, i) => `moves-skel-row-${i}`,
);
const EVOLUTION_SKELETON_KEYS = Array.from(
  { length: 3 },
  (_, i) => `evo-skel-${i}`,
);
const WEAKNESS_SKELETON_KEYS = Array.from(
  { length: 4 },
  (_, i) => `weak-skel-${i}`,
);
const RESISTANCE_SKELETON_KEYS = Array.from(
  { length: 3 },
  (_, i) => `resist-skel-${i}`,
);
const STAT_SKELETON_KEYS = Array.from(
  { length: 6 },
  (_, i) => `stat-skel-${i}`,
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PokemonPage({ params }: PageProps) {
  const { id } = use(params);
  const { pokemon, species, isLoading } = usePokemonWithSpecies(id);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInComparison, toggleComparison, canAddMore } = useComparison();
  const setSecondaryToolbar = useSecondaryToolbar();
  const { defaultPokemonSpriteGen, showPokemonSpriteVariants } =
    useSpritePreferences();
  const { data: moves, isLoading: movesLoading } = usePokemonMoves(id);
  const { data: evolutionChain, isLoading: evolutionLoading } =
    useEvolutionChain(species?.evolutionChainUrl ?? null);

  const [spriteGenOverride, setSpriteGenOverride] = useState<
    "default" | SpriteGen
  >("default");
  const [spriteShiny, setSpriteShiny] = useState(false);
  const [spriteBack, setSpriteBack] = useState(false);
  const [spriteFemale, setSpriteFemale] = useState(false);

  const typeEffectiveness = useMemo(() => {
    if (!pokemon) return null;
    return calculateTypeEffectiveness(pokemon.types);
  }, [pokemon]);

  const variations = useMemo(() => {
    if (!pokemon) return [];
    return getDexPokemonVariationsByDexNumber(9, pokemon.id);
  }, [pokemon]);

  const secondaryToolbarContent = useMemo(() => {
    if (!pokemon) return null;

    return (
      <>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {pokemon.id > 1 ? (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
              title="Previous Pokemon"
            >
              <Link href={`/pokemon/${pokemon.id - 1}`}>
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline text-xs">prev</span>
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
          <div className="flex items-center gap-2 leading-none min-w-0">
            <span className="text-xs text-muted-foreground tabular-nums shrink-0 leading-none">
              #{pokemon.id.toString().padStart(3, "0")}
            </span>
            <span className="text-sm font-medium truncate leading-none">
              {pokemon.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={() => toggleComparison(pokemon.id)}
            disabled={!canAddMore && !isInComparison(pokemon.id)}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 gap-1.5 transition-colors",
              isInComparison(pokemon.id)
                ? "text-blue-500 hover:text-blue-500"
                : "text-muted-foreground hover:text-foreground",
              !canAddMore && !isInComparison(pokemon.id) && "opacity-50",
            )}
            title={
              isInComparison(pokemon.id)
                ? "Remove from comparison"
                : "Add to comparison"
            }
          >
            <GitCompareArrows className="size-4" />
            <span className="hidden sm:inline text-xs">
              {isInComparison(pokemon.id) ? "compared" : "compare"}
            </span>
          </Button>

          <Button
            type="button"
            onClick={() => toggleFavorite(pokemon.id)}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 gap-1.5 transition-colors",
              isFavorite(pokemon.id)
                ? "text-rose-500 hover:text-rose-500"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={
              isFavorite(pokemon.id)
                ? "Remove from favorites"
                : "Add to favorites"
            }
          >
            <Heart
              className={cn("size-4", isFavorite(pokemon.id) && "fill-current")}
            />
            <span className="hidden sm:inline text-xs">
              {isFavorite(pokemon.id) ? "favorited" : "favorite"}
            </span>
          </Button>

          <AddToListDialog
            itemType="pokemon"
            itemId={pokemon.id.toString()}
            itemName={pokemon.name}
            itemSprite={pokemon.sprite}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
                title="Add to list"
              >
                <ListPlus className="size-4" />
                <span className="hidden sm:inline text-xs">list</span>
              </Button>
            }
          />
          {pokemon.id < MAX_POKEMON_ID ? (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
              title="Next Pokemon"
            >
              <Link href={`/pokemon/${pokemon.id + 1}`}>
                <span className="hidden sm:inline text-xs">next</span>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
        </div>
      </>
    );
  }, [
    pokemon,
    canAddMore,
    isFavorite,
    isInComparison,
    toggleComparison,
    toggleFavorite,
  ]);

  useEffect(() => {
    if (secondaryToolbarContent) {
      setSecondaryToolbar({ content: secondaryToolbarContent });
    } else {
      setSecondaryToolbar(null);
    }

    return () => setSecondaryToolbar(null);
  }, [secondaryToolbarContent, setSecondaryToolbar]);

  if (isLoading || !pokemon) {
    return <PokemonPageSkeleton />;
  }

  const effectiveGen =
    spriteGenOverride === "default" ? defaultPokemonSpriteGen : spriteGenOverride;

  const currentHeroSprite =
    pokemonSprite(pokemon.name, {
      gen: effectiveGen,
      shiny: spriteShiny,
      female: spriteFemale,
      side: spriteBack ? "back" : "front",
    }) || pokemon.sprite;

  const statTotal = pokemon.stats.reduce((sum, s) => sum + s.value, 0);
  const currentSlug = toID(pokemon.name);

  return (
    <div className="min-h-screen p-4 md:p-6 xl:h-[calc(100dvh-var(--app-top-offset))] xl:overflow-hidden">
        <div className="space-y-6 xl:space-y-0 xl:grid xl:grid-cols-12 xl:gap-8 xl:h-full">
          {/* Summary rail (static on desktop) */}
          <div className="space-y-6 xl:col-span-5 2xl:col-span-4 xl:self-start">
            {/* Core Header */}
            <section className="space-y-4">
              {/* Hero */}
              <div className="flex flex-col items-center gap-3">
              <Image
                src={currentHeroSprite}
                alt={pokemon.name}
                width={192}
                height={192}
                className="size-32 md:size-40 xl:size-44 2xl:size-48 mx-auto pixelated"
                unoptimized={isAnimatedSprite(currentHeroSprite)}
                priority
              />

              {showPokemonSpriteVariants && (
                <div className="w-full max-w-sm space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      sprite
                    </span>
                    <Select
                      value={spriteGenOverride}
                      onValueChange={(v) =>
                        setSpriteGenOverride(v as "default" | SpriteGen)
                      }
                    >
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="gen5">Gen 5 (static)</SelectItem>
                        <SelectItem value="ani">Animated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                      <span className="text-xs">Shiny</span>
                      <Switch
                        aria-label="Toggle shiny sprite"
                        checked={spriteShiny}
                        onCheckedChange={setSpriteShiny}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                      <span className="text-xs">Back</span>
                      <Switch
                        aria-label="Toggle back sprite"
                        checked={spriteBack}
                        onCheckedChange={setSpriteBack}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                      <span className="text-xs">Female</span>
                      <Switch
                        aria-label="Toggle female sprite"
                        checked={spriteFemale}
                        onCheckedChange={setSpriteFemale}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { key: "normal-front", shiny: false, side: "front" as const },
                        { key: "shiny-front", shiny: true, side: "front" as const },
                        { key: "normal-back", shiny: false, side: "back" as const },
                        { key: "shiny-back", shiny: true, side: "back" as const },
                      ] as const
                    ).map((v) => {
                      const url = pokemonSprite(pokemon.name, {
                        gen: effectiveGen,
                        shiny: v.shiny,
                        female: spriteFemale,
                        side: v.side,
                      });
                      const previewSrc = url ?? pokemon.sprite;
                      const isSelected =
                        spriteShiny === v.shiny &&
                        spriteBack === (v.side === "back");
                      return (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => {
                            setSpriteShiny(v.shiny);
                            setSpriteBack(v.side === "back");
                          }}
                          className={cn(
                            "rounded border p-1 hover:bg-muted/50 transition-colors",
                            isSelected && "ring-1 ring-primary bg-muted",
                          )}
                          title={v.key.replace("-", " ")}
                        >
                          <Image
                            src={previewSrc}
                            alt={pokemon.name}
                            width={48}
                            height={48}
                            className="mx-auto size-10 pixelated"
                            unoptimized={isAnimatedSprite(previewSrc)}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-center space-y-2">
                <h1 className="text-xl font-medium">{pokemon.name}</h1>
                {species && (
                  <p className="text-xs text-muted-foreground">
                    {species.genus}
                  </p>
                )}
                <div className="flex justify-center gap-2">
                  {pokemon.types.map((type) => (
                    <TypeBadge key={type} type={type} size="default" linkable />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Type Effectiveness */}
          {typeEffectiveness && (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>weaknesses</Label>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.weaknesses.map(({ type, multiplier }) => (
                    <TypeBadge
                      key={type}
                      type={type}
                      multiplier={multiplier}
                      size="sm"
                      linkable
                    />
                  ))}
                  {typeEffectiveness.weaknesses.length === 0 && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>resistances</Label>
                <div className="flex flex-wrap gap-1">
                  {typeEffectiveness.resistances.map(({ type, multiplier }) => (
                    <TypeBadge
                      key={type}
                      type={type}
                      multiplier={multiplier}
                      size="sm"
                      linkable
                    />
                  ))}
                  {typeEffectiveness.immunities.map((type) => (
                    <TypeBadge
                      key={type}
                      type={type}
                      multiplier={0}
                      size="sm"
                      linkable
                    />
                  ))}
                  {typeEffectiveness.resistances.length === 0 &&
                    typeEffectiveness.immunities.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        None
                      </span>
                    )}
                </div>
              </div>
            </section>
          )}

          {/* Abilities */}
          <AbilitiesSection pokemon={pokemon} />

          {/* Stats */}
          <section className="space-y-3">
            <Label>base stats</Label>
            <div className="space-y-2">
              {pokemon.stats.map((stat) => (
                <StatBar key={stat.name} stat={stat} />
              ))}
            </div>
            <div className="flex justify-between text-xs pt-1 border-t">
              <span className="text-muted-foreground">Total</span>
              <span className="tabular-nums font-medium">{statTotal}</span>
            </div>
          </section>

          {/* Evolution */}
          <EvolutionSection
            chain={evolutionChain}
            isLoading={evolutionLoading}
            currentSlug={currentSlug}
          />

          {/* Variations / Formes */}
          {variations.length > 1 && (
            <section className="space-y-2">
              <Label>variations</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between gap-3 px-3"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Image
                        src={pokemon.sprite}
                        alt={pokemon.name}
                        width={20}
                        height={20}
                        className="size-5 pixelated"
                        unoptimized={isAnimatedSprite(pokemon.sprite)}
                      />
                      <span className="truncate text-xs font-medium">
                        {pokemon.name}
                      </span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      change
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-(--radix-dropdown-menu-trigger-width)"
                >
                  {variations.map((v) => {
                    const isCurrent = v.slug === toID(pokemon.name);
                    const sprite =
                      pokemonSprite(v.name, {
                        gen: defaultPokemonSpriteGen,
                      }) || pokemonSpriteById(v.id);
                    return (
                      <DropdownMenuItem key={v.slug} asChild>
                        <Link
                          href={`/pokemon/${v.slug}`}
                          className={cn(
                            "flex items-center gap-2",
                            isCurrent && "bg-muted",
                          )}
                        >
                          <Image
                            src={sprite}
                            alt={v.name}
                            width={20}
                            height={20}
                            className="size-5 pixelated"
                            unoptimized={isAnimatedSprite(sprite)}
                          />
                          <span className="text-sm">{v.name}</span>
                          {isCurrent && (
                            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                              current
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </section>
          )}

          <DetailsSection pokemon={pokemon} species={species} />
        </div>

        {/* Main content column */}
        <div className="space-y-6 xl:col-span-7 2xl:col-span-8 xl:h-full xl:overflow-y-auto xl:pr-2">
          {/* Moves */}
          <MovesSection moves={moves} isLoading={movesLoading} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
      {children}
    </span>
  );
}

function AbilitiesSection({ pokemon }: { pokemon: Pokemon }) {
  return (
    <section className="space-y-2">
      <Label>abilities</Label>
      <div className="flex flex-wrap gap-2">
        {pokemon.abilities.map((ability) => {
          const slug = ability.name.toLowerCase().replace(/\s+/g, "-");
          return (
            <Link
              key={ability.name}
              href={`/abilities/${slug}`}
              className={cn(
                "text-xs px-2 py-1 border rounded hover:bg-muted/50 transition-colors cursor-pointer",
                ability.isHidden && "text-muted-foreground border-dashed",
              )}
            >
              {ability.name}
              {ability.isHidden && " (hidden)"}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Moves Section
// ============================================================================

function MovesSection({
  moves,
  isLoading,
}: {
  moves?: PokemonMove[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <section className="space-y-4">
        <Label>moves</Label>
        {MOVES_SKELETON_GROUP_KEYS.map((groupKey) => (
          <div key={groupKey} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            {MOVES_SKELETON_ROW_KEYS.map((rowKey) => (
              <Skeleton key={`${groupKey}-${rowKey}`} className="h-6 w-full" />
            ))}
          </div>
        ))}
      </section>
    );
  }

  if (!moves || moves.length === 0) {
    return (
      <section className="space-y-3">
        <Label>moves</Label>
        <p className="text-sm text-muted-foreground">No moves found.</p>
      </section>
    );
  }

  const levelUpMoves = moves
    .filter((m) => m.learnMethod === "level-up")
    .sort((a, b) => a.levelLearnedAt - b.levelLearnedAt);

  const tmMoves = moves
    .filter((m) => m.learnMethod === "machine")
    .sort((a, b) => a.name.localeCompare(b.name));

  const eggMoves = moves
    .filter((m) => m.learnMethod === "egg")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="space-y-4">
      <Label>moves</Label>
      <div className="space-y-6">
        {levelUpMoves.length > 0 && (
          <MoveGroup title="Level Up" moves={levelUpMoves} showLevel />
        )}
        {tmMoves.length > 0 && <MoveGroup title="TM / HM" moves={tmMoves} />}
        {eggMoves.length > 0 && (
          <MoveGroup title="Egg Moves" moves={eggMoves} />
        )}
      </div>
    </section>
  );
}

function MoveGroup({
  title,
  moves,
  showLevel = false,
}: {
  title: string;
  moves: PokemonMove[];
  showLevel?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="space-y-1">
        {moves.map((move, idx) => {
          const slug = move.name.toLowerCase().replace(/\s+/g, "-");
          return (
            <Link
              key={`${move.name}-${idx}`}
              href={`/moves/${slug}`}
              className="flex items-center gap-2 text-xs py-1 border-b border-muted last:border-0 w-full text-left hover:bg-muted/50 transition-colors cursor-pointer"
            >
              {showLevel && (
                <span className="w-8 text-muted-foreground tabular-nums">
                  {move.levelLearnedAt > 0 ? `Lv.${move.levelLearnedAt}` : "—"}
                </span>
              )}
              <span className="flex-1 font-medium">{move.name}</span>
              <TypeBadge type={move.type} size="sm" />
              <span className="w-12 text-right tabular-nums text-muted-foreground">
                {move.power ? `${move.power} pwr` : move.damageClass}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Evolution Section
// ============================================================================

function EvolutionSection({
  chain,
  isLoading,
  currentSlug,
}: {
  chain?: EvolutionChainLink;
  isLoading: boolean;
  currentSlug: string;
}) {
  if (isLoading) {
    return (
      <section className="space-y-3">
        <Label>evolution</Label>
        <div className="flex justify-center gap-4">
          {EVOLUTION_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="size-20" />
          ))}
        </div>
      </section>
    );
  }

  if (!chain) {
    return (
      <section className="space-y-3">
        <Label>evolution</Label>
        <p className="text-sm text-muted-foreground">
          No evolution data found.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <Label>evolution</Label>
      <EvolutionChainDisplay chain={chain} currentSlug={currentSlug} />
    </section>
  );
}

function EvolutionChainDisplay({
  chain,
  currentSlug,
}: {
  chain: EvolutionChainLink;
  currentSlug: string;
}) {
  if (chain.evolvesTo.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This Pokémon does not evolve.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <EvolutionNode pokemon={chain} currentSlug={currentSlug} isFirst />
    </div>
  );
}

function EvolutionNode({
  pokemon,
  currentSlug,
  isFirst = false,
}: {
  pokemon: EvolutionChainLink;
  currentSlug: string;
  isFirst?: boolean;
}) {
  const hasBranching = pokemon.evolvesTo.length > 1;
  const href = `/pokemon/${toID(pokemon.name)}`;
  const isCurrent = toID(pokemon.name) === currentSlug;

  return (
    <div className="flex items-center gap-2">
      {/* Show evolution method arrow if this isn't the base form */}
      {!isFirst && pokemon.evolutionDetails.length > 0 && (
        <div className="text-muted-foreground text-xs flex flex-col items-center">
          <span>→</span>
          <div className="text-[10px] text-center max-w-20">
            {pokemon.evolutionDetails.map((detail, i) => (
              <div key={`${formatEvolutionMethod(detail)}-${i}`}>
                {formatEvolutionMethod(detail)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pokemon card */}
      <Link
        href={href}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded hover:bg-muted transition-colors",
          isCurrent && "bg-muted ring-1 ring-primary",
        )}
      >
        <Image
          src={pokemon.sprite}
          alt={pokemon.name}
          width={96}
          height={96}
          className="size-16 md:size-20 lg:size-24 pixelated"
          unoptimized={isAnimatedSprite(pokemon.sprite)}
        />
        <span className="text-xs">{pokemon.name}</span>
        <span className="text-[10px] text-muted-foreground">
          #{pokemon.id.toString().padStart(3, "0")}
        </span>
      </Link>

      {/* Evolutions */}
      {pokemon.evolvesTo.length > 0 && (
        <div
          className={cn(
            "flex",
            hasBranching ? "flex-col gap-2" : "items-center",
          )}
        >
          {pokemon.evolvesTo.map((evo) => (
            <EvolutionNode
              key={`${evo.id}-${evo.name}`}
              pokemon={evo}
              currentSlug={currentSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatEvolutionMethod(
  detail: EvolutionChainLink["evolutionDetails"][0],
): string {
  if (detail.minLevel) return `Lv.${detail.minLevel}`;
  if (detail.item) return detail.item;
  if (detail.minHappiness) return "Friendship";
  if (detail.knownMove) return detail.knownMove;
  if (detail.timeOfDay) return detail.timeOfDay;
  if (detail.heldItem) return `Hold ${detail.heldItem}`;
  return detail.trigger;
}

// ============================================================================
// Details Section
// ============================================================================

function DetailsSection({
  pokemon,
  species,
}: {
  pokemon: Pokemon;
  species?: PokemonSpecies;
}) {
  const genderDisplay = species
    ? species.genderRate === -1
      ? "Genderless"
      : `${(8 - species.genderRate) * 12.5}% ♂ / ${species.genderRate * 12.5}% ♀`
    : "—";

  const catchRatePercent = species
    ? ((species.captureRate / 255) * 100).toFixed(1)
    : "—";

  const hatchSteps = species
    ? (species.hatchCounter * 257).toLocaleString()
    : "—";

  return (
    <section className="space-y-6">
      {/* Breeding */}
      <div className="space-y-2">
        <Label>breeding</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow
            label="Egg Groups"
            value={species?.eggGroups.join(", ") ?? "—"}
          />
          <DetailRow label="Gender" value={genderDisplay} />
          <DetailRow
            label="Hatch Time"
            value={species ? `~${hatchSteps} steps` : "—"}
          />
        </div>
      </div>

      {/* Training */}
      <div className="space-y-2">
        <Label>training</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow
            label="Catch Rate"
            value={
              species ? `${species.captureRate} (${catchRatePercent}%)` : "—"
            }
          />
          <DetailRow label="Growth Rate" value={species?.growthRate ?? "—"} />
          <DetailRow
            label="EV Yield"
            value={
              species?.evYield.map((e) => `${e.value} ${e.stat}`).join(", ") ||
              "—"
            }
          />
          <DetailRow
            label="Base Happiness"
            value={species?.baseHappiness?.toString() ?? "—"}
          />
        </div>
      </div>

      {/* About */}
      <div className="space-y-2">
        <Label>about</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <DetailRow
            label="Height"
            value={`${(pokemon.height / 10).toFixed(1)}m`}
          />
          <DetailRow
            label="Weight"
            value={`${(pokemon.weight / 10).toFixed(1)}kg`}
          />
          <DetailRow label="Generation" value={species?.generation ?? "—"} />
        </div>
      </div>

      {/* Description */}
      {species?.description && (
        <div className="space-y-2">
          <Label>description</Label>
          <p className="text-sm leading-relaxed">{species.description}</p>
        </div>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function PokemonPageSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div>
        <div className="space-y-6 xl:space-y-0 xl:grid xl:grid-cols-12 xl:gap-8">
          <div className="space-y-6 xl:col-span-5 2xl:col-span-4 xl:sticky xl:top-6 xl:self-start">
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="size-7" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="size-7" />
              </div>
              <div className="flex justify-center xl:justify-start gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="size-32 md:size-40 xl:size-44 2xl:size-48 mx-auto" />
                <div className="w-full space-y-2">
                  <Skeleton className="h-6 w-32 mx-auto" />
                  <Skeleton className="h-3 w-24 mx-auto" />
                  <div className="flex justify-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <div className="flex flex-wrap gap-1">
                  {WEAKNESS_SKELETON_KEYS.map((key) => (
                    <Skeleton key={key} className="h-5 w-14" />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <div className="flex flex-wrap gap-1">
                  {RESISTANCE_SKELETON_KEYS.map((key) => (
                    <Skeleton key={key} className="h-5 w-14" />
                  ))}
                </div>
              </div>
            </section>

            {/* abilities */}
            <Skeleton className="h-10 w-full" />

            {/* base stats */}
            <section className="space-y-3">
              <Skeleton className="h-3 w-16" />
              {STAT_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-4 w-full" />
              ))}
            </section>

            {/* evolution */}
            <Skeleton className="h-10 w-full" />

            {/* variations */}
            <Skeleton className="h-10 w-full" />

            {/* details */}
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="space-y-6 xl:col-span-7 2xl:col-span-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
