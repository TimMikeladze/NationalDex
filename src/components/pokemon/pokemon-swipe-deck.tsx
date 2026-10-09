"use client";

import { useCallback } from "react";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { useFavorites } from "@/hooks/use-favorites";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import type { DexPokemonListItem } from "@/lib/dex-pokemon";
import { pokemonSprite, pokemonSpriteById } from "@/lib/sprites";
import { PokemonSwipeFace } from "./pokemon-swipe-face";
import { PokemonSwipePeek } from "./pokemon-swipe-peek";

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
        <PokemonSwipePeek
          pokemon={p}
          sprite={p ? spriteFor(p) : ""}
          onClose={onClose}
        />
      )}
    />
  );
}
