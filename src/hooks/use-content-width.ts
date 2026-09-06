"use client";

import { useCallback, useMemo } from "react";
import {
  type ContentWidth,
  usePreferencesStore,
} from "@/hooks/use-preferences-store";

export type { ContentWidth } from "@/hooks/use-preferences-store";

/**
 * Thin wrapper around the consolidated `pokedex-preferences` store (see
 * `use-preferences-store.ts`), which also syncs this to the server for
 * signed-in users.
 */
export function useContentWidth() {
  const { preferences, isLoaded, setPreference } = usePreferencesStore();
  const contentWidth = preferences.contentWidth;

  const setContentWidth = useCallback(
    (value: ContentWidth) => {
      setPreference({ contentWidth: value });
    },
    [setPreference],
  );

  const setContained = useCallback(
    () => setContentWidth("contained"),
    [setContentWidth],
  );
  const setFull = useCallback(() => setContentWidth("full"), [setContentWidth]);

  return useMemo(
    () => ({ contentWidth, isLoaded, setContentWidth, setContained, setFull }),
    [contentWidth, isLoaded, setContentWidth, setContained, setFull],
  );
}
