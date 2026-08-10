"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  ListPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { useSecondaryToolbar } from "@/components/app-shell";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import {
  EnergyBadge,
  EnergyCost,
  GameBadge,
  TcgCardGrid,
  TcgCardImage,
} from "@/components/tcg";
import { Button } from "@/components/ui/button";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { useCardsByDexId, usePocketSetIds, useTcgSet } from "@/hooks/use-tcg";
import { resolveSpecies, toID } from "@/lib/pkmn";
import { pokemonSpriteById } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type { TcgCard } from "@/types/tcg";
import {
  assetUrl,
  cardImageUrl,
  formatReleaseDate,
  gameForCardId,
} from "@/types/tcg";

interface CardDetailClientProps {
  card: TcgCard;
}

export function CardDetailClient({ card }: CardDetailClientProps) {
  const pocketSetIds = usePocketSetIds();
  const game = gameForCardId(card.id, pocketSetIds);
  const { isFavoriteCard, toggleFavoriteCard } = useCardFavorites();
  const setSecondaryToolbar = useSecondaryToolbar();
  const { data: set } = useTcgSet(card.set.id);

  const favorited = isFavoriteCard(card.id);

  // Every Pokemon this card depicts. Cards are linked to the Pokedex by
  // National Dex number, which is the one id both databases agree on.
  const depictedPokemon = useMemo(() => {
    return (card.dexId ?? [])
      .map((dexId) => {
        const species = resolveSpecies(dexId);
        if (!species) return null;
        return {
          dexId,
          name: species.name,
          slug: toID(species.name),
          sprite: pokemonSpriteById(dexId),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [card.dexId]);

  const primaryDexId = card.dexId?.[0] ?? null;
  const { cards: relatedCards } = useCardsByDexId(primaryDexId);

  const otherCards = useMemo(
    () => relatedCards.filter((related) => related.id !== card.id).slice(0, 12),
    [relatedCards, card.id],
  );

  // Walking a set in printed order is how a binder is read.
  const { previousCard, nextCard } = useMemo(() => {
    const cards = set?.cards ?? [];
    const index = cards.findIndex((entry) => entry.id === card.id);
    if (index === -1) return { previousCard: null, nextCard: null };
    return {
      previousCard: index > 0 ? cards[index - 1] : null,
      nextCard: index < cards.length - 1 ? cards[index + 1] : null,
    };
  }, [set?.cards, card.id]);

  const setLogo = assetUrl(card.set.logo);
  const setSymbol = assetUrl(card.set.symbol);

  const secondaryToolbarContent = useMemo(
    () => (
      <>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {previousCard ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              title={`Previous card: ${previousCard.name}`}
            >
              <Link href={`/cards/${previousCard.id.toLowerCase()}`}>
                <ChevronLeft className="size-4" />
                <span className="hidden text-xs sm:inline">prev</span>
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            onClick={() => toggleFavoriteCard(card)}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 px-2 transition-colors",
              favorited
                ? "text-rose-500 hover:text-rose-500"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("size-4", favorited && "fill-current")} />
            <span className="hidden text-xs sm:inline">
              {favorited ? "favorited" : "favorite"}
            </span>
          </Button>

          <AddToListDialog
            itemType="card"
            itemId={card.id}
            itemName={card.name}
            itemSprite={cardImageUrl(card.image, "low")}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                title="Add to list"
              >
                <ListPlus className="size-4" />
                <span className="hidden text-xs sm:inline">list</span>
              </Button>
            }
          />

          {nextCard ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              title={`Next card: ${nextCard.name}`}
            >
              <Link href={`/cards/${nextCard.id.toLowerCase()}`}>
                <span className="hidden text-xs sm:inline">next</span>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
        </div>
      </>
    ),
    [card, favorited, nextCard, previousCard, toggleFavoriteCard],
  );

  useEffect(() => {
    setSecondaryToolbar({ content: secondaryToolbarContent });
    return () => setSecondaryToolbar(null);
  }, [secondaryToolbarContent, setSecondaryToolbar]);

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
        {/* Artwork rail */}
        <div className="space-y-4 md:col-span-5 lg:col-span-4">
          <TcgCardImage
            image={card.image}
            alt={card.name}
            quality="high"
            width={600}
            height={825}
            priority
            className="mx-auto max-w-sm shadow-lg"
          />

          {card.variants && (
            <div className="space-y-2">
              <Label>variants</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["normal", "Normal"],
                    ["holo", "Holo"],
                    ["reverse", "Reverse holo"],
                    ["firstEdition", "1st edition"],
                    ["wPromo", "W Promo"],
                  ] as const
                )
                  .filter(([key]) => card.variants?.[key])
                  .map(([key, label]) => (
                    <span
                      key={key}
                      className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                {!card.variants.normal &&
                  !card.variants.holo &&
                  !card.variants.reverse &&
                  !card.variants.firstEdition &&
                  !card.variants.wPromo && (
                    <span className="text-xs text-muted-foreground">
                      No variants recorded
                    </span>
                  )}
              </div>
            </div>
          )}

          {/* Set */}
          <div className="space-y-2 rounded-lg border p-3">
            <Label>set</Label>
            <Link
              href={`/cards/sets/${card.set.id.toLowerCase()}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              {setLogo ? (
                // biome-ignore lint/performance/noImgElement: external set logo
                <img
                  src={setLogo}
                  alt={card.set.name}
                  className="h-8 w-16 object-contain"
                />
              ) : setSymbol ? (
                // biome-ignore lint/performance/noImgElement: external set symbol
                <img
                  src={setSymbol}
                  alt={card.set.name}
                  className="size-8 object-contain"
                />
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{card.set.name}</p>
                <p className="text-xs text-muted-foreground">
                  {card.localId} / {card.set.cardCount.official}
                  {set?.releaseDate
                    ? ` · ${formatReleaseDate(set.releaseDate)}`
                    : ""}
                </p>
              </div>
            </Link>
            {set?.serie && (
              <p className="text-xs text-muted-foreground">
                Series: {set.serie.name}
              </p>
            )}
          </div>

          {card.legal && (
            <div className="space-y-2">
              <Label>tournament legality</Label>
              <div className="flex gap-2">
                <LegalityBadge label="Standard" legal={card.legal.standard} />
                <LegalityBadge label="Expanded" legal={card.legal.expanded} />
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6 md:col-span-7 lg:col-span-8">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <GameBadge game={game} />
              {card.rarity && (
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {card.rarity}
                </span>
              )}
              {card.category && (
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {card.category}
                </span>
              )}
              {card.regulationMark && (
                <span className="rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Regulation {card.regulationMark}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-xl font-medium">{card.name}</h1>
              {card.hp && (
                <span className="text-sm tabular-nums text-muted-foreground">
                  {card.hp} HP
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {card.types?.map((type) => (
                <EnergyBadge key={type} type={type} linkable />
              ))}
              {card.stage && (
                <span className="rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {card.stage}
                </span>
              )}
              {card.suffix && (
                <span className="rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {card.suffix}
                </span>
              )}
            </div>
          </header>

          {/* Cross-reference into the Pokedex */}
          {depictedPokemon.length > 0 && (
            <section className="space-y-2">
              <Label>in the pokedex</Label>
              <div className="flex flex-wrap gap-2">
                {depictedPokemon.map((pokemon) => (
                  <Link
                    key={pokemon.dexId}
                    href={`/pokemon/${pokemon.slug}`}
                    className="flex items-center gap-3 rounded-lg border p-2 pr-4 transition-colors hover:bg-muted/50"
                  >
                    <PokemonImage
                      src={pokemon.sprite}
                      alt={pokemon.name}
                      pokemonId={pokemon.dexId}
                      width={48}
                      height={48}
                      className="size-10"
                    />
                    <div>
                      <p className="text-sm font-medium">{pokemon.name}</p>
                      <p className="text-[10px] tabular-nums text-muted-foreground">
                        #{pokemon.dexId.toString().padStart(3, "0")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              {card.evolveFrom && (
                <p className="text-xs text-muted-foreground">
                  Evolves from{" "}
                  <Link
                    href={`/pokemon/${toID(card.evolveFrom)}`}
                    className="text-foreground hover:underline"
                  >
                    {card.evolveFrom}
                  </Link>
                </p>
              )}
            </section>
          )}

          {/* Abilities */}
          {card.abilities && card.abilities.length > 0 && (
            <section className="space-y-2">
              <Label>abilities</Label>
              <div className="space-y-2">
                {card.abilities.map((ability) => (
                  <div
                    key={`${ability.type}-${ability.name}`}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {ability.type}
                      </span>
                      <span className="text-sm font-medium">
                        {ability.name}
                      </span>
                    </div>
                    {ability.effect && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ability.effect}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Attacks */}
          {card.attacks && card.attacks.length > 0 && (
            <section className="space-y-2">
              <Label>attacks</Label>
              <div className="space-y-2">
                {card.attacks.map((attack) => (
                  <div key={attack.name} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <EnergyCost cost={attack.cost} />
                        <span className="truncate text-sm font-medium">
                          {attack.name}
                        </span>
                      </div>
                      {attack.damage !== undefined && attack.damage !== "" && (
                        <span className="shrink-0 text-sm tabular-nums font-medium">
                          {attack.damage}
                        </span>
                      )}
                    </div>
                    {attack.effect && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {attack.effect}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Battle details */}
          {(card.weaknesses?.length ||
            card.resistances?.length ||
            card.retreat !== undefined) && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>weakness</Label>
                <div className="flex flex-wrap gap-1">
                  {card.weaknesses?.length ? (
                    card.weaknesses.map((weakness) => (
                      <span
                        key={weakness.type}
                        className="flex items-center gap-1"
                      >
                        <EnergyBadge type={weakness.type} linkable />
                        {weakness.value && (
                          <span className="text-xs text-muted-foreground">
                            {weakness.value}
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>resistance</Label>
                <div className="flex flex-wrap gap-1">
                  {card.resistances?.length ? (
                    card.resistances.map((resistance) => (
                      <span
                        key={resistance.type}
                        className="flex items-center gap-1"
                      >
                        <EnergyBadge type={resistance.type} linkable />
                        {resistance.value && (
                          <span className="text-xs text-muted-foreground">
                            {resistance.value}
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>retreat cost</Label>
                {card.retreat !== undefined ? (
                  <EnergyCost
                    cost={Array.from(
                      { length: card.retreat },
                      () => "Colorless",
                    )}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </section>
          )}

          {/* Trainer / Energy text */}
          {card.effect && (
            <section className="space-y-2">
              <Label>{card.trainerType ?? card.category} effect</Label>
              <p className="text-sm text-muted-foreground">{card.effect}</p>
            </section>
          )}

          {card.item && (
            <section className="space-y-2">
              <Label>held item — {card.item.name}</Label>
              <p className="text-sm text-muted-foreground">
                {card.item.effect}
              </p>
            </section>
          )}

          {card.description && (
            <section className="space-y-2">
              <Label>flavor text</Label>
              <p className="text-sm italic text-muted-foreground">
                {card.description}
              </p>
            </section>
          )}

          {/* Facts */}
          <section className="space-y-2">
            <Label>details</Label>
            <dl className="divide-y rounded-lg border">
              <DetailRow label="Card ID" value={card.id} />
              <DetailRow
                label="Number"
                value={`${card.localId} / ${card.set.cardCount.official}`}
              />
              {card.illustrator && (
                <DetailRow
                  label="Illustrator"
                  value={
                    <Link
                      href={`/cards?illustrator=${encodeURIComponent(card.illustrator)}`}
                      className="hover:underline"
                    >
                      {card.illustrator}
                    </Link>
                  }
                />
              )}
              {card.rarity && (
                <DetailRow
                  label="Rarity"
                  value={
                    <Link
                      href={`/cards?rarities=${encodeURIComponent(card.rarity)}`}
                      className="hover:underline"
                    >
                      {card.rarity}
                    </Link>
                  }
                />
              )}
              {card.level !== undefined && (
                <DetailRow label="Level" value={String(card.level)} />
              )}
              {card.weight && <DetailRow label="Weight" value={card.weight} />}
              {card.energyType && (
                <DetailRow label="Energy type" value={card.energyType} />
              )}
              {card.trainerType && (
                <DetailRow label="Trainer type" value={card.trainerType} />
              )}
              {card.boosters && card.boosters.length > 0 && (
                <DetailRow
                  label="Boosters"
                  value={card.boosters.map((b) => b.name).join(", ")}
                />
              )}
            </dl>
          </section>

          {/* More cards of the same Pokemon */}
          {primaryDexId !== null && otherCards.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>more cards of {card.name.split(" ")[0]}</Label>
                <Link
                  href={`/cards?dexId=${primaryDexId}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  see all
                  <ExternalLink className="size-3" />
                </Link>
              </div>
              <TcgCardGrid cards={otherCards} pocketSetIds={pocketSetIds} />
            </section>
          )}
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
    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-xs">{value}</dd>
    </div>
  );
}

function LegalityBadge({ label, legal }: { label: string; legal: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs",
        legal
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground",
      )}
    >
      {label}: {legal ? "legal" : "not legal"}
    </span>
  );
}
