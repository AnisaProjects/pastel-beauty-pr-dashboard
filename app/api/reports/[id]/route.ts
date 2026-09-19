import { NextRequest, NextResponse } from "next/server";

import { getReport } from "@/lib/reports";

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

  const report = await getReport(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ report });
}
