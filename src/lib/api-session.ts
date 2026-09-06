import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * The current user for a route handler — guest sessions included, since the
 * anonymous plugin gives every visitor a real `user` row — with whether it is
 * an anonymous guest, for routes (e.g. sharing) a guest must not use since an
 * unclaimed guest's public link would be orphaned. `null` when there is no
 * session at all (a request that arrived before `ensureGuestSession()` ran).
 */
export async function getSessionUser(): Promise<{
  id: string;
  isAnonymous: boolean;
} | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    id: session.user.id,
    isAnonymous: session.user.isAnonymous ?? false,
  };
}

export async function getSessionUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}
