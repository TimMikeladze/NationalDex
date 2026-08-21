"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "pokedex-ambient-backdrop";

type AmbientPreference = {
  /** Whether detail pages are painted with their artwork's colours. */
  ambientEnabled: boolean;
  /** False until the stored value has been read, to keep hydration stable. */
  isLoaded: boolean;
};

/**
 * On unless someone has turned it off. The wash is part of how a detail page
 * looks rather than an extra, so an empty store means yes, not no.
 */
const DEFAULT_PREFERENCE: AmbientPreference = {
  ambientEnabled: true,
  isLoaded: false,
};

function parsePreference(value: string | null): boolean {
  if (value === null) return true;
  try {
    const parsed = JSON.parse(value) as Partial<AmbientPreference>;
    return parsed.ambientEnabled !== false;
  } catch {
    return true;
  }
}

// Both detail pages and the settings screen read this, and they have to move
// together the moment it changes, so it lives in one store rather than in each
// hook's own state.
let state: AmbientPreference = DEFAULT_PREFERENCE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: AmbientPreference) {
  state = next;
  emit();
}

function readFromStorage() {
  setState({
    ambientEnabled: parsePreference(localStorage.getItem(STORAGE_KEY)),
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
 * Whether a detail page wears the colours of its artwork. Turning it off skips
 * the sampling as well as the wash — nothing is read off the image at all.
 */
export function useAmbientPreference() {
  const { ambientEnabled, isLoaded } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setAmbientEnabled = useCallback((enabled: boolean) => {
    setState({ ambientEnabled: enabled, isLoaded: true });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ambientEnabled: enabled }),
    );
  }, []);

  return useMemo(
    () => ({ ambientEnabled, isLoaded, setAmbientEnabled }),
    [ambientEnabled, isLoaded, setAmbientEnabled],
  );
}
