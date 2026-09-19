// Drizzle ORM client wrapping @vercel/postgres's fetch-based `sql` driver.
//
// Important: `sql` from @vercel/postgres only reads POSTGRES_URL when a query
// actually runs, not at import time — so importing this module (which every
// API route does) is always safe, even in environments where POSTGRES_URL is
// unset (e.g. a `next build` with only placeholder env vars). Nothing in this
// file connects to a database until a route handler actually queries it.
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";

import * as schema from "./schema";

export const db = drizzle(sql, { schema });

export { schema };
