// Plain Node entry points (drizzle-kit config, scripts/*.ts run via tsx) do
// NOT get Next.js's automatic .env.local loading — only `next dev`/`next build`
// do that. `vercel env pull` writes to .env.local, so anything run outside
// Next.js must load it explicitly, or POSTGRES_URL/AUTH_SECRET silently stay
// unset. Prefers .env.local (matches what `vercel env pull` produces), falls
// back to .env for anyone using a plain env file instead.
import fs from "node:fs";
import path from "node:path";

import { config } from "dotenv";

function loadEnv() {
  const root = path.resolve(__dirname, "..");
  const envLocal = path.join(root, ".env.local");
  config({ path: fs.existsSync(envLocal) ? envLocal : path.join(root, ".env") });
}

loadEnv();
