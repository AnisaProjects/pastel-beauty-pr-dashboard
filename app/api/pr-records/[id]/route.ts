import { NextRequest, NextResponse } from "next/server";

import { getPrRecord, softDeletePrRecord, updatePrRecord } from "@/lib/pr-records";
import { requireUserId } from "@/lib/session";
import { parsePrRecordInput, ValidationError } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function parseId(idStr: string): number | null {
  const id = Number(idStr);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const record = await getPrRecord(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const userId = await requireUserId();
  try {
    const body = await req.json();
    const input = parsePrRecordInput(body);
    const record = await updatePrRecord(id, input, userId);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ record });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(`PATCH /api/pr-records/${idStr} failed`, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Soft delete: sets is_deleted = true. See /api/pr-records/[id]/restore to undo.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const userId = await requireUserId();
  const ok = await softDeletePrRecord(id, userId);
  if (!ok) return NextResponse.json({ error: "Not found or already deleted" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
