import { NextRequest, NextResponse } from "next/server";

import { bulkCreatePrRecords } from "@/lib/pr-records";
import { requireUserId } from "@/lib/session";
import { parsePrRecordInput, ValidationError } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// JSON import — replaces the legacy "Restore JSON" localStorage import.
// Accepts an array of records in the same shape the "Add/Edit" form submits.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected a JSON array of records." }, { status: 400 });
    }
    const inputs = body.map((r, i) => {
      try {
        return parsePrRecordInput(r);
      } catch (e) {
        throw new ValidationError(`Record ${i}: ${e instanceof Error ? e.message : "invalid"}`);
      }
    });
    const result = await bulkCreatePrRecords(inputs, userId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/pr-records/bulk failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
