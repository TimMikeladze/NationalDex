"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { flushQueue, onWritesSettled, trackResource } from "./outbox";

/**
 * The remote snapshot each resource last applied — module-level, not per hook
 * instance. `useFavorites()` is mounted once per card in a grid and every
 * instance sees the same cached query data, so exactly one of them may act on
 * a given snapshot, and a fresh mount must not re-apply a stale one over a
 * change the user just made. Shared by both sync engines.
 */
export const lastApplied = new Map<string, unknown>();

/** How long after a write lands before the resource is refetched (writes come in bursts). */
const REFETCH_DEBOUNCE_MS = 400;

/**
 * The per-resource plumbing both sync engines share: replays the resource's
 * outbox once there is a session to accept it, and refetches after its writes
 * settle so the cached snapshot reflects the server again.
 */
export function useResourceSession(
  resource: string,
  userId: string | undefined,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    trackResource(resource);
    if (!userId) return;
    void flushQueue(resource);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onWritesSettled((settled) => {
      if (settled !== resource) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: [resource, userId] });
      }, REFETCH_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [resource, userId, queryClient]);
}

/** GETs a resource's JSON; with `notFoundAsNull`, a 404 resolves to `null` instead of throwing. */
export function fetchJson<T>(resource: string, apiPath: string): Promise<T>;
export function fetchJson<T>(
  resource: string,
  apiPath: string,
  options: { notFoundAsNull: true },
): Promise<T | null>;
export async function fetchJson<T>(
  resource: string,
  apiPath: string,
  options?: { notFoundAsNull: true },
): Promise<T | null> {
  const res = await fetch(apiPath);
  if (options?.notFoundAsNull && res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load ${resource}`);
  return res.json();
}
