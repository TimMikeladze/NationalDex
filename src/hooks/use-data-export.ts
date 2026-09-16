"use client";

import { useCallback } from "react";
import {
  createCardFavoriteRequest,
  reviveFavoriteCard,
} from "@/hooks/use-card-favorites";
import { createDeckRequest, reviveDeck } from "@/hooks/use-decks";
import { createFavoriteRequest } from "@/hooks/use-favorites";
import { createListRequest, reviveList } from "@/hooks/use-lists";
import { createTeamRequest, reviveTeam } from "@/hooks/use-teams";
import { authClient } from "@/lib/auth-client";
import {
  migrateLegacyPreferences,
  parseStoredPreferences,
} from "@/lib/preferences";
import { clearSyncedLocalState } from "@/lib/sync/clear-local-state";
import { syncWrite, type WriteRequest } from "@/lib/sync/outbox";
import {
  LEGACY_PREFERENCE_KEYS,
  SYNCED_STORAGE_KEYS,
} from "@/lib/sync/storage-keys";
import { clearSyncFlags } from "@/lib/sync/sync-flags";

const STORAGE_KEYS = {
  ...SYNCED_STORAGE_KEYS,
  recentlyViewed: "pokedex-recently-viewed",
  comparison: "pokedex-comparison-v2",
  comparisonPanel: "pokedex-comparison-panel",
  ambientBackdrop: "pokedex-ambient-backdrop",
  whosThatPokemonBestStreak: "whos-that-pokemon-best-streak",
  dexFilter: "pokedex-dex-filter",
  theme: "theme",
};

export interface ExportedData {
  version: number;
  exportedAt: string;
  favorites: number[];
  /** Favourited trading cards; absent in backups made before cards existed. */
  cardFavorites?: unknown[];
  lists: unknown[];
  /** TCG decks; absent in backups made before the deck builder existed. */
  decks?: unknown[];
  teams: unknown[];
  recentlyViewed: unknown[];
  /** Sprite/generation/game/content-width preferences, one consolidated record. */
  preferences?: unknown;
  /** The comparison tray's contents and panel state. */
  comparison?: { items: unknown; panelState: unknown };
  /** Whether detail pages wear their artwork's colours; absent in older backups. */
  ambientBackdrop?: string | null;
  whosThatPokemonBestStreak: number;
  /** Remembered dex filter panel + sort; absent in backups made before it existed. */
  dexFilter?: unknown;

  // Present only in backups made before v2 — read on import, never written.
  spritePreferences?: unknown;
  pokedexPreference?: string | null;
  generationPreference?: string | null;
  contentWidth?: string | null;
}

/**
 * Pushes a freshly restored backup to the account it was restored into, so
 * the server doesn't override it on the next load. Every item goes through
 * the same request its hook would send — after the same `revive*` pass the
 * hook applies when reading storage, so a backup that predates a field is
 * normalised the same way on both sides.
 *
 * Every endpoint upserts: favourites the account already has are left as
 * they are; a list, deck or team with an id the account already has is
 * replaced by the backup's copy, items/cards/members included. Nothing that
 * isn't in the backup is touched.
 */
