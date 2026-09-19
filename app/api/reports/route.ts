import { NextResponse } from "next/server";

import { buildReportAggregates } from "@/lib/aggregations";
import { generateReportMarkdown, getReportModel, ReportGenerationError } from "@/lib/openai";
import { insertReport, listReports } from "@/lib/reports";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/reports -> report history, newest first (no content_md/input_snapshot).
export async function GET() {
  const reports = await listReports();
  return NextResponse.json({ reports });
}

// POST /api/reports -> runs the aggregations, calls OpenAI, inserts a new
// ai_reports row. Never updates an existing report — "regenerate" is just
// another POST, so past reports stay untouched.
export async function POST() {
  const userId = await requireUserId();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  let aggregates;
  try {
    aggregates = await buildReportAggregates();
  } catch (err) {
    console.error("POST /api/reports: aggregation failed", err);
    return NextResponse.json({ error: "Failed to compute report data." }, { status: 500 });
  }

  let contentMd: string;
  try {
    contentMd = await generateReportMarkdown(aggregates);
  } catch (err) {
    if (err instanceof ReportGenerationError && err.message === "OPENAI_API_KEY is not configured") {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("POST /api/reports: generation failed", err);
    return NextResponse.json({ error: "Report generation failed. Please try again." }, { status: 502 });
  }

  const report = await insertReport({
    generatedBy: userId,
    model: getReportModel(),
    inputSnapshot: aggregates,
    contentMd,
  });

  return NextResponse.json({ report }, { status: 201 });
}
