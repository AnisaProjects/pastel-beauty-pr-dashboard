import "./lib/loadEnv";

import { defineConfig } from "drizzle-kit";

// drizzle-kit reads env only when you actually run `drizzle-kit
// generate` / `migrate` / `studio` — `generate` in particular only reads the
// schema file and does NOT need a reachable database, so it works fine even
// with no env vars set (a placeholder keeps drizzle-kit's config validation
// happy).
//
// Migrations run DDL, which must go over the DIRECT (unpooled) connection —
// running them through PgBouncer's transaction-pooling mode (the default
// POSTGRES_URL) is a known source of migration failures. Vercel's Postgres/
// Neon integration provides the unpooled string as POSTGRES_URL_NON_POOLING.
export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_URL ??
      "postgres://placeholder:placeholder@localhost:5432/placeholder",
  },
});
