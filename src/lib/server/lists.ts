import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, type Tx } from "@/db";
import { list, listItem } from "@/db/schema";
import type { List, ListItem, ListItemType } from "@/types/list";

type ListRow = typeof list.$inferSelect;
type ListItemRow = typeof listItem.$inferSelect;

const LIST_ITEM_TYPES = [
  "pokemon",
  "move",
  "ability",
  "item",
  "type",
  "card",
] as const satisfies readonly ListItemType[];

/** One item as the client sends it — `addedAt` is absent on a fresh add. */
export const listItemSchema = z.object({
  type: z.enum(LIST_ITEM_TYPES),
  id: z.string().min(1),
  name: z.string(),
  sprite: z.string().nullish(),
  addedAt: z.number().optional(),
});
export type ListItemInput = z.infer<typeof listItemSchema>;

/** A whole list, as `POST /api/lists` receives it. */
export const listSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  items: z.array(listItemSchema).optional(),
});

/** `PATCH /api/lists/[id]` — `description: null` clears it. */
export const listPatchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export function toListItem(row: ListItemRow): ListItem {
  return {
    type: row.type as ListItemType,
    id: row.refId,
    name: row.name,
    sprite: row.sprite,
    addedAt: row.addedAt.getTime(),
  };
}

/** The `list_item` row for one item of a list. */
export function toListItemRow(
  listId: string,
  item: ListItemInput,
): typeof listItem.$inferInsert {
  return {
    id: nanoid(),
    listId,
    type: item.type,
    refId: item.id,
    name: item.name,
    sprite: item.sprite ?? null,
    addedAt: new Date(item.addedAt ?? Date.now()),
  };
}

/** A list row plus its items, in the shape the client keeps. */
export function toList(row: ListRow, items: ListItemRow[]): List {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    items: items.map(toListItem),
  };
}

/**
 * Replaces a list's entire item set — used when a whole list is (re)sent:
 * creation, the first-load import, a backup restore, and a clone. Runs inside
 * the caller's transaction.
 */
export async function replaceListItems(
  tx: Tx,
  listId: string,
  items: ListItemInput[],
) {
  await tx.delete(listItem).where(eq(listItem.listId, listId));
  if (items.length === 0) return;
  await tx
    .insert(listItem)
    .values(items.map((item) => toListItemRow(listId, item)))
    // A backup can carry the same item twice; the unique key keeps one.
    .onConflictDoNothing();
}

/**
 * The list behind a share link, or `null` when there is none or it has gone
 * back to private. Shared by the share page, its OG image and the clone
 * action, so all three agree on what "shared" means.
 */
export async function getSharedList(
  slug: string,
): Promise<{ list: List; ownerId: string } | null> {
  const [row] = await db.select().from(list).where(eq(list.shareSlug, slug));
  if (!row || row.visibility === "private") return null;

  const items = await db
    .select()
    .from(listItem)
    .where(eq(listItem.listId, row.id))
    .orderBy(asc(listItem.addedAt));

  return { list: toList(row, items), ownerId: row.userId };
}
