"use client";

import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clearSyncedLocalState } from "@/lib/sync/clear-local-state";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});

export const { useSession, signIn, signUp } = authClient;

let guestSessionPromise: Promise<void> | null = null;

async function signInAnonymouslyIfNeeded() {
  const { data } = await authClient.getSession();
  if (!data) {
    await authClient.signIn.anonymous();
  }
}

/**
 * Ensures every visitor has a session — signed in or guest — before any of the
 * synced hooks try to read/write remote data. Safe to call repeatedly; it's a
 * no-op once a session (real or anonymous) already exists.
 *
 * Callers in one tab share one in-flight sign-in. Across tabs the check and
 * the sign-in run under a Web Lock: two tabs booting at once would otherwise
 * each mint a guest user, and the second cookie would orphan whatever the
 * first tab had already pushed. Browsers without `navigator.locks` fall back
 * to the per-tab guard.
 */
export function ensureGuestSession(): Promise<void> {
  if (!guestSessionPromise) {
    const locks =
      typeof navigator !== "undefined" && "locks" in navigator
        ? navigator.locks
        : null;
    guestSessionPromise = (
      locks
        ? locks.request("pokedex-guest-session", signInAnonymouslyIfNeeded)
        : signInAnonymouslyIfNeeded()
    ).catch((err) => {
      guestSessionPromise = null;
      throw err;
    });
  }
  return guestSessionPromise;
}

export async function signOut() {
  const result = await authClient.signOut();
  clearSyncedLocalState();
  // Every synced hook already holds the signed-out user's data in memory;
  // reloading is the simplest way to make the next sign-in start clean.
  window.location.reload();
  return result;
}
