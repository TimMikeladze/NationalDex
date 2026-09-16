import { clearAllQueues } from "./outbox";
import { SYNCED_STORAGE_KEYS } from "./storage-keys";
import { clearSyncFlags } from "./sync-flags";

/**
 * Wipes the synced data from this browser: the local mirrors, the first-merge
 * markers and — unless `keepOutbox` is set — the offline outbox.
 *
 * Sign-out drops the outbox too: the next account must not replay the
 * previous one's writes. Settings' "delete everything" keeps it: when it runs
 * offline, the remote deletes are sitting in that outbox, and dropping them
 * would let the untouched server rows merge straight back in on reconnect.
 */
export function clearSyncedLocalState({ keepOutbox = false } = {}) {
  if (typeof window === "undefined") return;
  for (const key of Object.values(SYNCED_STORAGE_KEYS)) {
    window.localStorage.removeItem(key);
  }
  if (!keepOutbox) clearAllQueues();
  clearSyncFlags();
}
