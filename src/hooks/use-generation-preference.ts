"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { LATEST_GEN } from "@/lib/pkmn";

const STORAGE_KEY = "pokedex-generation-preference";

type GenerationPreference = {
  /** Generation to view Pokemon data in; null means "use the latest data". */
  preferredGeneration: number | null;
  /** False until the stored value has been read, to keep hydration stable. */
  isLoaded: boolean;
};

const DEFAULT_PREFERENCE: GenerationPreference = {
  preferredGeneration: null,
  isLoaded: false,
};

function normalizeGeneration(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > LATEST_GEN) return null;
  return value;
}

function parsePreference(value: string | null): number | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GenerationPreference>;
    return normalizeGeneration(parsed.preferredGeneration);
  } catch {
    return null;
  }
}

// The preference is read all over the app — the app header, the dex grid, every
// detail page — and they all have to move together the moment it changes, so it
// lives in one store rather than in each hook's own state.
let state: GenerationPreference = DEFAULT_PREFERENCE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: GenerationPreference) {
  state = next;
  emit();
}

function readFromStorage() {
  setState({
    preferredGeneration: parsePreference(localStorage.getItem(STORAGE_KEY)),
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
const getServerSnapshot = () => DEFAULT_PREFERENCE;

/**
 * Which generation's games the dex is read as — learnsets, stats, types,
 * abilities, items, matchups and search all follow it. Persisted, shared by
 * every component, and null for the National Dex.
 */
export function useGenerationPreference() {
  const { preferredGeneration, isLoaded } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setPreferredGeneration = useCallback((generation: number | null) => {
    const next = normalizeGeneration(generation);
    setState({ preferredGeneration: next, isLoaded: true });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ preferredGeneration: next }),
    );
  }, []);

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
