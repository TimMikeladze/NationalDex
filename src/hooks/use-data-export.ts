"use client";

import { useCallback } from "react";

const STORAGE_KEYS = {
  favorites: "pokedex-favorites",
  lists: "pokedex-lists",
  teams: "pokemon-teams",
  recentlyViewed: "pokedex-recently-viewed",
  spritePreferences: "pokedex-sprite-preferences",
  pokedexPreference: "pokedex-entry-preference",
  generationPreference: "pokedex-generation-preference",
  whosThatPokemonBestStreak: "whos-that-pokemon-best-streak",
  dexFilter: "pokedex-dex-filter",
  theme: "theme",
};

export interface ExportedData {
  version: number;
  exportedAt: string;
  favorites: number[];
  lists: unknown[];
  teams: unknown[];
  recentlyViewed: unknown[];
  spritePreferences: unknown;
  pokedexPreference: string | null;
  generationPreference: string | null;
  whosThatPokemonBestStreak: number;
  /** Remembered dex filter panel + sort; absent in backups made before it existed. */
  dexFilter?: unknown;
}

export function useDataExport() {
  const exportAllData = useCallback((): ExportedData => {
    const getData = (key: string) => {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    };

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      favorites: getData(STORAGE_KEYS.favorites) || [],
      lists: getData(STORAGE_KEYS.lists) || [],
      teams: getData(STORAGE_KEYS.teams) || [],
      recentlyViewed: getData(STORAGE_KEYS.recentlyViewed) || [],
      spritePreferences: getData(STORAGE_KEYS.spritePreferences) || {},
      pokedexPreference: localStorage.getItem(STORAGE_KEYS.pokedexPreference),
      generationPreference: localStorage.getItem(
        STORAGE_KEYS.generationPreference,
      ),
      whosThatPokemonBestStreak:
        Number.parseInt(
          localStorage.getItem(STORAGE_KEYS.whosThatPokemonBestStreak) || "0",
          10,
        ) || 0,
      dexFilter: getData(STORAGE_KEYS.dexFilter) ?? undefined,
    };
  }, []);

  const importAllData = useCallback(
    (data: ExportedData): { success: boolean; error?: string } => {
      try {
        if (!data.version) {
          return { success: false, error: "Invalid data format" };
        }

        // Import favorites
        if (Array.isArray(data.favorites)) {
          localStorage.setItem(
            STORAGE_KEYS.favorites,
            JSON.stringify(data.favorites),
          );
        }

        // Import lists
        if (Array.isArray(data.lists)) {
          localStorage.setItem(STORAGE_KEYS.lists, JSON.stringify(data.lists));
        }

        // Import teams
        if (Array.isArray(data.teams)) {
          localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(data.teams));
        }

        // Import recently viewed
        if (Array.isArray(data.recentlyViewed)) {
          localStorage.setItem(
            STORAGE_KEYS.recentlyViewed,
            JSON.stringify(data.recentlyViewed),
          );
        }

        // Import sprite preferences
        if (data.spritePreferences) {
          localStorage.setItem(
            STORAGE_KEYS.spritePreferences,
            JSON.stringify(data.spritePreferences),
          );
        }

        // Import pokedex preference
        if (data.pokedexPreference) {
          localStorage.setItem(
            STORAGE_KEYS.pokedexPreference,
            data.pokedexPreference,
          );
        }

        // Import generation preference
        if (data.generationPreference) {
          localStorage.setItem(
            STORAGE_KEYS.generationPreference,
            data.generationPreference,
          );
        }

        // Import best streak
        if (typeof data.whosThatPokemonBestStreak === "number") {
          localStorage.setItem(
            STORAGE_KEYS.whosThatPokemonBestStreak,
            data.whosThatPokemonBestStreak.toString(),
          );
        }

        // Import remembered dex filter
        if (data.dexFilter) {
          localStorage.setItem(
            STORAGE_KEYS.dexFilter,
            JSON.stringify(data.dexFilter),
          );
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to import data",
        };
      }
    },
    [],
  );

  const downloadExport = useCallback(() => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NationalDex-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportAllData]);

  const clearAllData = useCallback(() => {
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
  }, []);

  return {
    exportAllData,
    importAllData,
    downloadExport,
    clearAllData,
  };
}
