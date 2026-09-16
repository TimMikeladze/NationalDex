"use client";

import { useCallback } from "react";
import type { WriteRequest } from "@/lib/sync/outbox";
import { SYNCED_STORAGE_KEYS } from "@/lib/sync/storage-keys";
import {
  createStorageStore,
  parseJsonArray,
  useStorageStore,
} from "@/lib/sync/storage-store";
import { useRemoteSync } from "@/lib/sync/use-remote-sync";

interface FavoriteRow {
  pokemonId: number;
}

const store = createStorageStore<number[]>(SYNCED_STORAGE_KEYS.favorites, {
  parse: (raw) =>
    parseJsonArray<number>(raw, (item) =>
      typeof item === "number" ? item : null,
    ),
});

const getId = (id: number) => id;
const fromApi = (rows: FavoriteRow[]) => rows.map((row) => row.pokemonId);

/** The request that favourites one Pokemon — also used by the backup restorer. */
export const createFavoriteRequest = (id: number): WriteRequest => ({
  method: "POST",
  path: "/api/favorites",
  body: { pokemonId: id },
});
const deleteRequest = (id: number): WriteRequest => ({
  method: "DELETE",
  path: `/api/favorites/${id}`,
});

export function useFavorites() {
  const { value: favorites, isLoaded } = useStorageStore(store);

  const { syncWrite, clearAll } = useRemoteSync<number, FavoriteRow>({
    resource: "favorites",
    apiPath: "/api/favorites",
    store,
    isLocalLoaded: isLoaded,
    getId,
    fromApi,
    importLocal: createFavoriteRequest,
    deleteRequest,
  });

  const addFavorite = useCallback(
    (id: number) => {
      const current = store.get();
      if (current.includes(id)) return;
      store.set([...current, id]);
      void syncWrite(createFavoriteRequest(id));
    },
    [syncWrite],
  );

  const removeFavorite = useCallback(
    (id: number) => {
      store.set(store.get().filter((fav) => fav !== id));
      void syncWrite(deleteRequest(id));
    },
    [syncWrite],
  );

  const isFavorite = useCallback(
    (id: number) => favorites.includes(id),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (id: number) => {
      if (isFavorite(id)) {
        removeFavorite(id);
      } else {
        addFavorite(id);
      }
    },
    [isFavorite, addFavorite, removeFavorite],
  );

  return {
    favorites,
    isLoaded,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    /** Settings' "reset everything" action — see `useRemoteSync`'s `clearAll`. */
    clearFavorites: clearAll,
  };
}
