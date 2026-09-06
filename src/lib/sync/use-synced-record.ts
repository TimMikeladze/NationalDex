"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { hasPendingWrites, syncWrite } from "./outbox";
import { fetchJson, lastApplied, useResourceSession } from "./resource-session";
import type { StorageStore } from "./storage-store";

/**
 * The same local-first/remote-merge idea as `useRemoteSync`, for a singleton
 * resource (one row per user) instead of a collection — used for preferences.
 * The remote row wins whenever there is one; when there isn't yet, a
 * non-default local record becomes the first version of it.
 *
 * `fromApi` and `isLocalDefault` must be stable (module-level) functions.
 */
export function useSyncedRecord<TLocal extends object, TApi>({
  resource,
  apiPath,
  store,
  isLocalLoaded,
  fromApi,
  isLocalDefault,
}: {
  resource: string;
  apiPath: string;
  store: StorageStore<TLocal>;
  isLocalLoaded: boolean;
  fromApi: (row: TApi) => TLocal;
  /** True when `local` is still the untouched default (nothing to upload). */
  isLocalDefault: (value: TLocal) => boolean;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const remoteQuery = useQuery({
    queryKey: [resource, userId],
    queryFn: () => fetchJson<TApi>(resource, apiPath, { notFoundAsNull: true }),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });

  useResourceSession(resource, userId);

  useEffect(() => {
    const data = remoteQuery.data;
    if (!userId || !isLocalLoaded || data === undefined) return;
    if (lastApplied.get(resource) === data) return;
    if (hasPendingWrites(resource)) return;
    lastApplied.set(resource, data);

    if (data) {
      store.set(fromApi(data));
      return;
    }
    const local = store.get();
    if (!isLocalDefault(local)) {
      void syncWrite(resource, { method: "PATCH", path: apiPath, body: local });
    }
  }, [
    userId,
    isLocalLoaded,
    remoteQuery.data,
    resource,
    apiPath,
    store,
    fromApi,
    isLocalDefault,
  ]);

  const patch = useCallback(
    (body: Partial<TLocal>) =>
      syncWrite(resource, { method: "PATCH", path: apiPath, body }),
    [resource, apiPath],
  );

  return { patch };
}
