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
import type { List, ListItem, ListItemType } from "@/types/list";

function generateId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** A stored list, re-checked — also applied to lists restored from a backup. */
export function reviveList(item: unknown): List | null {
  const list = item as Partial<List> | null;
  if (!list || typeof list.id !== "string") return null;
  return {
    id: list.id,
    name: list.name || "Untitled list",
    description: list.description,
    items: Array.isArray(list.items) ? list.items : [],
    createdAt: list.createdAt ?? Date.now(),
    updatedAt: list.updatedAt ?? Date.now(),
  };
}

const store = createStorageStore<List[]>(SYNCED_STORAGE_KEYS.lists, {
  parse: (raw) => parseJsonArray(raw, reviveList),
});

const getId = (list: List) => list.id;
// The API already returns the full `List` shape (items nested).
const fromApi = (rows: List[]) => rows;

/** The request that creates (or wholesale replaces) one list — also used by the backup restorer. */
export const createListRequest = (list: List): WriteRequest => ({
  method: "POST",
  path: "/api/lists",
  body: list,
});
const deleteRequest = (list: List): WriteRequest => ({
  method: "DELETE",
  path: `/api/lists/${list.id}`,
});

type NewListItem = Omit<ListItem, "addedAt">;

/** `description: null` clears it — `undefined` would be dropped from the JSON body and change nothing. */
type ListUpdate = { name?: string; description?: string | null };

function hasItem(list: List, type: ListItemType, id: string) {
  return list.items.some((item) => item.type === type && item.id === id);
}

export function useLists() {
  const { value: lists, isLoaded } = useStorageStore(store);

  const { syncWrite, clearAll } = useRemoteSync<List, List>({
    resource: "lists",
    apiPath: "/api/lists",
    store,
    isLocalLoaded: isLoaded,
    getId,
    fromApi,
    importLocal: createListRequest,
    deleteRequest,
  });

  const createList = useCallback(
    (name: string, description?: string): List => {
      const now = Date.now();
      const newList: List = {
        id: generateId(),
        name,
        description,
        items: [],
        createdAt: now,
        updatedAt: now,
      };
      store.set([...store.get(), newList]);
      void syncWrite(createListRequest(newList));
      return newList;
    },
    [syncWrite],
  );

  /**
   * Adds a list that already exists on the server under this user — a clone
   * of a shared list — to the local mirror, without sending anything.
   */
  const receiveList = useCallback((list: List) => {
    const current = store.get();
    if (current.some((entry) => entry.id === list.id)) return;
    store.set([...current, list]);
  }, []);

  const updateList = useCallback(
    (id: string, updates: ListUpdate) => {
      store.set(
        store.get().map((list) => {
          if (list.id !== id) return list;
          const next = { ...list, updatedAt: Date.now() };
          if (updates.name !== undefined) next.name = updates.name;
          if (updates.description !== undefined) {
            next.description = updates.description ?? undefined;
          }
          return next;
        }),
      );
      void syncWrite({
        method: "PATCH",
        path: `/api/lists/${id}`,
        body: updates,
      });
    },
    [syncWrite],
  );

  const deleteList = useCallback(
    (id: string) => {
      store.set(store.get().filter((list) => list.id !== id));
      void syncWrite({ method: "DELETE", path: `/api/lists/${id}` });
    },
    [syncWrite],
  );

  const getList = useCallback(
    (id: string): List | undefined => lists.find((list) => list.id === id),
    [lists],
  );

  const addItem = useCallback(
    (listId: string, item: NewListItem) => {
      const current = store.get();
      const list = current.find((entry) => entry.id === listId);
      // Nothing to do — and nothing to send — if it's already there.
      if (!list || hasItem(list, item.type, item.id)) return;
      const newItem: ListItem = { ...item, addedAt: Date.now() };
      store.set(
        current.map((entry) =>
          entry.id === listId
            ? {
                ...entry,
                items: [...entry.items, newItem],
                updatedAt: Date.now(),
              }
            : entry,
        ),
      );
      void syncWrite({
        method: "POST",
        path: `/api/lists/${listId}/items`,
        body: item,
      });
    },
    [syncWrite],
  );

  const removeItem = useCallback(
    (listId: string, itemType: ListItemType, itemId: string) => {
      store.set(
        store.get().map((list) => {
          if (list.id !== listId) return list;
          return {
            ...list,
            items: list.items.filter(
              (item) => !(item.type === itemType && item.id === itemId),
            ),
            updatedAt: Date.now(),
          };
        }),
      );
      void syncWrite({
        method: "DELETE",
        path: `/api/lists/${listId}/items/${itemType}/${itemId}`,
      });
    },
    [syncWrite],
  );

  const isInList = useCallback(
    (listId: string, itemType: ListItemType, itemId: string): boolean => {
      const list = lists.find((l) => l.id === listId);
      return list ? hasItem(list, itemType, itemId) : false;
    },
    [lists],
  );

  const getListsContainingItem = useCallback(
    (itemType: ListItemType, itemId: string): List[] =>
      lists.filter((list) => hasItem(list, itemType, itemId)),
    [lists],
  );

  return {
    lists,
    isLoaded,
    createList,
    receiveList,
    updateList,
    deleteList,
    getList,
    addItem,
    removeItem,
    isInList,
    getListsContainingItem,
    /** Settings' "reset everything" action — see `useRemoteSync`'s `clearAll`. */
    clearLists: clearAll,
  };
}
