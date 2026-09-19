// Builds the system/user messages sent to the LLM for the AI report
// pipeline (Stage 2). The model receives the exact aggregate JSON computed
// in lib/aggregations.ts and nothing else — it is instructed to narrate and
// interpret that data, never to invent numbers or reproduce them as
// Markdown tables (the app renders the real tables/charts from the same
// JSON separately, which is the groundedness guarantee).
import type { ReportAggregates } from "@/lib/aggregations";

export const SECTION_HEADINGS = [
  "Executive Summary",
  "Fiscal-Year Performance",
  "PR Sending Trends",
  "Top Recipients",
  "Product/Category Performance",
  "Shade Performance",
  "Repeat Recipient Analysis",
  "Key Observations",
  "Suggested Areas to Review",
] as const;

export interface ReportPrompt {
  system: string;
  user: string;
}

export function buildReportPrompt(aggregates: ReportAggregates): ReportPrompt {
  const system = `You are writing an internal management report for Pastel Beauty's PR/influencer-seeding program, based ONLY on the JSON data block the user provides.

STRICT RULES:
1. Use ONLY numbers present in the provided JSON, or numbers directly and simply derivable from it (sums, differences, percentages, ratios of the given fields). NEVER invent, estimate, or extrapolate a statistic that isn't backed by the JSON.
2. If a section's underlying data is thin, missing, or inconclusive, say so explicitly and briefly (e.g. "Insufficient data to identify a clear trend this period") rather than padding with generic or fabricated insight.
3. Output must be Markdown with EXACTLY these level-2 headings, in this exact order, and no others:
${SECTION_HEADINGS.map((h) => `   ## ${h}`).join("\n")}
4. Write prose and bullet points only. Do NOT produce Markdown tables — the application renders the real numeric tables and charts separately from this same data; your job is narrative framing and interpretation only, never numeric transcription.
5. Tone: concise, professional, management-facing. No marketing language, no exclamation points, no filler.
6. "Executive Summary" should be 3-5 sentences summarizing the most important facts from the other sections. "Key Observations" and "Suggested Areas to Review" should be bullet lists grounded in the same data (e.g. a category that dropped, a fiscal year with unusually high test-send volume, concentration in a small number of recipients) — do not suggest generic PR advice unrelated to the actual numbers provided.`;

  const user = `Here is the current PR-sending data for Pastel Beauty, aggregated from the live database as of ${aggregates.generatedAt}. Write the management report described in your instructions using only this data:

\`\`\`json
${JSON.stringify(aggregates, null, 2)}
\`\`\``;

  return { system, user };
}
