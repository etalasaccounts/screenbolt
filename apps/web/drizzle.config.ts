import type { Config } from "drizzle-kit";

// Load .env.local so drizzle-kit can see DATABASE_URL (Next.js convention).
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may not exist in CI; fall through to process.env
}

function databaseUrl(): string {
  // Prefer DIRECT_URL for migrations; Neon's pooler doesn't support some DDL.
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL is not set");
  }
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl(),
  },
  verbose: true,
  strict: true,
} satisfies Config;
