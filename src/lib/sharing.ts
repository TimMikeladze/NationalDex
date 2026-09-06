import { customAlphabet } from "nanoid";
import { z } from "zod";
import type { Visibility } from "@/db/schema";

/** Lowercase alphanumeric, no ambiguous characters — reads fine in a URL. */
export const newShareSlug = customAlphabet(
  "23456789abcdefghjkmnpqrstuvwxyz",
  10,
);

const shareBodySchema = z.object({
  visibility: z.enum(["private", "unlisted", "public"]),
  rotate: z.boolean().optional(),
});

export type ShareBody = z.infer<typeof shareBodySchema>;

/** Parses a share PATCH body; `null` means it wasn't one and the route should 400. */
export function parseShareBody(input: unknown): ShareBody | null {
  const result = shareBodySchema.safeParse(input);
  return result.success ? result.data : null;
}

/**
 * The column update for a visibility change, shared by the deck/team/list
 * share routes. Leaving `private` mints a slug if there isn't one yet;
 * `rotate` mints a fresh one, revoking the old link. Flipping back to private
 * keeps the slug (so re-sharing doesn't mint a new URL) — the share pages 404
 * for private rows regardless.
 */
export function buildShareUpdate(
  existing: { shareSlug: string | null },
  body: ShareBody,
): {
  visibility: Visibility;
  shareSlug?: string;
  sharedAt?: Date;
  updatedAt: Date;
} {
  const needsSlug =
    body.rotate || (body.visibility !== "private" && !existing.shareSlug);
  return {
    visibility: body.visibility,
    ...(needsSlug ? { shareSlug: newShareSlug() } : {}),
    ...(body.visibility !== "private" ? { sharedAt: new Date() } : {}),
    updatedAt: new Date(),
  };
}
