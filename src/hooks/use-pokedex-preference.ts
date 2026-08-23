"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "pokedex-game-preference";

type PokedexPreference = {
  preferredGameVersion: string | null; // null means "use most recent"
};

const DEFAULT_PREFERENCE: PokedexPreference = {
  preferredGameVersion: null,
};

function parsePreference(value: string | null): PokedexPreference | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PokedexPreference>;
    return {
      preferredGameVersion: parsed.preferredGameVersion ?? null,
    };
  } catch {
    return null;
  }
}

export function usePokedexPreference() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [preference, setPreference] =
    useState<PokedexPreference>(DEFAULT_PREFERENCE);

  useEffect(() => {
    const stored = parsePreference(localStorage.getItem(STORAGE_KEY));
    if (stored) setPreference(stored);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  }, [isLoaded, preference]);

  const setPreferredGameVersion = useCallback((version: string | null) => {
    setPreference((prev) => ({ ...prev, preferredGameVersion: version }));
  }, []);

  const resetPokedexPreference = useCallback(() => {
    setPreference(DEFAULT_PREFERENCE);
  }, []);

  return useMemo(
    () => ({
      ...preference,
      isLoaded,
      setPreferredGameVersion,
      resetPokedexPreference,
    }),
    [preference, isLoaded, setPreferredGameVersion, resetPokedexPreference],
  );
}
