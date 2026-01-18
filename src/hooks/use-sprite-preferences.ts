"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SpriteGen } from "@/lib/sprites";

const STORAGE_KEY = "pokedex-sprite-preferences";

type SpritePreferences = {
  defaultPokemonSpriteGen: SpriteGen;
  showPokemonSpriteVariants: boolean;
};

const DEFAULT_PREFERENCES: SpritePreferences = {
  defaultPokemonSpriteGen: "ani",
  showPokemonSpriteVariants: true,
};

function parsePreferences(value: string | null): SpritePreferences | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SpritePreferences>;
    return {
      defaultPokemonSpriteGen:
        parsed.defaultPokemonSpriteGen ?? DEFAULT_PREFERENCES.defaultPokemonSpriteGen,
      showPokemonSpriteVariants:
        parsed.showPokemonSpriteVariants ?? DEFAULT_PREFERENCES.showPokemonSpriteVariants,
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

  const setDefaultPokemonSpriteGen = useCallback((gen: SpriteGen) => {
    setPreferences((prev) => ({ ...prev, defaultPokemonSpriteGen: gen }));
  }, []);

  const setShowPokemonSpriteVariants = useCallback((show: boolean) => {
    setPreferences((prev) => ({ ...prev, showPokemonSpriteVariants: show }));
  }, []);

  const resetSpritePreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return useMemo(
    () => ({
      ...preferences,
      isLoaded,
      setDefaultPokemonSpriteGen,
      setShowPokemonSpriteVariants,
      resetSpritePreferences,
    }),
    [
      preferences,
      isLoaded,
      setDefaultPokemonSpriteGen,
      setShowPokemonSpriteVariants,
      resetSpritePreferences,
    ],
  );
}

