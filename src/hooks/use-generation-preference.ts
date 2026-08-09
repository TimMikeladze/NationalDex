"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LATEST_GEN } from "@/lib/pkmn";

const STORAGE_KEY = "pokedex-generation-preference";

type GenerationPreference = {
  /** Generation to view Pokemon data in; null means "use the latest data". */
  preferredGeneration: number | null;
};

const DEFAULT_PREFERENCE: GenerationPreference = {
  preferredGeneration: null,
};

function normalizeGeneration(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > LATEST_GEN) return null;
  return value;
}

function parsePreference(value: string | null): GenerationPreference | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GenerationPreference>;
    return {
      preferredGeneration: normalizeGeneration(parsed.preferredGeneration),
    };
  } catch {
    return null;
  }
}

/**
 * Which generation's games Pokemon data (learnsets, stats, types, abilities)
 * is shown relative to. Persisted so it carries across the whole dex.
 */
export function useGenerationPreference() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [preference, setPreference] =
    useState<GenerationPreference>(DEFAULT_PREFERENCE);

  useEffect(() => {
    const stored = parsePreference(localStorage.getItem(STORAGE_KEY));
    if (stored) setPreference(stored);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  }, [isLoaded, preference]);

  const setPreferredGeneration = useCallback((generation: number | null) => {
    setPreference({ preferredGeneration: normalizeGeneration(generation) });
  }, []);

  const resetGenerationPreference = useCallback(() => {
    setPreference(DEFAULT_PREFERENCE);
  }, []);

  return useMemo(
    () => ({
      ...preference,
      isLoaded,
      setPreferredGeneration,
      resetGenerationPreference,
    }),
    [preference, isLoaded, setPreferredGeneration, resetGenerationPreference],
  );
}
