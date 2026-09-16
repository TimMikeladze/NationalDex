import { removeStorageKeysWithPrefix, SYNC_FLAG_PREFIX } from "./storage-keys";

function flagKey(resource: string, userId: string) {
  return `${SYNC_FLAG_PREFIX}${resource}-${userId}`;
}

/**
 * Whether this browser has already merged its local copy of `resource` into
 * `userId`'s account. Before that first merge, anything local with no remote
 * counterpart is uploaded; after it, the server is the source of truth and a
 * row missing remotely was deleted on another device, not "never uploaded".
 */
export function hasSyncedBefore(resource: string, userId: string): boolean {
  try {
    return window.localStorage.getItem(flagKey(resource, userId)) !== null;
  } catch {
    return false;
  }
}

export function markSynced(resource: string, userId: string) {
  try {
    window.localStorage.setItem(flagKey(resource, userId), String(Date.now()));
  } catch {
    // Storage blocked — the next load just re-runs the (idempotent) merge.
  }
}

/** Forgets every first-merge marker, so the next load imports local data again. */
export function clearSyncFlags() {
  removeStorageKeysWithPrefix(SYNC_FLAG_PREFIX);
}
