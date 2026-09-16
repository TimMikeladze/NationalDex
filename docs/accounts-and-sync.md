# Accounts and cloud sync (#96)

## Goal

Add an account layer on top of the existing `localStorage` persistence: guest
mode by default, Postgres-backed sync for every session (guest or signed in),
and shareable URLs for decks/teams/lists. Local storage never goes away — it's
the instant-paint mirror, the offline cache, and the pre-session path.

## Stack

- **better-auth** with the `anonymous` plugin for guest mode (a guest is a real
  `user` row with `isAnonymous: true`, created on first visit) and
  `emailAndPassword` + optional GitHub OAuth for real accounts. The sign-in /
  sign-up / sign-out UI lives in the settings page's account section
  (`src/components/account/account-section.tsx`).
- **Drizzle ORM + drizzle-kit**, Postgres via `postgres` (porsager), pooled.
  `DATABASE_URL` is required; the client connects lazily on first query so
  `next build` never needs a database.
- Route handlers under `src/app/api/*` for CRUD, consumed through TanStack Query.

## Data model

better-auth owns `user` (+ `isAnonymous` from the anonymous plugin), `session`,
`account`, `verification`. App tables, all FK'd to `user.id` with `onDelete: cascade`:

- `favorite(user_id, pokemon_id)` — unique per pair.
- `card_favorite(user_id, card_id, name, local_id, image, added_at)` — unique per pair.
- `list`, `list_item` — list has sharing columns (below); items FK to list,
  cascade, and are unique per `(list_id, type, ref_id)` so a replayed add is a
  no-op rather than a duplicate.
- `deck`, `deck_entry` — deck has sharing columns; `deck_entry.card` is a jsonb
  snapshot of `DeckCard` (unchanged shape from today), matching how decks already
  store a full card snapshot rather than a live reference.
- `team`, `team_member` — team has sharing columns; `team_member` gains optional
  `item`, `ability`, `nature`, `evs` (jsonb), `ivs` (jsonb), `moves` (jsonb) columns.
  These are populated when a team is imported from a Showdown paste
  (`team-export.ts` already parses all of them) and left null for members added
  via the Pokemon picker. `TeamMember` gains matching optional fields; no new
  editing UI is introduced.
- `preferences` — one row per user: `sprite_set_override`, `preferred_generation`,
  `preferred_game_version`, `content_width`.

Sharing columns on `list`/`deck`/`team`: `visibility` (`private|unlisted|public`,
default `private`), `share_slug` (unique, nullable), `shared_at`.

`favorite`/`card_favorite`/`preferences` are unique-per-user (upsert targets);
`list`/`deck`/`team` ids are client-generated strings (as today) so creation works
fully offline. `POST /api/{lists,decks,teams}` is an upsert scoped to the caller:
an id the caller owns is replaced (parent fields and children), an id someone
else owns is left alone and reported as not found.

Migrations live in `drizzle/` with the drizzle-kit snapshot checked in, so
`bun run db:generate` after a schema change emits only the diff.

## Guest -> account claim

better-auth's anonymous plugin calls `onLinkAccount({ anonymousUser, newUser })`
right before it deletes the anonymous user — on sign-up *and* on sign-in to an
existing account. In that hook, inside one transaction:

- `favorite`/`card_favorite`: for each guest row, insert for the real user with
  `ON CONFLICT DO NOTHING` (keeps the real account's copy if both have the same
  Pokemon/card already favorited), then let the cascade delete drop the rest.
- `list`/`deck`/`team`: re-parent with `UPDATE ... SET user_id = newUser.id WHERE
  user_id = anonymousUser.id` — nothing to conflict on, ids are already unique.
- `preferences`: re-parent only if the real user has no preferences row yet;
  otherwise the real account's existing preferences win and the guest's are dropped.

All statements are `WHERE user_id = anonymousUser.id` scoped and re-runnable, so a
retried callback is a no-op the second time.

The guest sign-in itself (`ensureGuestSession`) runs under a Web Lock
(`navigator.locks`) so two tabs booting at once mint one guest user, not two —
the second cookie would otherwise orphan whatever the first tab had already
pushed. Browsers without Web Locks fall back to the per-tab guard.

## Local/remote sync

### Local mirrors

Every synced hook keeps its local copy in one module-level store per
`localStorage` key (`createStorageStore` in `src/lib/sync/storage-store.ts`,
read through `useSyncExternalStore`). Every component on the same key sees the
same value and the same writes — a heart on every card in a grid must not hold
its own copy that overwrites a neighbour's change — and the sync engine writes
into the same store, so a merge is visible everywhere at once. The keys
themselves — the synced ones, the legacy preference keys, and the
`pokedex-outbox-` / `pokedex-synced-` prefixes — are listed once, in
`src/lib/sync/storage-keys.ts`.

The four preference hooks (`use-sprite-preferences`, `use-generation-preference`,
`use-pokedex-preference`, `use-content-width`) share one record under the single
`pokedex-preferences` key (mirroring the one-row-per-user table). The first read
in a browser migrates the four legacy keys (`pokedex-sprite-preferences`,
`pokedex-generation-preference`, `pokedex-game-preference`,
`nationaldex-content-width`) into it once; the old keys are left as orphans.

### Engines

Every collection (favorites, card favorites, lists, decks, teams) goes through
one generic engine, `useRemoteSync` (`src/lib/sync/use-remote-sync.ts`), so the
five hooks don't each reimplement the same online/offline dance. `preferences`
uses the same idea for a single record (`useSyncedRecord`).

1. The store reads `localStorage` on first subscribe — unchanged instant-paint
   behaviour.
