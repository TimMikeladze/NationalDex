import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // biome-ignore lint/suspicious/noVar: `var` is required for global augmentation
  var __nationaldexPg: postgres.Sql | undefined;
}

export type Db = PostgresJsDatabase<typeof schema>;

/** The handle inside `db.transaction(async (tx) => ...)`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

let instance: Db | undefined;

/**
 * One pooled connection reused across hot-reloads/lambda invocations —
 * postgres.js already pools internally, this just stops dev-mode reloads (or
 * Fluid Compute instance reuse) from opening a fresh pool every time.
 */
function connect(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — see .env.example");
  }
  const client =
    globalThis.__nationaldexPg ??
    postgres(url, {
      max: process.env.NODE_ENV === "production" ? 10 : 1,
    });
  if (process.env.NODE_ENV !== "production") {
    globalThis.__nationaldexPg = client;
  }
  return drizzle(client, { schema });
}

export function getDb(): Db {
  instance ??= connect();
  return instance;
}

/**
 * The database handle every route and page imports. It connects on first
 * use, not at import: `next build` evaluates route modules while collecting
 * page data, and nothing should open a pool (or demand `DATABASE_URL`) for
 * that. A query without `DATABASE_URL` set still fails loudly.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, property) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[property];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
