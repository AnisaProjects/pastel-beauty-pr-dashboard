// Deterministic, no-AI alternative to lib/prompt.ts + lib/openai.ts. Produces
// the exact same 9 `##` sections (see SECTION_HEADINGS in lib/prompt.ts) from
// the exact same aggregates, but as plain template sentences and bullet
// lists computed directly in code — no OpenAI call, so it's instant and
// never subject to API quota/latency/outage. This is the "Standard report"
// option users can pick instead of "AI report".
import { SECTION_HEADINGS } from "@/lib/prompt";
import type { ReportAggregates } from "@/lib/aggregations";

export const STANDARD_REPORT_MODEL_LABEL = "standard-template";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
}

function section(heading: (typeof SECTION_HEADINGS)[number], body: string): string {
  return `## ${heading}\n\n${body}`;
}

function executiveSummary(a: ReportAggregates): string {
  const { overall, perFiscalYear, topRecipients, categoryBreakdown } = a;
  if (overall.sends === 0) {
    return "No PR sends are currently recorded in the database (excluding test/internal sends). Add some send records to generate a meaningful summary.";
  }
  const latestFy = perFiscalYear[perFiscalYear.length - 1];
  const sentences: string[] = [];
  sentences.push(
    `Across ${perFiscalYear.length} fiscal year${perFiscalYear.length === 1 ? "" : "s"} of recorded activity, Pastel Beauty made ${fmt(overall.sends)} PR sends totaling ${fmt(overall.units)} units` +
      (overall.excludedTestSends > 0 ? ` (${fmt(overall.excludedTestSends)} test/internal sends excluded from these figures).` : "."),
  );
  if (a.prValue) {
    const incompleteNote = a.prValue.incompleteSends > 0
      ? ` ${fmt(a.prValue.incompleteSends)} sends are incompletely valued${a.prValue.unpricedProductLines > 0 ? ` across ${fmt(a.prValue.unpricedProductLines)} unpriced product lines` : " because they have no product lines"}.`
      : ` All ${fmt(a.prValue.valuedSends)} sends are fully valued.`;
    sentences.push(`Known PR product value totals NPR ${fmt(a.prValue.knownValueNpr)}.${incompleteNote}`);
  }
  if (latestFy) {
    sentences.push(
      `The most recent fiscal year, FY ${latestFy.fiscalYear}, recorded ${fmt(latestFy.sends)} sends and ${fmt(latestFy.units)} units` +
        (latestFy.unitsChangePct !== null ? ` (${pct(latestFy.unitsChangePct)} in units versus the prior fiscal year).` : "."),
    );
  }
  if (topRecipients[0]) {
    sentences.push(
      `The top recipient by volume was ${topRecipients[0].name} with ${fmt(topRecipients[0].units)} units across ${fmt(topRecipients[0].sends)} sends.`,
    );
  }
  if (categoryBreakdown[0]) {
    sentences.push(
      `${categoryBreakdown[0].category} was the leading product category, accounting for ${categoryBreakdown[0].pctOfTotal}% of total units sent.`,
    );
  }
  return sentences.join(" ");
}

function fiscalYearPerformance(a: ReportAggregates): string {
  const { perFiscalYear } = a;
  if (perFiscalYear.length === 0) return "No fiscal-year data available.";
  const lines = perFiscalYear.map((fy) => {
    const change = fy.unitsChangePct !== null ? ` (${pct(fy.unitsChangePct)} units vs. the prior fiscal year)` : "";
    const value = fy.prValueNpr === undefined ? "" : `, PR value NPR ${fmt(fy.prValueNpr)}${fy.incompleteValuationSends ? ` (${fmt(fy.incompleteValuationSends)} incomplete sends)` : ""}`;
    return `- FY ${fy.fiscalYear}: ${fmt(fy.sends)} sends, ${fmt(fy.units)} units${value}${change}`;
  });
  const best = [...perFiscalYear].sort((x, y) => y.units - x.units)[0];
  lines.push(`\nThe highest-volume fiscal year on record is FY ${best.fiscalYear}, with ${fmt(best.units)} units sent.`);
  return lines.join("\n");
}

