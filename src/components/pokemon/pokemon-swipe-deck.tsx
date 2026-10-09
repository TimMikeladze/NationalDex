"use client";

import { X } from "lucide-react";
import { useCallback } from "react";
import { HoloCard } from "@/components/holo-card";
import Link from "@/components/link";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useFavorites } from "@/hooks/use-favorites";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import type { DexPokemonListItem } from "@/lib/dex-pokemon";
import { pokemonSprite, pokemonSpriteById } from "@/lib/sprites";
import { PokemonSwipeFace } from "./pokemon-swipe-face";

interface PokemonSwipeDeckProps {
  pokemon: DexPokemonListItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  exhaustedAction?: React.ReactNode;
  className?: string;
}

const pokemonKey = (p: DexPokemonListItem) => p.slug;
const pokemonName = (p: DexPokemonListItem) => p.name;

/**
 * The dex dealt one Pokémon at a time — the same deck the card catalogue
 * swipes through, with a Pokémon's stats on the face instead of a scan.
 */
export function PokemonSwipeDeck({
  pokemon,
  emptyMessage = "No Pokémon match these filters",
  ...rest
}: PokemonSwipeDeckProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { defaultPokemonSpriteGen } = useSpritePreferences();

  // Same sprite the grid shows, so a Pokémon looks like itself in both.
  const spriteFor = useCallback(
    (p: DexPokemonListItem) =>
      pokemonSprite(p.name, { set: defaultPokemonSpriteGen }) ||
      pokemonSpriteById(p.id),
    [defaultPokemonSpriteGen],
  );

  const isFav = useCallback(
    (p: DexPokemonListItem) => isFavorite(p.id),
    [isFavorite],
  );
  const addFav = useCallback(
    (p: DexPokemonListItem) => addFavorite(p.id),
    [addFavorite],
  );
  const removeFav = useCallback(
    (p: DexPokemonListItem) => removeFavorite(p.id),
    [removeFavorite],
  );
  const listEntry = useCallback(
    (p: DexPokemonListItem) => ({
      itemType: "pokemon" as const,
      itemId: String(p.id),
      itemName: p.name,
      itemSprite: spriteFor(p),
    }),
    [spriteFor],
  );

  return (
    <SwipeDeck
      {...rest}
      items={pokemon}
      noun="Pokémon"
      getKey={pokemonKey}
      getName={pokemonName}
      isFavorite={isFav}
      addFavorite={addFav}
      removeFavorite={removeFav}
      preloadSrc={spriteFor}
      toListEntry={listEntry}
      emptyMessage={emptyMessage}
      renderFace={(p, { priority, captionFade }) => (
        <PokemonSwipeFace
          pokemon={p}
          sprite={spriteFor(p)}
          priority={priority}
          captionFade={captionFade}
        />
      )}
      renderPeek={(p, onClose) => (
        <PokemonPeek
          pokemon={p}
          sprite={p ? spriteFor(p) : ""}
          onClose={onClose}
        />
      )}
    />
  );
}

/**
 * A Pokémon held up close: the same face, larger, in a card you can tilt —
 * and the way through to its full page.
 */
function PokemonPeek({
  pokemon,
  sprite,
  onClose,
}: {
  pokemon: DexPokemonListItem | null;
  sprite: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={pokemon !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[min(100vw-1.5rem,28rem)] max-w-none border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">
          {pokemon?.name ?? "Pokémon"}
        </DialogTitle>
        {pokemon && (
          <div className="space-y-2">
            <HoloCard
              size="lg"
              touch="grab"
              className="mx-auto w-[min(100%,calc(78dvh*63/88))]"
            >
              <PokemonSwipeFace
                pokemon={pokemon}
                sprite={sprite}
                priority
                className="aspect-[63/88] h-auto"
              />
            </HoloCard>

            <div className="flex items-center gap-1 bg-background/90 px-1 py-1 backdrop-blur">
              <p className="min-w-0 flex-1 truncate px-2 text-sm font-medium">
                {pokemon.name}
              </p>
              <Link
                href={`/pokemon/${pokemon.slug}`}
                className="shrink-0 px-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                full page →
              </Link>
              <button
                type="button"
                onClick={onClose}
                title="Close"
                aria-label="Close"
                className="shrink-0 p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
