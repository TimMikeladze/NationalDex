import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Re-parents everything a guest owned onto the account they just signed up
 * with. Runs inside one transaction, scoped entirely by `user_id = anonymousId`
 * so a retried callback is a no-op the second time.
 *
 * "Merge, don't overwrite": favorites/card-favorites/preferences are unique per
 * real user, so a row that would collide with something the target account
 * already has is left for the guest row to cascade-delete instead of clobbering
 * the target's copy. Lists/decks/teams have no such collision — they just move.
 */
async function claimGuestData(anonymousId: string, targetUserId: string) {
  await db.transaction(async (tx) => {
    const guestFavorites = await tx
      .select()
      .from(schema.favorite)
      .where(eq(schema.favorite.userId, anonymousId));
    for (const row of guestFavorites) {
      await tx
        .insert(schema.favorite)
        .values({ ...row, id: nanoid(), userId: targetUserId })
        .onConflictDoNothing({
          target: [schema.favorite.userId, schema.favorite.pokemonId],
        });
    }

    const guestCardFavorites = await tx
      .select()
      .from(schema.cardFavorite)
      .where(eq(schema.cardFavorite.userId, anonymousId));
    for (const row of guestCardFavorites) {
      await tx
        .insert(schema.cardFavorite)
        .values({ ...row, id: nanoid(), userId: targetUserId })
        .onConflictDoNothing({
          target: [schema.cardFavorite.userId, schema.cardFavorite.cardId],
        });
    }

    await tx
      .update(schema.list)
      .set({ userId: targetUserId })
      .where(eq(schema.list.userId, anonymousId));

    await tx
      .update(schema.deck)
      .set({ userId: targetUserId })
      .where(eq(schema.deck.userId, anonymousId));

    await tx
      .update(schema.team)
      .set({ userId: targetUserId })
      .where(eq(schema.team.userId, anonymousId));

    const targetHasPreferences = await tx
      .select({ userId: schema.preferences.userId })
      .from(schema.preferences)
      .where(eq(schema.preferences.userId, targetUserId))
      .limit(1);
    if (targetHasPreferences.length === 0) {
      await tx
        .update(schema.preferences)
        .set({ userId: targetUserId })
        .where(eq(schema.preferences.userId, anonymousId));
    }
  });
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  // In dev the app may start on any free port (3000 taken → 3001) and the
  // PWA gets tested from a phone on the LAN, so trust whatever origin the
  // request came from. Production trusts only `BETTER_AUTH_URL`.
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? undefined
      : (request) => [request?.headers.get("origin")],
  socialProviders: {
    github: process.env.GITHUB_CLIENT_ID
      ? {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        }
      : undefined,
  },
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await claimGuestData(anonymousUser.user.id, newUser.user.id);
      },
    }),
  ],
});
