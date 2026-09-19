"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { generateReport } from "@/lib/api-client";
import { fmtNum } from "@/lib/format";
import type { ReportAggregates, ReportDetail } from "@/lib/types";
import CategoryBreakdownChart from "@/components/report/CategoryBreakdownChart";
import FyPerformanceTable from "@/components/report/FyPerformanceTable";
import MonthlyTrendChart from "@/components/report/MonthlyTrendChart";
import RepeatVsNewChart from "@/components/report/RepeatVsNewChart";
import ShadeBreakdownTable from "@/components/report/ShadeBreakdownTable";
import TopRecipientsTable from "@/components/report/TopRecipientsTable";

function splitSections(md: string): { heading: string; body: string }[] {
  const parts = md.split(/^##\s+(.+)$/m).slice(1); // [heading, body, heading, body, ...]
  const sections: { heading: string; body: string }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    sections.push({ heading: parts[i].trim(), body: (parts[i + 1] || "").trim() });
  }
  return sections;
}

// Section heading -> the real-data component rendered right after that
// section's prose. Keys must exactly match SECTION_HEADINGS in lib/prompt.ts.
// Whatever numbers appear here come straight from input_snapshot (the DB),
// never from the LLM's prose.
const SECTION_DATA_COMPONENT: Record<string, (a: ReportAggregates) => React.ReactNode> = {
  "Fiscal-Year Performance": (a) => <FyPerformanceTable rows={a.perFiscalYear} />,
  "PR Sending Trends": (a) => <MonthlyTrendChart rows={a.monthlyTrend} />,
  "Top Recipients": (a) => <TopRecipientsTable rows={a.topRecipients} />,
  "Product/Category Performance": (a) => <CategoryBreakdownChart rows={a.categoryBreakdown} />,
  "Shade Performance": (a) => <ShadeBreakdownTable rows={a.shadeBreakdown} />,
  "Repeat Recipient Analysis": (a) => <RepeatVsNewChart rows={a.repeatVsNew} />,
};

function fmtGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReportView({ report }: { report: ReportDetail }) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = splitSections(report.contentMd);

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const fresh = await generateReport(report.reportType);
      router.push(`/reports/${fresh.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate report");
      setRegenerating(false);
    }
  }

  return (
    <div className="wrap report-page">
      <div className="panel report-toolbar no-print">
        <div>
          <h2>PR Performance Management Report</h2>
          <p className="report-meta">
            Generated {fmtGeneratedAt(report.generatedAt)} ·{" "}
            <span className={`badge ${report.reportType === "ai" ? "ai" : "standard"}`}>
              {report.reportType === "ai" ? "AI" : "Standard"}
            </span>{" "}
            · Model: {report.model} · Report #{report.id}
          </p>
          <p className="report-meta">
            {fmtNum(report.inputSnapshot.overall.sends)} sends analyzed · {fmtNum(report.inputSnapshot.overall.units)}{" "}
            units ({fmtNum(report.inputSnapshot.overall.excludedTestSends)} test sends excluded)
          </p>
        </div>
        <div className="report-actions">
          <button type="button" className="btn ghost small" onClick={() => router.push("/reports")}>
            Back to reports
          </button>
          <button type="button" className="btn subtle small" onClick={() => window.print()}>
            Print
          </button>
          <a className="btn subtle small" href={`/api/reports/${report.id}/pdf`}>
            Download PDF
          </a>
          <button type="button" className="btn small" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="panel report-error no-print">
          <strong>Couldn&apos;t regenerate:</strong> {error}
        </div>
      )}

      <article className="report-view panel">
        {sections.map((s) => (
          <section key={s.heading} className="report-section">
            <h2>{s.heading}</h2>
            <div className="report-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.body}</ReactMarkdown>
            </div>
            {SECTION_DATA_COMPONENT[s.heading]?.(report.inputSnapshot)}
          </section>
        ))}
      </article>
    </div>
  );
}
