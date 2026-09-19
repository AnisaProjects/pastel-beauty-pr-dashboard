import { NextResponse } from "next/server";

import { getMeta } from "@/lib/pr-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Distinct categories/shades, derived live from pr_record_products — there's
// no separate categories/shades table; new ones register themselves from
// data entry, same as the original dashboard.
export async function GET() {
  const meta = await getMeta();
  return NextResponse.json(meta);
}
