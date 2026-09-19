// Server-side data access for ai_reports. Kept separate from the route
// handlers so the API routes stay thin, matching lib/pr-records.ts.
import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { ReportAggregates } from "@/lib/aggregations";

export type AiReportRow = typeof schema.aiReports.$inferSelect;

// List view — deliberately omits input_snapshot/content_md (only needed
// when viewing a single report) to keep the reports list light.
export async function listReports(): Promise<
  Pick<AiReportRow, "id" | "generatedAt" | "generatedBy" | "reportType" | "model" | "status">[]
> {
  return db
    .select({
      id: schema.aiReports.id,
      generatedAt: schema.aiReports.generatedAt,
      generatedBy: schema.aiReports.generatedBy,
      reportType: schema.aiReports.reportType,
      model: schema.aiReports.model,
      status: schema.aiReports.status,
    })
    .from(schema.aiReports)
    .orderBy(desc(schema.aiReports.generatedAt));
}

export async function getReport(id: number): Promise<AiReportRow | null> {
  const [row] = await db.select().from(schema.aiReports).where(eq(schema.aiReports.id, id)).limit(1);
  return row ?? null;
}

// Always inserts a new row — a report is never updated in place, so
// "Regenerate" is just another POST /api/reports and every past report
// stays intact.
export async function insertReport(input: {
  generatedBy: string | undefined;
  reportType: "ai" | "standard";
  model: string;
  inputSnapshot: ReportAggregates;
  contentMd: string;
}): Promise<AiReportRow> {
  const [row] = await db
    .insert(schema.aiReports)
    .values({
      generatedBy: input.generatedBy,
      reportType: input.reportType,
      model: input.model,
      inputSnapshot: input.inputSnapshot,
      contentMd: input.contentMd,
      status: "completed",
    })
    .returning();
  return row;
}