async function pushRestoredData(data: ExportedData) {
  const requests: [resource: string, request: WriteRequest][] = [];

  if (Array.isArray(data.favorites)) {
    for (const pokemonId of data.favorites) {
      if (typeof pokemonId !== "number") continue;
      requests.push(["favorites", createFavoriteRequest(pokemonId)]);
    }
  }

  if (Array.isArray(data.cardFavorites)) {
    for (const item of data.cardFavorites) {
      const card = reviveFavoriteCard(item);
      if (card) {
        requests.push(["card-favorites", createCardFavoriteRequest(card)]);
      }
    }
  }

  if (Array.isArray(data.lists)) {
    for (const item of data.lists) {
      const list = reviveList(item);
      if (list) requests.push(["lists", createListRequest(list)]);
    }
  }

  if (Array.isArray(data.decks)) {
    for (const item of data.decks) {
      const deck = reviveDeck(item);
      if (deck) requests.push(["decks", createDeckRequest(deck)]);
    }
  }

  if (Array.isArray(data.teams)) {
    for (const item of data.teams) {
      const team = reviveTeam(item);
      if (team) requests.push(["teams", createTeamRequest(team)]);
    }
  }

  requests.push([
    "preferences",
    {
      method: "PATCH",
      path: "/api/preferences",
      body: parseStoredPreferences(
        localStorage.getItem(STORAGE_KEYS.preferences),
      ),
    },
  ]);

  await Promise.allSettled(
    requests.map(([resource, request]) => syncWrite(resource, request)),
  );
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
      version: 2,
      exportedAt: new Date().toISOString(),
      favorites: getData(STORAGE_KEYS.favorites) || [],
      cardFavorites: getData(STORAGE_KEYS.cardFavorites) || [],
      lists: getData(STORAGE_KEYS.lists) || [],
      decks: getData(STORAGE_KEYS.decks) || [],
      teams: getData(STORAGE_KEYS.teams) || [],
      recentlyViewed: getData(STORAGE_KEYS.recentlyViewed) || [],
      preferences: getData(STORAGE_KEYS.preferences) ?? undefined,
      comparison: {
        items: getData(STORAGE_KEYS.comparison) || [],
        panelState: localStorage.getItem(STORAGE_KEYS.comparisonPanel),
      },
      ambientBackdrop: localStorage.getItem(STORAGE_KEYS.ambientBackdrop),
      whosThatPokemonBestStreak:
        Number.parseInt(
          localStorage.getItem(STORAGE_KEYS.whosThatPokemonBestStreak) || "0",
          10,
        ) || 0,
      dexFilter: getData(STORAGE_KEYS.dexFilter) ?? undefined,
    };
  }, []);

  /**
   * Restores a backup into localStorage and, when there is a session, onto
   * the account too. The caller reloads afterwards so every hook re-reads.
   */
  const importAllData = useCallback(
    async (
      data: ExportedData,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!data.version) {
          return { success: false, error: "Invalid data format" };
        }

        if (Array.isArray(data.favorites)) {
          localStorage.setItem(
            STORAGE_KEYS.favorites,
            JSON.stringify(data.favorites),
          );
        }

        if (Array.isArray(data.cardFavorites)) {
          localStorage.setItem(
            STORAGE_KEYS.cardFavorites,
            JSON.stringify(data.cardFavorites),
          );
        }

        if (Array.isArray(data.lists)) {
          localStorage.setItem(STORAGE_KEYS.lists, JSON.stringify(data.lists));
        }

        if (Array.isArray(data.decks)) {
          localStorage.setItem(STORAGE_KEYS.decks, JSON.stringify(data.decks));
        }

        if (Array.isArray(data.teams)) {
          localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(data.teams));
        }

        if (Array.isArray(data.recentlyViewed)) {
          localStorage.setItem(
            STORAGE_KEYS.recentlyViewed,
            JSON.stringify(data.recentlyViewed),
          );
        }

        // v2 backups carry one consolidated preferences record.
        if (data.preferences) {
          localStorage.setItem(
            STORAGE_KEYS.preferences,
            JSON.stringify(data.preferences),
          );
        } else {
          // Pre-v2 backup — restore into the legacy keys, then consolidate
          // them the same way the preferences store does on first read.
          if (data.spritePreferences) {
            localStorage.setItem(
              LEGACY_PREFERENCE_KEYS.sprite,
              JSON.stringify(data.spritePreferences),
            );
          }
          if (data.generationPreference) {
            localStorage.setItem(
              LEGACY_PREFERENCE_KEYS.generation,
              data.generationPreference,
            );
          }
          if (data.pokedexPreference) {
            localStorage.setItem(
              LEGACY_PREFERENCE_KEYS.game,
              data.pokedexPreference,
            );
          }
          if (data.contentWidth) {
            localStorage.setItem(
              LEGACY_PREFERENCE_KEYS.contentWidth,
              data.contentWidth,
            );
          }
          localStorage.removeItem(STORAGE_KEYS.preferences);
          migrateLegacyPreferences();
        }

        if (data.comparison) {
          if (data.comparison.items) {
            localStorage.setItem(
              STORAGE_KEYS.comparison,
              JSON.stringify(data.comparison.items),
            );
          }
          if (typeof data.comparison.panelState === "string") {
            localStorage.setItem(
              STORAGE_KEYS.comparisonPanel,
              data.comparison.panelState,
            );
          }
        }

        if (data.ambientBackdrop) {
          localStorage.setItem(
            STORAGE_KEYS.ambientBackdrop,
            data.ambientBackdrop,
          );
        }

        if (typeof data.whosThatPokemonBestStreak === "number") {
          localStorage.setItem(
            STORAGE_KEYS.whosThatPokemonBestStreak,
            data.whosThatPokemonBestStreak.toString(),
          );
        }

        if (data.dexFilter) {
          localStorage.setItem(
            STORAGE_KEYS.dexFilter,
            JSON.stringify(data.dexFilter),
          );
        }

        // The next load re-runs the first merge for this account, so anything
        // the push below couldn't deliver is still picked up as local-only.
        clearSyncFlags();
        const { data: session } = await authClient.getSession();
        if (session) await pushRestoredData(data);

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

  /**
   * Wipes every local key and the first-merge markers. The outbox is kept:
   * "delete everything" runs its remote deletes first, and when the browser
   * is offline those deletes are sitting in the outbox waiting for the
   * reconnect — dropping them would let the untouched server rows merge
   * straight back in.
   */
  const clearAllData = useCallback(() => {
    clearSyncedLocalState({ keepOutbox: true });
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
    for (const key of Object.values(LEGACY_PREFERENCE_KEYS)) {
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
