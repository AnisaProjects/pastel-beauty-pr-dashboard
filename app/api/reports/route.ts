import { NextRequest, NextResponse } from "next/server";

import { buildReportAggregates } from "@/lib/aggregations";
import { generateReportMarkdown, getReportModel, ReportGenerationError } from "@/lib/openai";
import { insertReport, listReports } from "@/lib/reports";
import { requireUserId } from "@/lib/session";
import { buildStandardReportMarkdown, STANDARD_REPORT_MODEL_LABEL } from "@/lib/standardReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/reports -> report history, newest first (no content_md/input_snapshot).
export async function GET() {
  const reports = await listReports();
  return NextResponse.json({ reports });
}

type ReportType = "ai" | "standard";

async function readReportType(req: NextRequest): Promise<ReportType> {
  try {
    const body = await req.json();
    return body?.type === "standard" ? "standard" : "ai";
  } catch {
    return "ai"; // no/invalid body — default to the existing AI behavior
  }
}

// POST /api/reports -> runs the aggregations, then either calls OpenAI
// ("ai") or fills a deterministic template ("standard", no API call — the
// fallback when AI usage limits or latency are a concern). Inserts a new
// ai_reports row either way; never updates an existing one, so "regenerate"
// is just another POST and past reports stay untouched.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const type = await readReportType(req);

  let aggregates;
  try {
    aggregates = await buildReportAggregates();
  } catch (err) {
    console.error("POST /api/reports: aggregation failed", err);
    return NextResponse.json({ error: "Failed to compute report data." }, { status: 500 });
  }

  if (type === "standard") {
    const contentMd = buildStandardReportMarkdown(aggregates);
    const report = await insertReport({
      generatedBy: userId,
      reportType: "standard",
      model: STANDARD_REPORT_MODEL_LABEL,
      inputSnapshot: aggregates,
      contentMd,
    });
    return NextResponse.json({ report }, { status: 201 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
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
    reportType: "ai",
    model: getReportModel(),
    inputSnapshot: aggregates,
    contentMd,
  });

  return NextResponse.json({ report }, { status: 201 });
}
