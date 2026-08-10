"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { LATEST_GEN } from "@/lib/pkmn";
import {
  getSpriteSet,
  isSpriteSetId,
  type SpriteSetId,
  spriteSetForGeneration,
} from "@/lib/sprites";

const STORAGE_KEY = "pokedex-sprite-preferences";

type SpritePreferences = {
  /**
   * Explicitly chosen sprite set. Null means "follow the generation the dex is
   * viewed as", which is the default — the two pickers live in the same menu
   * and move together unless the user pins a set.
   */
  spriteSetOverride: SpriteSetId | null;
  /** False until the stored value has been read, to keep hydration stable. */
  isLoaded: boolean;
};

const DEFAULT_PREFERENCES: SpritePreferences = {
  spriteSetOverride: null,
  isLoaded: false,
};

function parseOverride(value: string | null): SpriteSetId | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { spriteSetOverride?: unknown };
    // Guards against sprite set ids removed in a later release.
    return isSpriteSetId(parsed.spriteSetOverride)
      ? parsed.spriteSetOverride
      : null;
  } catch {
    return null;
  }
}

// Read by the app header, the dex grid and every detail page, all of which have
// to move the instant the set changes — so it lives in one store rather than in
// each hook's own state. Mirrors use-generation-preference.
let state: SpritePreferences = DEFAULT_PREFERENCES;
const listeners = new Set<() => void>();

function setState(next: SpritePreferences) {
  state = next;
  for (const listener of listeners) listener();
}

function readFromStorage() {
  setState({
    spriteSetOverride: parseOverride(localStorage.getItem(STORAGE_KEY)),
    isLoaded: true,
  });
}

function subscribe(onStoreChange: () => void) {
  if (!state.isLoaded) readFromStorage();
  listeners.add(onStoreChange);

  // Keep other tabs in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) readFromStorage();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => DEFAULT_PREFERENCES;

/**
 * Which sprite sheet Pokemon are drawn with across cards, evolutions and detail
 * pages. Follows the viewed generation until the user pins a set explicitly.
 */
export function useSpritePreferences() {
  const { spriteSetOverride, isLoaded } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const { preferredGeneration } = useGenerationPreference();

  const setSpriteSetOverride = useCallback((set: SpriteSetId | null) => {
    const next = isSpriteSetId(set) ? set : null;
    setState({ spriteSetOverride: next, isLoaded: true });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ spriteSetOverride: next }),
    );
  }, []);

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
