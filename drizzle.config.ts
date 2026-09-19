import { defineConfig } from "drizzle-kit";

// drizzle-kit reads POSTGRES_URL only when you actually run `drizzle-kit
// generate` / `migrate` / `studio` — `generate` in particular only reads the
// schema file and does NOT need a reachable database, so it works fine even
// with POSTGRES_URL unset (a placeholder keeps drizzle-kit's config
// validation happy).
export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "postgres://placeholder:placeholder@localhost:5432/placeholder",
  },
});