function prSendingTrends(a: ReportAggregates): string {
  const { monthlyTrend } = a;
  if (monthlyTrend.length === 0) return "Insufficient monthly data to identify a sending trend.";
  const first = monthlyTrend[0];
  const last = monthlyTrend[monthlyTrend.length - 1];
  const peak = [...monthlyTrend].sort((x, y) => y.units - x.units)[0];
  const monthLabel = (m: string) => new Date(`${m}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  const parts = [
    `Data spans ${monthlyTrend.length} month${monthlyTrend.length === 1 ? "" : "s"} of activity, from ${monthLabel(first.month)} to ${monthLabel(last.month)}.`,
    `The highest-volume month was ${monthLabel(peak.month)}, with ${fmt(peak.units)} units across ${fmt(peak.sends)} sends.`,
  ];
  return parts.join(" ");
}

function topRecipientsSection(a: ReportAggregates): string {
  const { topRecipients, overall } = a;
  if (topRecipients.length === 0) return "No recipient data available.";
  const lines = topRecipients.map((r, i) => `${i + 1}. ${r.name} — ${fmt(r.units)} units across ${fmt(r.sends)} sends`);
  const top3Units = topRecipients.slice(0, 3).reduce((s, r) => s + r.units, 0);
  const top3Pct = overall.units > 0 ? Math.round((top3Units / overall.units) * 1000) / 10 : 0;
  lines.push(`\nThe top 3 recipients account for ${top3Pct}% of total units sent.`);
  return lines.join("\n");
}

function categoryPerformance(a: ReportAggregates): string {
  const { categoryBreakdown } = a;
  if (categoryBreakdown.length === 0) return "No category data available.";
  return categoryBreakdown.map((c) => `- ${c.category}: ${fmt(c.units)} units (${c.pctOfTotal}% of total), PR value NPR ${c.prValueNpr === undefined ? "unavailable" : fmt(c.prValueNpr)}${c.unpricedProductLines ? ` (${fmt(c.unpricedProductLines)} unpriced lines)` : ""}`).join("\n");
}

function shadePerformance(a: ReportAggregates): string {
  const { shadeBreakdown } = a;
  if (shadeBreakdown.length === 0) return "No shade-level data available.";
  return shadeBreakdown.map((s) => `- ${s.category} — ${s.shade}: ${fmt(s.units)} units (${s.pctOfTotal}% of total), PR value NPR ${s.prValueNpr === undefined ? "unavailable" : fmt(s.prValueNpr)}${s.unpricedProductLines ? ` (${fmt(s.unpricedProductLines)} unpriced lines)` : ""}`).join("\n");
}

function repeatRecipientAnalysis(a: ReportAggregates): string {
  const { repeatVsNew } = a;
  if (repeatVsNew.length === 0) return "No repeat-recipient data available.";
  return repeatVsNew
    .map((r) => `- FY ${r.fiscalYear}: ${r.repeatPct}% repeat sends (${fmt(r.newSends)} new, ${fmt(r.repeatSends)} repeat)`)
    .join("\n");
}

function keyObservations(a: ReportAggregates): string {
  const { overall, categoryBreakdown, topRecipients, perFiscalYear } = a;
  const bullets: string[] = [];

  if (categoryBreakdown.length >= 2) {
    const [first, second] = categoryBreakdown;
    bullets.push(
      `${first.category} is the largest product category by units (${first.pctOfTotal}%), ahead of ${second.category} (${second.pctOfTotal}%).`,
    );
  } else if (categoryBreakdown.length === 1) {
    bullets.push(`All recorded units fall under a single category: ${categoryBreakdown[0].category}.`);
  }

  if (topRecipients[0]) {
    const share = overall.units > 0 ? Math.round((topRecipients[0].units / overall.units) * 1000) / 10 : 0;
    bullets.push(`${topRecipients[0].name} is the single largest recipient by units, representing ${share}% of total units sent.`);
  }

  const bestFy = perFiscalYear.length ? [...perFiscalYear].sort((x, y) => y.units - x.units)[0] : null;
  const worstFy = perFiscalYear.length ? [...perFiscalYear].sort((x, y) => x.units - y.units)[0] : null;
  if (bestFy && worstFy && bestFy !== worstFy) {
    bullets.push(
      `Unit volume ranges from ${fmt(worstFy.units)} units (FY ${worstFy.fiscalYear}) to ${fmt(bestFy.units)} units (FY ${bestFy.fiscalYear}) across the recorded fiscal years.`,
    );
  }

  if (overall.excludedTestSends > 0) {
    bullets.push(`${fmt(overall.excludedTestSends)} sends were flagged as test/internal and excluded from all figures above.`);
  }

  if (bullets.length === 0) return "No notable patterns identified in the current data.";
  return bullets.map((b) => `- ${b}`).join("\n");
}

function suggestedAreasToReview(a: ReportAggregates): string {
  const { overall, perFiscalYear, categoryBreakdown, topRecipients } = a;
  const bullets: string[] = [];

  const latestFy = perFiscalYear[perFiscalYear.length - 1];
  if (latestFy && perFiscalYear.length > 1 && latestFy.sends < perFiscalYear[perFiscalYear.length - 2].sends / 2) {
    bullets.push(
      `FY ${latestFy.fiscalYear} shows only ${fmt(latestFy.sends)} sends recorded so far, well below the prior fiscal year — confirm whether this reflects a partial fiscal year in progress or a genuine drop-off before drawing conclusions.`,
    );
  }

  if (categoryBreakdown[0] && categoryBreakdown[0].pctOfTotal >= 50) {
    bullets.push(
      `Product mix is concentrated in ${categoryBreakdown[0].category} (${categoryBreakdown[0].pctOfTotal}% of units) — consider whether other categories are underrepresented in PR sends.`,
    );
  }

  if (topRecipients[0]) {
    const share = overall.units > 0 ? Math.round((topRecipients[0].units / overall.units) * 1000) / 10 : 0;
    if (share >= 10) {
      bullets.push(
        `${topRecipients[0].name} alone accounts for ${share}% of total units sent — worth reviewing whether this concentration is intentional.`,
      );
    }
  }

  if (overall.excludedTestSends > 0) {
    bullets.push(
      `Verify the "test/internal" flag is being applied consistently on new entries, since ${fmt(overall.excludedTestSends)} sends are currently excluded from reporting on that basis.`,
    );
  }

  if (bullets.length === 0) {
    return "No specific concerns stand out from the current data.";
  }
  return bullets.map((b) => `- ${b}`).join("\n");
}

// Builds the full Markdown report, matching the exact heading set/order the
// AI pipeline produces (lib/prompt.ts SECTION_HEADINGS), so ReportView and
// the PDF renderer work identically for both report types.
export function buildStandardReportMarkdown(a: ReportAggregates): string {
  const sections = [
    section("Executive Summary", executiveSummary(a)),
    section("Fiscal-Year Performance", fiscalYearPerformance(a)),
    section("PR Sending Trends", prSendingTrends(a)),
    section("Top Recipients", topRecipientsSection(a)),
    section("Product/Category Performance", categoryPerformance(a)),
    section("Shade Performance", shadePerformance(a)),
    section("Repeat Recipient Analysis", repeatRecipientAnalysis(a)),
    section("Key Observations", keyObservations(a)),
    section("Suggested Areas to Review", suggestedAreasToReview(a)),
  ];
  return sections.join("\n\n");
}
