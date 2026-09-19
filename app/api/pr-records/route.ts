import { NextRequest, NextResponse } from "next/server";

import { createPrRecord, listPrRecords } from "@/lib/pr-records";
import { requireUserId } from "@/lib/session";
import { parsePrRecordInput, ValidationError } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pr-records            -> non-deleted records (default)
// GET /api/pr-records?deleted=1  -> soft-deleted records (for the trash panel)
export async function GET(req: NextRequest) {
  const deleted = req.nextUrl.searchParams.get("deleted") === "1";
  const records = await listPrRecords({ deleted });
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  try {
    const body = await req.json();
    const input = parsePrRecordInput(body);
    const record = await createPrRecord(input, userId);
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/pr-records failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
