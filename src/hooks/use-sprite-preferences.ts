"use client";

import { useCallback, useMemo } from "react";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { usePreferencesStore } from "@/hooks/use-preferences-store";
import { LATEST_GEN } from "@/lib/pkmn";
import {
  getSpriteSet,
  isSpriteSetId,
  type SpriteSetId,
  spriteSetForGeneration,
} from "@/lib/sprites";

/**
 * Which sprite sheet Pokemon are drawn with across cards, evolutions and detail
 * pages. Follows the viewed generation until the user pins a set explicitly.
 *
 * Thin wrapper around the consolidated `pokedex-preferences` store (see
 * `use-preferences-store.ts`), which also syncs this to the server for
 * signed-in users. Depends on `useGenerationPreference` for the generation to
 * follow, same as before — both now ultimately read from the shared store, so
 * they stay consistent.
 */
export function useSpritePreferences() {
  const { preferences, isLoaded, setPreference } = usePreferencesStore();
  const { preferredGeneration } = useGenerationPreference();

  // Guards against sprite set ids removed in a later release.
  const spriteSetOverride: SpriteSetId | null = isSpriteSetId(
    preferences.spriteSetOverride,
  )
    ? preferences.spriteSetOverride
    : null;

  const setSpriteSetOverride = useCallback(
    (set: SpriteSetId | null) => {
      setPreference({ spriteSetOverride: isSpriteSetId(set) ? set : null });
    },
    [setPreference],
  );

  const resetSpritePreferences = useCallback(() => {
    setSpriteSetOverride(null);
  }, [setSpriteSetOverride]);

  const generationSpriteSet = spriteSetForGeneration(preferredGeneration);
  const defaultPokemonSpriteGen = spriteSetOverride ?? generationSpriteSet;

  // A pinned sheet never drew anything newer than its own generation, so the
  // dex hides those species rather than falling back to modern artwork for
  // them. The newest sheets cover everything, so they cut nothing.
  const pinnedGen = spriteSetOverride
    ? getSpriteSet(spriteSetOverride).gen
    : null;
  const speciesCutoffGeneration =
    pinnedGen !== null && pinnedGen < LATEST_GEN ? pinnedGen : null;

  return useMemo(
    () => ({
      /** The set to actually render with. */
      defaultPokemonSpriteGen,
      /** Null while the sprites follow the generation. */
      spriteSetOverride,
      /** What "follow the generation" resolves to right now. */
      generationSpriteSet,
      /** Generation the dex list is additionally capped at, or null. */
      speciesCutoffGeneration,
      followsGeneration: spriteSetOverride === null,
      isLoaded,
      setSpriteSetOverride,
      resetSpritePreferences,
    }),
    [
      defaultPokemonSpriteGen,
      spriteSetOverride,
      generationSpriteSet,
      speciesCutoffGeneration,
      isLoaded,
      setSpriteSetOverride,
      resetSpritePreferences,
    ],
  );
}
