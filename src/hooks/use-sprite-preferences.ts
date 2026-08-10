"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SPRITE_SET,
  isSpriteSetId,
  type SpriteSetId,
} from "@/lib/sprites";

const STORAGE_KEY = "pokedex-sprite-preferences";

type SpritePreferences = {
  defaultPokemonSpriteGen: SpriteSetId;
};

const DEFAULT_PREFERENCES: SpritePreferences = {
  defaultPokemonSpriteGen: DEFAULT_SPRITE_SET,
};

function parsePreferences(value: string | null): SpritePreferences | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SpritePreferences>;
    return {
      // Guards against sprite set ids removed in a later release.
      defaultPokemonSpriteGen: isSpriteSetId(parsed.defaultPokemonSpriteGen)
        ? parsed.defaultPokemonSpriteGen
        : DEFAULT_PREFERENCES.defaultPokemonSpriteGen,
    };
  } catch {
    return null;
  }
}

export function useSpritePreferences() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [preferences, setPreferences] =
    useState<SpritePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = parsePreferences(localStorage.getItem(STORAGE_KEY));
    if (stored) setPreferences(stored);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [isLoaded, preferences]);

  const setDefaultPokemonSpriteGen = useCallback((gen: SpriteSetId) => {
    setPreferences((prev) => ({ ...prev, defaultPokemonSpriteGen: gen }));
  }, []);

  const resetSpritePreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return useMemo(
    () => ({
      ...preferences,
      isLoaded,
      setDefaultPokemonSpriteGen,
      resetSpritePreferences,
    }),
    [preferences, isLoaded, setDefaultPokemonSpriteGen, resetSpritePreferences],
  );
}
