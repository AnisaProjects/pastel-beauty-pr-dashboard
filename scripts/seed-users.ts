// Creates/updates named user accounts. There is intentionally no public
// signup route or admin UI (matches "same permission level, no roles yet") —
// this script is the only way accounts get created.
//
// Run it locally (never as a live API route):
//   npm run seed:users
//
// Requires POSTGRES_URL to point at a real, migrated database (run
// `npm run db:generate` + apply the migration first — see drizzle/migrations).
//
// Two ways to supply the accounts to create:
//
// 1. Edit DEFAULT_USERS below (quick, fine for a one-person/small-team setup).
// 2. Set SEED_USERS as a JSON array in your environment/.env.local, e.g.:
//      SEED_USERS='[{"name":"Anil Ghatan","email":"anil.ghatan@hybrid.co","password":"change-me-now"}]'
//    which takes precedence over DEFAULT_USERS when set.
//
// Safe to re-run: existing emails get their name/password updated (upsert),
// nothing is duplicated. Change/rotate a password by editing the list and
// re-running.
import "dotenv/config";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db, schema } from "../lib/db";

type SeedUser = { name: string; email: string; password: string };

const DEFAULT_USERS: SeedUser[] = [
  // { name: "Anil Ghatan", email: "anil.ghatan@hybrid.co", password: "change-me-now" },
];

function loadUsers(): SeedUser[] {
  const raw = process.env.SEED_USERS;
  if (raw && raw.trim()) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("SEED_USERS must be a JSON array");
    return parsed;
  }
  return DEFAULT_USERS;
}

async function main() {
  const users = loadUsers();
  if (users.length === 0) {
    console.log(
      "No users to seed. Edit DEFAULT_USERS in scripts/seed-users.ts, or set the SEED_USERS env var, then re-run `npm run seed:users`.",
    );
    return;
  }

  for (const u of users) {
    const email = u.email.trim().toLowerCase();
    if (!email || !u.password || u.password.length < 8) {
      console.warn(`Skipping ${u.email || "(no email)"}: needs an email and a password of at least 8 characters.`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 12);

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing) {
      await db
        .update(schema.users)
        .set({ name: u.name, passwordHash })
        .where(eq(schema.users.id, existing.id));
      console.log(`Updated user: ${email}`);
    } else {
      await db.insert(schema.users).values({ name: u.name, email, passwordHash });
      console.log(`Created user: ${email}`);
    }
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed-users failed:", err);
    process.exit(1);
  });
