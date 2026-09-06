"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { hasPendingWrites, syncWrite, type WriteRequest } from "./outbox";
import { fetchJson, lastApplied, useResourceSession } from "./resource-session";
import type { StorageStore } from "./storage-store";
import { hasSyncedBefore, markSynced } from "./sync-flags";

interface UseRemoteSyncConfig<TLocal, TApi> {
  /** Used for the outbox queue key, the sync flag, and the TanStack Query cache key. */
  resource: string;
  /** GET endpoint returning this resource's rows as JSON. */
  apiPath: string;
  /** The module-level store the hook keeps its local mirror in. */
  store: StorageStore<TLocal[]>;
  isLocalLoaded: boolean;
  getId: (item: TLocal) => string | number;
  /** Maps API rows to the shape the hook keeps locally. */
  fromApi: (rows: TApi[]) => TLocal[];
  /**
   * The request that creates one local-only item remotely, used on the first
   * merge for a user in this browser. Endpoints upsert by id/unique key, so a
   * repeat is harmless.
   */
  importLocal: (item: TLocal) => WriteRequest;
  /** The request that deletes one item remotely — backs `clearAll`. */
  deleteRequest: (item: TLocal) => WriteRequest;
}

/**
 * Keeps a collection's local mirror in step with the server.
 *
 * - First merge for a user in this browser: local items with no remote
 *   counterpart are uploaded and kept; everything else comes from the server.
 * - After that the server wins whenever a fresh snapshot arrives — a row
 *   missing remotely was deleted on another device — except while this
 *   browser has writes in flight or queued, when local is ahead by definition
 *   and the refetch that follows those writes is waited for instead.
 * - Every mutation goes through `syncWrite`, which queues offline and replays.
 *
 * The functions passed in must be stable (module-level), not inline lambdas:
 * they're effect dependencies.
 */
export function useRemoteSync<TLocal, TApi>({
  resource,
  apiPath,
  store,
  isLocalLoaded,
  getId,
  fromApi,
  importLocal,
  deleteRequest,
}: UseRemoteSyncConfig<TLocal, TApi>) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const remoteQuery = useQuery({
    queryKey: [resource, userId],
    queryFn: () => fetchJson<TApi[]>(resource, apiPath),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });

  useResourceSession(resource, userId);

  useEffect(() => {
    const data = remoteQuery.data;
    if (!userId || !isLocalLoaded || !data) return;
    if (lastApplied.get(resource) === data) return;
    if (hasPendingWrites(resource)) return;
    lastApplied.set(resource, data);

    const remoteItems = fromApi(data);
    if (hasSyncedBefore(resource, userId)) {
      // Skip the write (and the re-render of every subscriber) when the
      // refetch just confirmed what's already local.
      if (JSON.stringify(remoteItems) !== JSON.stringify(store.get())) {
        store.set(remoteItems);
      }
      return;
    }

    const remoteIds = new Set(remoteItems.map(getId));
    const localOnly = store.get().filter((item) => !remoteIds.has(getId(item)));
    store.set([...remoteItems, ...localOnly]);
    // The marker flips "missing remotely" from "never uploaded" to "deleted
    // elsewhere", so it must wait until every upload is on the server or in
    // the outbox — a tab closed mid-request would otherwise lose those items
    // to the next server-wins snapshot. `syncWrite` resolves in both cases.
    void Promise.all(
      localOnly.map((item) => syncWrite(resource, importLocal(item))),
    ).then(() => markSynced(resource, userId));
  }, [
    userId,
    isLocalLoaded,
    remoteQuery.data,
    resource,
    store,
    getId,
    fromApi,
    importLocal,
  ]);

  const write = useCallback(
    (req: WriteRequest) => syncWrite(resource, req),
    [resource],
  );

  /**
   * Settings' "delete everything" action — empties the local mirror and
   * deletes every row remotely, one request each. Resolves once each delete
   * has been acknowledged or queued, so the caller can wait before reloading.
   */
  const clearAll = useCallback(() => {
    const current = store.get();
    store.set([]);
    return Promise.all(
      current.map((item) => syncWrite(resource, deleteRequest(item))),
    );
  }, [resource, store, deleteRequest]);

  return { syncWrite: write, clearAll };
}
