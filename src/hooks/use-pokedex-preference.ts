"use client";

import { useCallback, useMemo } from "react";
import { usePreferencesStore } from "@/hooks/use-preferences-store";

/**
 * Which game version's data the dex is filtered/labeled by; null means "use
 * most recent".
 *
 * Thin wrapper around the consolidated `pokedex-preferences` store (see
 * `use-preferences-store.ts`), which also syncs this to the server for
 * signed-in users.
 */
export function usePokedexPreference() {
  const { preferences, isLoaded, setPreference } = usePreferencesStore();

  const setPreferredGameVersion = useCallback(
    (version: string | null) => {
      setPreference({ preferredGameVersion: version });
    },
    [setPreference],
  );

  const resetPokedexPreference = useCallback(() => {
    setPreferredGameVersion(null);
  }, [setPreferredGameVersion]);

  return useMemo(
    () => ({
      preferredGameVersion: preferences.preferredGameVersion,
      isLoaded,
      setPreferredGameVersion,
      resetPokedexPreference,
    }),
    [
      preferences.preferredGameVersion,
      isLoaded,
      setPreferredGameVersion,
      resetPokedexPreference,
    ],
  );
}
