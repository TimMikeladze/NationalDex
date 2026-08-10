"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  ListPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { useSecondaryToolbar } from "@/components/app-shell";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import {
  EnergyBadge,
  EnergyCost,
  GameBadge,
  RetreatCost,
  SectionLabel,
  TcgCardGrid,
  TcgCardZoom,
} from "@/components/tcg";
import { Button } from "@/components/ui/button";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { useCardsByDexId, usePocketSetIds, useTcgSet } from "@/hooks/use-tcg";
import { resolveSpecies, toID } from "@/lib/pkmn";
import { pokemonSpriteById } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type { TcgCard, TcgLanguage, TcgVariantDetailed } from "@/types/tcg";
import {
  assetUrl,
  cardImageUrl,
  DEFAULT_TCG_LANGUAGE,
  formatLocalId,
  formatPrice,
  formatReleaseDate,
  gameForCardId,
  mergedVariants,
  TCG_VARIANT_KEYS,
  variantFullLabel,
  variantKey,
  variantLabel,
  variantMarketPrice,
  withTcgLanguage,
} from "@/types/tcg";

interface CardDetailClientProps {
  card: TcgCard;
  /** Which catalogue this card was read from — every link back keeps it. */
  language: TcgLanguage;
}

export function CardDetailClient({
  card,
  language = DEFAULT_TCG_LANGUAGE,
}: CardDetailClientProps) {
  const pocketSetIds = usePocketSetIds(language);
  const game = gameForCardId(card.id, pocketSetIds);
  const { isFavoriteCard, toggleFavoriteCard } = useCardFavorites();
  const setSecondaryToolbar = useSecondaryToolbar();
  const router = useRouter();
  const { data: set } = useTcgSet(card.set.id, language);

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
  const { cards: relatedCards } = useCardsByDexId(primaryDexId, language);

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

  // Arrow keys walk the set the way you thumb through a binder page.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      if (event.key === "ArrowLeft" && previousCard) {
        router.push(
          withTcgLanguage(`/cards/${previousCard.id.toLowerCase()}`, language),
        );
      } else if (event.key === "ArrowRight" && nextCard) {
        router.push(
          withTcgLanguage(`/cards/${nextCard.id.toLowerCase()}`, language),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextCard, previousCard, router, language]);

  const setLogo = assetUrl(card.set.logo);
  const setSymbol = assetUrl(card.set.symbol);

  const variants = useMemo(() => mergedVariants(card), [card]);

  const secondaryToolbarContent = useMemo(
    () => (
      <>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {previousCard ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 min-w-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              title={`Previous card: ${previousCard.name} (←)`}
            >
              <Link
                href={withTcgLanguage(
                  `/cards/${previousCard.id.toLowerCase()}`,
                  language,
                )}
              >
                <ChevronLeft className="size-4 shrink-0" />
                <span className="hidden truncate text-xs sm:inline">
                  {previousCard.name}
                </span>
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
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
              </Button>
            }
          />

          {nextCard ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 min-w-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              title={`Next card: ${nextCard.name} (→)`}
            >
              <Link
                href={withTcgLanguage(
                  `/cards/${nextCard.id.toLowerCase()}`,
                  language,
                )}
              >
                <span className="hidden truncate text-xs sm:inline">
                  {nextCard.name}
                </span>
                <ChevronRight className="size-4 shrink-0" />
              </Link>
            </Button>
          ) : (
            <div className="size-7" />
          )}
        </div>
      </>
    ),
    [card, favorited, nextCard, previousCard, toggleFavoriteCard, language],
  );

  useEffect(() => {
    setSecondaryToolbar({ content: secondaryToolbarContent });
    return () => setSecondaryToolbar(null);
  }, [secondaryToolbarContent, setSecondaryToolbar]);

  const hasBattleStats =
    Boolean(card.weaknesses?.length) ||
    Boolean(card.resistances?.length) ||
    card.retreat !== undefined;

  return (
    <div className="p-4 md:p-6">
      {/* Same twelve-column, full-bleed grid a Pokemon page uses, so the two
          detail pages line up when you move between them. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
        {/* Artwork first everywhere; on desktop it stays put while text scrolls */}
        <div className="order-1 md:col-start-1 md:row-start-1 md:col-span-5 lg:col-span-5 xl:col-span-5 2xl:col-span-4">
          <TcgCardZoom
            image={card.image}
            alt={card.name}
            setName={card.set.name}
            localId={card.localId}
            className="mx-auto max-w-[17rem] sm:max-w-xs md:sticky md:top-4 md:mx-0 md:max-w-sm"
          />
        </div>

        {/* Print details. On a phone they follow the card's own text, which is
            what someone holding the card came to read. */}
        <div className="order-3 md:col-start-1 md:row-start-2 md:col-span-5 lg:col-span-5 xl:col-span-5 2xl:col-span-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden border bg-border text-center">
              <Fact label="number">
                {formatLocalId(card.localId)} / {card.set.cardCount.official}
              </Fact>
              <Fact label="rarity">
                {card.rarity ? (
                  <Link
                    href={withTcgLanguage(
                      `/cards?rarities=${encodeURIComponent(card.rarity)}`,
                      language,
                    )}
                    className="hover:underline"
                  >
                    {card.rarity}
                  </Link>
                ) : (
                  "—"
                )}
              </Fact>
            </div>

            {/* Set placement — where this card sits in a binder */}
            <Link
              href={withTcgLanguage(
                `/cards/sets/${card.set.id.toLowerCase()}`,
                language,
              )}
              className="flex items-center gap-3 border p-3 transition-colors hover:bg-muted/50"
            >
              {setLogo ? (
                // biome-ignore lint/performance/noImgElement: external set logo
                <img
                  src={setLogo}
                  alt={card.set.name}
                  className="h-8 w-14 shrink-0 object-contain"
                />
              ) : setSymbol ? (
                // biome-ignore lint/performance/noImgElement: external set symbol
                <img
                  src={setSymbol}
                  alt={card.set.name}
                  className="size-8 shrink-0 object-contain"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{card.set.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {set?.serie ? `${set.serie.name} · ` : ""}
                  {set?.releaseDate ? formatReleaseDate(set.releaseDate) : ""}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>

            {(variants.length > 0 || card.legal) && (
              <div className="space-y-2">
                {variants.length > 0 && (
                  <div className="space-y-1">
                    <SectionLabel className="w-full">
                      printings ({variants.length})
                    </SectionLabel>
                    {variants.map((variant) => (
                      <VariantRow
                        key={variantKey(variant)}
                        variant={variant}
                        cardId={card.id}
                        language={language}
                      />
                    ))}
                  </div>
                )}

                {card.legal && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SectionLabel className="w-full">legality</SectionLabel>
                    <LegalityBadge
                      label="Standard"
                      legal={card.legal.standard}
                    />
                    <LegalityBadge
                      label="Expanded"
                      legal={card.legal.expanded}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* The card, read as it is printed: name and HP, then what it does */}
        <div className="order-2 space-y-6 md:col-start-6 md:row-span-2 md:row-start-1 md:col-span-7 lg:col-span-7 xl:col-span-7 2xl:col-span-8">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <GameBadge game={game} />
              {card.category && <MetaTag>{card.category}</MetaTag>}
              {card.stage && <MetaTag>{card.stage}</MetaTag>}
              {card.suffix && <MetaTag>{card.suffix}</MetaTag>}
              {card.regulationMark && (
                <MetaTag>Regulation {card.regulationMark}</MetaTag>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 border-b pb-3">
              <h1 className="min-w-0 text-2xl font-medium leading-tight">
                {card.name}
              </h1>
              {card.hp !== undefined && (
                <p className="shrink-0 text-right leading-none">
                  <span className="text-2xl font-medium tabular-nums">
                    {card.hp}
                  </span>
                  <span className="ml-1 text-xs uppercase tracking-wider text-muted-foreground">
                    hp
                  </span>
                </p>
              )}
            </div>

            {(card.types?.length || card.evolveFrom) && (
              <div className="flex flex-wrap items-center gap-2">
                {card.types?.map((type) => (
                  <EnergyBadge key={type} type={type} linkable />
                ))}
                {card.evolveFrom && (
                  <span className="text-xs text-muted-foreground">
                    evolves from{" "}
                    <Link
                      href={`/pokemon/${toID(card.evolveFrom)}`}
                      className="text-foreground hover:underline"
                    >
                      {card.evolveFrom}
                    </Link>
                  </span>
                )}
              </div>
            )}
          </header>

          {card.abilities && card.abilities.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>abilities</SectionLabel>
              <div className="space-y-2">
                {card.abilities.map((ability) => (
                  <div
                    key={`${ability.type}-${ability.name}`}
                    className="border-l-2 border-l-foreground bg-muted/40 p-3"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">
                        {ability.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {ability.type}
                      </span>
                    </div>
                    {ability.effect && (
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {ability.effect}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {card.attacks && card.attacks.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>attacks</SectionLabel>
              <div className="divide-y border">
                {card.attacks.map((attack) => (
                  <div key={attack.name} className="p-3">
                    <div className="flex items-center gap-3">
                      <EnergyCost cost={attack.cost} />
                      <span className="min-w-0 flex-1 text-sm font-medium">
                        {attack.name}
                      </span>
                      {attack.damage !== undefined && attack.damage !== "" && (
                        <span className="shrink-0 text-lg font-medium tabular-nums leading-none">
                          {attack.damage}
                        </span>
                      )}
                    </div>
                    {attack.effect && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {attack.effect}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Three across is too narrow for "Fighting −30" on a phone, so the
              strip becomes rows until there is room. */}
          {hasBattleStats && (
            <section className="grid grid-cols-1 gap-px border bg-border sm:grid-cols-3">
              <BattleCell label="weakness">
                {card.weaknesses?.length ? (
                  card.weaknesses.map((weakness) => (
                    <EnergyBadge
                      key={weakness.type}
                      type={weakness.type}
                      value={weakness.value}
                      linkable
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">none</span>
                )}
              </BattleCell>
              <BattleCell label="resistance">
                {card.resistances?.length ? (
                  card.resistances.map((resistance) => (
                    <EnergyBadge
                      key={resistance.type}
                      type={resistance.type}
                      value={resistance.value}
                      linkable
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">none</span>
                )}
              </BattleCell>
              <BattleCell label="retreat">
                {card.retreat !== undefined ? (
                  <RetreatCost retreat={card.retreat} />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </BattleCell>
            </section>
          )}

          {card.effect && (
            <section className="space-y-2">
              <SectionLabel>
                {card.trainerType ?? card.category} effect
              </SectionLabel>
              <p className="text-sm leading-relaxed">{card.effect}</p>
            </section>
          )}

          {card.item && (
            <section className="space-y-2">
              <SectionLabel>held item — {card.item.name}</SectionLabel>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {card.item.effect}
              </p>
            </section>
          )}

          {card.description && (
            <p className="border-l-2 pl-3 text-sm italic leading-relaxed text-muted-foreground">
              {card.description}
            </p>
          )}

          {depictedPokemon.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>in the pokedex</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {depictedPokemon.map((pokemon) => (
                  <Link
                    key={pokemon.dexId}
                    href={`/pokemon/${pokemon.slug}`}
                    className="flex items-center gap-2 border py-1.5 pl-1.5 pr-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center bg-muted/40">
                      <PokemonImage
                        src={pokemon.sprite}
                        alt={pokemon.name}
                        pokemonId={pokemon.dexId}
                        width={48}
                        height={48}
                        className="size-9"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {pokemon.name}
                      </p>
                      <p className="text-[10px] tabular-nums text-muted-foreground">
                        #{pokemon.dexId.toString().padStart(3, "0")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <SectionLabel>details</SectionLabel>
            <dl className="divide-y border">
              <DetailRow label="Card ID" value={card.id} />
              {card.illustrator && (
                <DetailRow
                  label="Illustrator"
                  value={
                    <Link
                      href={withTcgLanguage(
                        `/cards?illustrator=${encodeURIComponent(card.illustrator)}`,
                        language,
                      )}
                      className="hover:underline"
                    >
                      {card.illustrator}
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
            </dl>
          </section>

          {/* In Pocket the booster a card can appear in is how you obtain it,
              so it reads as its own row of packs rather than a details line. */}
          {card.boosters && card.boosters.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>found in</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {card.boosters.map((booster) => (
                  <span
                    key={booster.id}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {booster.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {primaryDexId !== null && otherCards.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel>
                  more cards of {card.name.split(" ")[0]}
                </SectionLabel>
                <Link
                  href={withTcgLanguage(
                    `/cards?dexId=${primaryDexId}`,
                    language,
                  )}
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  see all
                  <ArrowRight className="size-3" />
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

function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background px-2 py-2">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-0.5 truncate text-xs tabular-nums">{children}</p>
    </div>
  );
}

function BattleCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-background p-3 sm:block sm:space-y-1.5">
      <SectionLabel className="shrink-0">{label}</SectionLabel>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:justify-start">
        {children}
      </div>
    </div>
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
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-xs">{value}</dd>
    </div>
  );
}

/**
 * One printing of the card. A collector cares which one they are holding, so
 * the row spells out what separates it from its siblings — Base Set holos come
 * in four, identical but for a copyright line — and what it sells for when the
 * price trackers know.
 */
function VariantRow({
  variant,
  cardId,
  language,
}: {
  variant: TcgVariantDetailed;
  cardId: string;
  language: TcgLanguage;
}) {
  const price = variantMarketPrice(variant);
  // Only the five catalogued printings are filterable — the API has no query
  // for one-off types like `lenticular`.
  const filterable = (TCG_VARIANT_KEYS as readonly string[]).includes(
    variant.type,
  );
  const searchParams = new URLSearchParams({
    set: cardId.split("-").slice(0, -1).join("-"),
    variants: variant.type,
  });

  return (
    <div className="flex items-center justify-between gap-3 rounded bg-muted/50 px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-xs">{variantFullLabel(variant)}</p>
        {price && (
          <p className="text-[10px] text-muted-foreground">
            {price.source} market
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {price ? (
          <span className="text-xs tabular-nums">{formatPrice(price)}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">unpriced</span>
        )}
        {filterable && (
          <Link
            href={withTcgLanguage(
              `/cards?${searchParams.toString()}`,
              language,
            )}
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            title={`Other ${variantLabel(variant.type)} cards in this set`}
          >
            more
          </Link>
        )}
      </div>
    </div>
  );
}

function LegalityBadge({ label, legal }: { label: string; legal: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
        legal
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span aria-hidden>{legal ? "✓" : "✕"}</span>
      {label}
      <span className="sr-only">{legal ? "legal" : "not legal"}</span>
    </span>
  );
}
