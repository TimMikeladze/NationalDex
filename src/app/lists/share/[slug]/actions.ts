"use server";

import { nanoid } from "nanoid";
import { db } from "@/db";
import { list } from "@/db/schema";
import { getSessionUserId } from "@/lib/api-session";
import { getSharedList, replaceListItems } from "@/lib/server/lists";
import type { List } from "@/types/list";

/**
 * Copies a shared list into the current user's own collection and returns
 * the copy, in the client's shape, so the caller can show it at once.
 * Visibility is re-checked here, not just at page-load time, in case the
 * owner flipped it back to private between the page rendering and the click.
 */
export async function cloneSharedList(slug: string): Promise<List> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const shared = await getSharedList(slug);
  if (!shared) {
    throw new Error("List not found");
  }

  const now = Date.now();
  const copy: List = {
    ...shared.list,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.insert(list).values({
      id: copy.id,
      userId,
      name: copy.name,
      description: copy.description ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      visibility: "private",
    });
    await replaceListItems(tx, copy.id, copy.items);
  });

  return copy;
}
