"use client";

import { useCallback, useMemo } from "react";
import {
  DEFAULT_PREFERENCES,
  isDefaultPreferences,
  migrateLegacyPreferences,
  type PreferencesData,
  parseStoredPreferences,
} from "@/lib/preferences";
import { SYNCED_STORAGE_KEYS } from "@/lib/sync/storage-keys";
import { createStorageStore, useStorageStore } from "@/lib/sync/storage-store";
import { useSyncedRecord } from "@/lib/sync/use-synced-record";

export {
  type ContentWidth,
  DEFAULT_PREFERENCES,
  type PreferencesData,
} from "@/lib/preferences";

/** Shape of a row from `GET /api/preferences`. */
type PreferencesApiRow = {
  spriteSetOverride: string | null;
  preferredGeneration: number | null;
  preferredGameVersion: string | null;
  contentWidth: string;
};

// `preferredGeneration`/`spriteSetOverride` are each read and written from a
// couple dozen unrelated components on the same page (dex grid, filters,
// pickers, detail pages, ...), so this is one module-level store, not
// per-component state (see storage-store).
const store = createStorageStore<PreferencesData>(
  SYNCED_STORAGE_KEYS.preferences,
  {
    parse: parseStoredPreferences,
    beforeFirstRead: migrateLegacyPreferences,
  },
);

const fromApi = (row: PreferencesApiRow): PreferencesData => ({
  spriteSetOverride: row.spriteSetOverride,
  preferredGeneration: row.preferredGeneration,
  preferredGameVersion: row.preferredGameVersion,
  contentWidth: row.contentWidth === "full" ? "full" : "contained",
});

/**
 * The shared engine behind `useSpritePreferences`, `useGenerationPreference`,
 * `usePokedexPreference` and `useContentWidth`. Holds all four preferences as
 * one record under the single `pokedex-preferences` localStorage key (one
 * row's worth of local state, mirroring the one-row-per-user `preferences`
 * table), and layers `useSyncedRecord` on top so signed-in users get it
 * synced to `/api/preferences`.
 */
export function usePreferencesStore() {
  const { value: preferences, isLoaded } = useStorageStore(store);

  const { patch: patchRemote } = useSyncedRecord<
    PreferencesData,
    PreferencesApiRow
  >({
    resource: "preferences",
    apiPath: "/api/preferences",
    store,
    isLocalLoaded: isLoaded,
    fromApi,
    isLocalDefault: isDefaultPreferences,
  });

  const setPreference = useCallback(
    (patch: Partial<PreferencesData>) => {
      store.set({ ...store.get(), ...patch });
      void patchRemote(patch);
    },
    [patchRemote],
  );

  /**
   * Settings' "reset everything" action — writes the defaults back to the
   * remote row too (the PATCH endpoint upserts), not just local state.
   */
  const resetPreferences = useCallback(() => {
    store.set(DEFAULT_PREFERENCES);
    return patchRemote(DEFAULT_PREFERENCES);
  }, [patchRemote]);

  return useMemo(
    () => ({ preferences, isLoaded, setPreference, resetPreferences }),
    [preferences, isLoaded, setPreference, resetPreferences],
  );
}
