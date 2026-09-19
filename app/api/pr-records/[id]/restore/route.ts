import { NextRequest, NextResponse } from "next/server";

import { restorePrRecord } from "@/lib/pr-records";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const userId = await requireUserId();
  const ok = await restorePrRecord(id, userId);
  if (!ok) return NextResponse.json({ error: "Not found or not deleted" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
