"use client";

import { useSyncExternalStore } from "react";

export interface StoreSnapshot<T> {
  value: T;
  /** False until the first read from localStorage, which waits for hydration. */
  isLoaded: boolean;
}

export interface StorageStore<T> {
  readonly key: string;
  subscribe(listener: () => void): () => void;
  getSnapshot(): StoreSnapshot<T>;
  getServerSnapshot(): StoreSnapshot<T>;
  /** The current value, reading storage first if nothing has yet. */
  get(): T;
  /** Replaces the value, persists it, and notifies every subscriber. */
  set(next: T): void;
  /** Re-reads storage — after a backup import wrote the key directly. */
  reload(): void;
}

interface StorageStoreOptions<T> {
  /** Turns the stored string (`null` when absent) into a value. Must not throw. */
  parse: (raw: string | null) => T;
  /** Runs once, before the first read — for one-time key migrations. */
  beforeFirstRead?: () => void;
}

/**
 * One module-level store per localStorage key, read through
 * `useSyncExternalStore`. Every component on the same key sees the same value
 * and the same writes — a heart on every card in a grid, or the six panels of
 * the deck builder, must not each hold a copy that overwrites a neighbour's
 * change on its next save. The sync engines write into these stores too, so a
 * merge in one place is visible everywhere at once.
 */
export function createStorageStore<T>(
  key: string,
  options: StorageStoreOptions<T>,
): StorageStore<T> {
  const serverSnapshot: StoreSnapshot<T> = {
    value: options.parse(null),
    isLoaded: false,
  };
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  let migrated = false;

  function emit() {
    for (const listener of listeners) listener();
  }

  function read(): T {
    if (!migrated) {
      migrated = true;
      options.beforeFirstRead?.();
    }
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    return options.parse(raw);
  }

  function reload() {
    if (typeof window === "undefined") return;
    snapshot = { value: read(), isLoaded: true };
    emit();
  }

  function get(): T {
    if (!snapshot.isLoaded && typeof window !== "undefined") {
      snapshot = { value: read(), isLoaded: true };
    }
    return snapshot.value;
  }

  function set(next: T) {
    snapshot = { value: next, isLoaded: true };
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage full or blocked — the in-memory value still updates.
    }
    emit();
  }

  // Other tabs write the same key; one window listener serves every subscriber.
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) reload();
  };

  function subscribe(listener: () => void) {
    if (!snapshot.isLoaded) reload();
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        window.removeEventListener("storage", onStorage);
      }
    };
  }

  return {
    key,
    subscribe,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    get,
    set,
    reload,
  };
}

export function useStorageStore<T>(store: StorageStore<T>): StoreSnapshot<T> {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

/**
 * `parse` for the array-shaped stores. Anything that isn't a JSON array is
 * treated as empty, and `revive` may return `null` to drop a malformed item.
 */
export function parseJsonArray<T>(
  raw: string | null,
  revive: (item: unknown) => T | null = (item) => item as T,
): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: T[] = [];
    for (const item of parsed) {
      const revived = revive(item);
      if (revived !== null) items.push(revived);
    }
    return items;
  } catch {
    return [];
  }
}
