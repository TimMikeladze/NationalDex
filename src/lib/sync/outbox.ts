"use client";

/**
 * A tiny offline mutation queue. Every synced hook writes local state
 * immediately and fires its request; if that request can't go through
 * (offline, server down, no session yet), the mutation is queued here and
 * replayed in order once the browser comes back online or a session appears.
 * Each resource gets its own queue key so replay order only has to hold within
 * one resource.
 */

import { nanoid } from "nanoid";
import { OUTBOX_PREFIX, removeStorageKeysWithPrefix } from "./storage-keys";

export type HttpMethod = "POST" | "PATCH" | "DELETE";

export interface WriteRequest {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

interface QueuedOp extends WriteRequest {
  id: string;
  queuedAt: number;
  /** Times the server answered this op with a 5xx. Network failures don't count. */
  attempts: number;
}

/**
 * An op the server has rejected with a 5xx this many times is a poison op
 * (say, an unparseable date from a hand-edited backup) and is dropped, so it
 * stops blocking everything queued behind it.
 */
const MAX_SERVER_FAILURES = 5;

function queueKey(resource: string) {
  return `${OUTBOX_PREFIX}${resource}`;
}

function readQueue(resource: string): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(queueKey(resource));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedOp[];
    return parsed.map((op) => ({ ...op, attempts: op.attempts ?? 0 }));
  } catch {
    return [];
  }
}

function writeQueue(resource: string, queue: QueuedOp[]) {
  if (typeof window === "undefined") return;
  try {
    if (queue.length === 0) {
      window.localStorage.removeItem(queueKey(resource));
    } else {
      window.localStorage.setItem(queueKey(resource), JSON.stringify(queue));
    }
  } catch {
    // Storage full or blocked — the write is lost, same as any other key.
  }
}

/** Number of ops waiting to be replayed for a resource. */
export function queuedCount(resource: string): number {
  return readQueue(resource).length;
}

/** Drops every queued op for every resource (sign-out). */
export function clearAllQueues() {
  removeStorageKeysWithPrefix(OUTBOX_PREFIX);
}

/**
 * A response the queue should hold on to and retry later: the server is down,
 * or there is no session to accept the write — the guest sign-in races the
 * first writes on a cold start, and a session can expire while offline.
 */
function isRetryable(res: Response) {
  return res.status >= 500 || res.status === 401;
}

function sendRequest(req: WriteRequest) {
  return fetch(req.path, {
    method: req.method,
    headers: req.body ? { "Content-Type": "application/json" } : undefined,
    body: req.body ? JSON.stringify(req.body) : undefined,
  });
}

export function enqueue(resource: string, req: WriteRequest) {
  const queue = readQueue(resource);
  queue.push({ ...req, id: nanoid(), queuedAt: Date.now(), attempts: 0 });
  writeQueue(resource, queue);
}

/**
 * Rewrites one queued op in place (or drops it when `update` returns null).
 * Always works from a fresh read of storage: ops enqueued while this one was
 * in flight are there too and must survive.
 */
function updateQueued(
  resource: string,
  id: string,
  update: (op: QueuedOp) => QueuedOp | null,
) {
  const next: QueuedOp[] = [];
  for (const op of readQueue(resource)) {
    if (op.id !== id) {
      next.push(op);
      continue;
    }
    const updated = update(op);
    if (updated) next.push(updated);
  }
  writeQueue(resource, next);
}

/** Writes accepted by `syncWrite` that haven't settled yet — waiting their turn or in flight. */
const pending = new Map<string, number>();
/** One promise chain per resource, so its direct writes go out one at a time. */
const chains = new Map<string, Promise<unknown>>();
const flushing = new Set<string>();
const settledListeners = new Set<(resource: string) => void>();

/**
 * Fires whenever a resource's writes settle — a direct write was acknowledged,
 * or its queue drained. The sync engines refetch on this so the remote
 * snapshot reflects what just landed.
 */
