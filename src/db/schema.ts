import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// =============================================================================
// better-auth core tables
//
// Column names/shapes follow what the better-auth Drizzle adapter expects out
// of the box, plus `isAnonymous` from the `anonymous` plugin (this is the
// "is_guest flag" the issue asks for).
// =============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// better-auth looks sessions and accounts up by user on every sign-in and
// account link, and the cascade from deleting a claimed guest hits both.
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// Shared sharing columns, mixed into deck/team/list
// =============================================================================

/** `private` (default), `unlisted` (anyone with the URL), `public` (browsable). */
export type Visibility = "private" | "unlisted" | "public";

const sharingColumns = {
  visibility: text("visibility").notNull().default("private"),
  shareSlug: text("share_slug").unique(),
  sharedAt: timestamp("shared_at"),
};

// =============================================================================
// Favorites
// =============================================================================

export const favorite = pgTable(
  "favorite",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pokemonId: integer("pokemon_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("favorite_user_pokemon_unique").on(table.userId, table.pokemonId),
    index("favorite_user_id_idx").on(table.userId),
  ],
);

export const cardFavorite = pgTable(
  "card_favorite",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull(),
    name: text("name").notNull(),
    localId: text("local_id").notNull(),
    image: text("image"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [
    unique("card_favorite_user_card_unique").on(table.userId, table.cardId),
    index("card_favorite_user_id_idx").on(table.userId),
  ],
);

// =============================================================================
// Lists
// =============================================================================

export const list = pgTable(
  "list",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ...sharingColumns,
  },
  (table) => [index("list_user_id_idx").on(table.userId)],
);

export const listItem = pgTable(
  "list_item",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => list.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    refId: text("ref_id").notNull(),
    name: text("name").notNull(),
    sprite: text("sprite"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [
    // An item appears in a list once; a re-POST is a no-op, not a duplicate.
    unique("list_item_list_type_ref_unique").on(
      table.listId,
      table.type,
      table.refId,
    ),
    index("list_item_list_id_idx").on(table.listId),
  ],
);

// =============================================================================
// Decks
// =============================================================================

export const deck = pgTable(
  "deck",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    formatId: text("format_id").notNull(),
    language: text("language").notNull(),
    typeFocus: text("type_focus"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ...sharingColumns,
  },
  (table) => [index("deck_user_id_idx").on(table.userId)],
);

export const deckEntry = pgTable(
  "deck_entry",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => deck.id, { onDelete: "cascade" }),
    /** Full `DeckCard` snapshot, unchanged from how decks store cards today. */
    card: jsonb("card").notNull(),
    count: integer("count").notNull(),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [index("deck_entry_deck_id_idx").on(table.deckId)],
);

// =============================================================================
// Teams
// =============================================================================

export const team = pgTable(
  "team",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    generation: text("generation").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ...sharingColumns,
  },
  (table) => [index("team_user_id_idx").on(table.userId)],
);

export const teamMember = pgTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    /** Species dex id — matches `TeamMember.id` in `@/types/team`. */
    pokemonId: integer("pokemon_id").notNull(),
    name: text("name").notNull(),
    sprite: text("sprite").notNull(),
    position: integer("position").notNull(),
    /**
     * Full Showdown set config, populated on Showdown import and left null for
     * members added through the Pokemon picker — there is no editing UI for
     * these yet.
     */
    item: text("item"),
    ability: text("ability"),
    nature: text("nature"),
    evs: jsonb("evs"),
    ivs: jsonb("ivs"),
    moves: jsonb("moves"),
  },
  (table) => [index("team_member_team_id_idx").on(table.teamId)],
);

// =============================================================================
// Preferences — one row per user
// =============================================================================

export const preferences = pgTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  spriteSetOverride: text("sprite_set_override"),
  preferredGeneration: integer("preferred_generation"),
  preferredGameVersion: text("preferred_game_version"),
  contentWidth: text("content_width").notNull().default("contained"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
