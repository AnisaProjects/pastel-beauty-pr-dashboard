// Thin wrapper around the OpenAI SDK for the AI report pipeline (Stage 2).
// Kept separate from the route handler so the route stays thin, matching
// the lib/pr-records.ts convention.
import OpenAI from "openai";

import type { ReportAggregates } from "@/lib/aggregations";
import { buildReportPrompt } from "@/lib/prompt";

// gpt-5.4-mini is OpenAI's current-generation cheap/fast tier (Sept 2026);
// still fully overridable via OPENAI_MODEL if pricing/models shift again.
export const DEFAULT_REPORT_MODEL = "gpt-5.4-mini";

export function getReportModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_REPORT_MODEL;
}

export class ReportGenerationError extends Error {}

// Runs the actual completion call and returns the raw Markdown content.
// Throws ReportGenerationError on any failure (missing/empty response,
// SDK error) so the caller can decide how to respond — never inserts
// anything into the database itself.
export async function generateReportMarkdown(aggregates: ReportAggregates): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ReportGenerationError("OPENAI_API_KEY is not configured");
  }

  const { system, user } = buildReportPrompt(aggregates);
  const openai = new OpenAI({ apiKey });
  const model = getReportModel();

  let contentMd: string;
  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    contentMd = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw new ReportGenerationError(
      err instanceof Error ? `OpenAI request failed: ${err.message}` : "OpenAI request failed",
    );
  }

  if (!contentMd.trim()) {
    throw new ReportGenerationError("Empty response from model");
  }
  return contentMd;
}