2. Once a session exists, the remote copy is fetched (TanStack Query, keyed by
   `[resource, userId]`).
3. **First merge** for a `(resource, user)` in this browser — tracked by a
   `pokedex-synced-<resource>-<userId>` marker in `localStorage`: any local
   item with no remote counterpart is uploaded and kept; everything else comes
   from the server. This is the guest's data going up, and a signed-in user's
   local-only data on a new device. The marker is written only once every
   upload has been acknowledged or queued, so a tab closed mid-upload can't
   leave items on neither side and then lose them to the next snapshot.
4. **After the first merge the server wins** whenever a fresh snapshot arrives:
   a row missing remotely was deleted on another device, not "never uploaded".
   Applying a snapshot is guarded module-wide (one application per snapshot,
   however many hook instances are mounted), and skipped entirely while this
   browser has writes in flight or queued — local is ahead of the server by
   definition then, and the refetch that follows those writes brings the truth.
5. Every mutation updates the store optimistically, then fires the matching
   request through `syncWrite` (`src/lib/sync/outbox.ts`). A request that
   can't go through — offline, server down, or no session yet (a cold start
   races the guest sign-in) — is queued in a per-resource outbox, itself just
   another `localStorage` key, and replayed in order on the browser's `online`
   event and whenever a session appears. A resource's writes go out one at a
   time, in call order — "create the list" reaches the server before "add an
   item to it", and of two whole-list replacements the newer one lands last —
   and new writes queue behind anything already queued. The replay re-reads
   the queue after every op, so a write made while a replay is running is
   replayed too rather than overwritten. An op the server keeps answering 5xx
   to is dropped after five tries so it can't block the queue forever; a 4xx
   is final on the first answer, which is why every route validates its body
   (zod) and answers 400 rather than letting a bad body surface as a 500.
   When a write lands or a queue drains, the resource is refetched.

Each domain hook (`use-favorites`, `use-lists`, etc.) keeps its exact existing
public API — every caller in the app is unaffected — and is a thin wrapper over
the store plus the engine.

### Backup, restore, delete everything

`use-data-export.ts` exports the same keys as before as a **v2** backup: one
consolidated `preferences` record instead of the four legacy fields (pre-v2
backups still import — their legacy fields are restored into the legacy keys
and consolidated the same way the first read does). Restoring writes
`localStorage`, then, when there is a session, pushes every restored item
through the same request its hook sends (after the same `revive*` pass) so the
server doesn't override it on the next load. Favourites the account already
has are left alone; a list, deck or team whose id the account already has is
replaced by the backup's copy, children included (`POST` is a whole-row
upsert); nothing that isn't in the backup is touched. "Delete everything"
waits for every remote delete to be acknowledged (or queued) before wiping
local state and the first-merge markers and reloading — the outbox is kept,
because offline those deletes are sitting in it and dropping them would let
the untouched server rows merge straight back in on reconnect. Sign-out wipes
the outbox too, so the next account on this browser doesn't inherit and
re-upload the previous one's data.

## Sharing

- `PATCH /api/{decks,teams,lists}/[id]/share` sets visibility (validated to the
  three known values); moving out of `private` mints a `share_slug` (nanoid) if
  one doesn't exist. A separate `rotate` action replaces the slug, revoking old
  links immediately. The three routes share `buildShareUpdate` (`src/lib/sharing.ts`).
- `GET /{decks,teams,lists}/share/[slug]` is a server component: 404s unless
  `visibility != 'private'` (one `getShared{Deck,List,Team}` loader in
  `src/lib/server/` serves the page, its OG image and the clone action). The
  owner following their own link sees "open in your collection" instead of a
  clone button. For anyone else — guests included, since they already have a
  real user row — "copy to my collection" is a server action that clones the
  row and its children under the viewer's `user_id` in one transaction and
  returns the copy; the button drops it into the local mirror before
  navigating, so the detail page finds it without waiting for a refetch.
- `opengraph-image.tsx` per share route, same `next/og` pattern already used at
  `src/app/pokemon/[id]/opengraph-image.tsx`.
- `/{decks,teams,lists}/browse` lists `visibility = 'public'` rows, rendered per
  request, linked from each index page and from the share dialog. No per-user
  profile page — out of scope for this pass (the issue left this as an open
  question; a browse-by-type page is the minimal reading of "a browse surface").
- `deck-share.ts` / `team-export.ts` (text/code export) are untouched.

## Assumptions (issue left these open)

- Sharing requires a real account — a guest can build a deck/team/list but the
  share dialog points at sign-in instead of the visibility controls (matches the
  issue's own leaning: an unclaimed guest shouldn't be able to orphan a public URL).
- Postgres host: the sandbox instance named in the environment (`DATABASE_URL` env
  var), not Neon — per standing instructions to default to that box for new work.
- Three keys from the issue's migration table stay `localStorage`-only in this
  pass, deliberately: `pokedex-comparison-v2` and `pokedex-dex-filter` are
  ephemeral UI state (the comparison tray and the filter panel's open/sort
  state, the latter also carried by the URL), and `pokedex-recently-viewed` is a
  per-device history. All three are still in the backup. `recently-viewed` is
  the one worth syncing later; it would take a `recently_viewed` table, a route,
  and the same `useRemoteSync` wiring as favorites.

## Running it

```bash
cp .env.example .env      # set DATABASE_URL, BETTER_AUTH_SECRET
bun install
bun run db:migrate        # applies drizzle/ to DATABASE_URL (or db:push in dev)
bun dev
bun test                  # outbox replay + share-update unit tests
bun run check             # biome + tsc
```
