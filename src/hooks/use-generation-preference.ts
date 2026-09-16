"use client";

import { useCallback, useMemo } from "react";
import { usePreferencesStore } from "@/hooks/use-preferences-store";
import { LATEST_GEN } from "@/lib/pkmn";

function normalizeGeneration(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > LATEST_GEN) return null;
  return value;
}

/**
 * Which generation's games the dex is read as — learnsets, stats, types,
 * abilities, items, matchups and search all follow it. Persisted, shared by
 * every component, and null for the National Dex.
 *
 * Thin wrapper around the consolidated `pokedex-preferences` store (see
 * `use-preferences-store.ts`), which also syncs this to the server for
 * signed-in users.
 */
export function useGenerationPreference() {
  const { preferences, isLoaded, setPreference } = usePreferencesStore();
  const preferredGeneration = preferences.preferredGeneration;

  const setPreferredGeneration = useCallback(
    (generation: number | null) => {
      setPreference({ preferredGeneration: normalizeGeneration(generation) });
    },
    [setPreference],
  );

  const resetGenerationPreference = useCallback(() => {
    setPreferredGeneration(null);
  }, [setPreferredGeneration]);

  return useMemo(
    () => ({
      preferredGeneration,
      isLoaded,
      setPreferredGeneration,
      resetGenerationPreference,
    }),
    [
      preferredGeneration,
      isLoaded,
      setPreferredGeneration,
      resetGenerationPreference,
    ],
  );
}
