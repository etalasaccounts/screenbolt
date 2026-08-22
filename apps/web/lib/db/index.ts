import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Normalize the Neon connection string for drivers that don't understand
 * libpq-only parameters. `channel_binding=require` is a libpq client-side
 * option; postgres.js (and node-postgres) don't implement SCRAM channel
 * binding, so we strip it. The connection remains TLS-encrypted via
 * `sslmode=require`, which is preserved.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}

// Reuse a single client in development (and across hot reloads).
const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb.sql ?? postgres(getDatabaseUrl(), { max: 5, prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

export const db = drizzle(sql, { schema });