export function onWritesSettled(listener: (resource: string) => void) {
  settledListeners.add(listener);
  return () => {
    settledListeners.delete(listener);
  };
}

function notifySettled(resource: string) {
  for (const listener of settledListeners) listener(resource);
}

/**
 * True while the server may still be behind local state for this resource:
 * a write is pending or queued. The sync engines don't apply a remote
 * snapshot while this holds — it would be stale by definition — and wait for
 * the refetch that follows the writes instead.
 */
export function hasPendingWrites(resource: string): boolean {
  return (pending.get(resource) ?? 0) > 0 || readQueue(resource).length > 0;
}

/**
 * Attempts each queued op for a resource, in order, stopping at the first one
 * that should be retried later. The queue is re-read from storage after every
 * op, so a write enqueued while one was in flight is replayed too rather
 * than overwritten by a stale copy.
 */
export async function flushQueue(resource: string): Promise<void> {
  if (flushing.has(resource)) return;
  flushing.add(resource);
  let sentAny = false;
  let drained = false;
  try {
    let queue = readQueue(resource);
    while (queue.length > 0) {
      const op = queue[0];
      let res: Response;
      try {
        res = await sendRequest(op);
      } catch {
        // Still offline (or the server is down) — stop and retry next time.
        return;
      }
      sentAny = true;
      if (!res.ok && isRetryable(res)) {
        // No session yet: nothing is wrong with the op, so it isn't counted.
        if (res.status === 401) return;
        const attempts = op.attempts + 1;
        if (attempts < MAX_SERVER_FAILURES) {
          updateQueued(resource, op.id, (queued) => ({ ...queued, attempts }));
          return;
        }
        // Poison op — fall through and drop it like a 4xx.
      }
      // Delivered, or a 4xx that no replay would fix: drop it and move on.
      updateQueued(resource, op.id, () => null);
      queue = readQueue(resource);
    }
    drained = true;
  } finally {
    flushing.delete(resource);
    if (sentAny && drained) notifySettled(resource);
  }
}

const trackedResources = new Set<string>();
let listenerAttached = false;

/** Registers a resource so its queue is replayed whenever the browser reconnects. */
export function trackResource(resource: string) {
  trackedResources.add(resource);
  if (typeof window === "undefined" || listenerAttached) return;
  listenerAttached = true;
  window.addEventListener("online", () => {
    for (const r of trackedResources) {
      void flushQueue(r);
    }
  });
}

async function send(resource: string, req: WriteRequest): Promise<boolean> {
  // Anything already queued has to land first — replaying "create the deck"
  // after "add a card to it" would 404 the card away.
  if (readQueue(resource).length > 0) {
    enqueue(resource, req);
    void flushQueue(resource);
    return false;
  }

  let delivered = false;
  try {
    const res = await sendRequest(req);
    if (res.ok || !isRetryable(res)) {
      delivered = true;
    } else {
      enqueue(resource, req);
    }
  } catch {
    enqueue(resource, req);
  }

  if (delivered) {
    notifySettled(resource);
  } else {
    void flushQueue(resource);
  }
  return delivered;
}

/**
 * Fires a write, falling back to the offline outbox if it can't go through.
 * Resolves `true` once the server has acknowledged it (a 2xx, or a 4xx no
 * retry would fix), `false` if it was queued for later.
 *
 * Writes to one resource are sent one at a time, in call order: "create the
 * list" must reach the server before "add an item to it", and of two
 * whole-list replacements the newer one must land last.
 */
export function syncWrite(
  resource: string,
  req: WriteRequest,
): Promise<boolean> {
  pending.set(resource, (pending.get(resource) ?? 0) + 1);
  const previous = chains.get(resource) ?? Promise.resolve();
  const run = previous.then(() => send(resource, req));
  // `send` never rejects, but the chain must not either — a rejection would
  // skip every write behind it.
  chains.set(resource, run.catch(() => undefined));
  return run.finally(() => {
    pending.set(resource, (pending.get(resource) ?? 1) - 1);
  });
}
