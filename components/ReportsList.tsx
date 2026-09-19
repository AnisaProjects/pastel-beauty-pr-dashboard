"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchReports, generateReport } from "@/lib/api-client";
import type { ReportSummary, ReportType } from "@/lib/types";

function fmtGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReportsList() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>("ai");

  const load = useCallback(async () => {
    try {
      const list = await fetchReports();
      setReports(list);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load reports");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const report = await generateReport(reportType);
      router.push(`/reports/${report.id}`);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate report");
      setGenerating(false);
    }
  }

  return (
    <div className="wrap">
      <div className="panel reports-toolbar">
        <div>
          <h2>Reports</h2>
          <p>
            Management reports generated from your real PR data: an executive summary, fiscal-year performance,
            sending trends, top recipients, and product/shade breakdowns — grounded strictly in the same numbers as
            the dashboard.
          </p>
        </div>
        <div className="report-generate-controls">
          <div className="chip-group" role="group" aria-label="Report type">
            <button
              type="button"
              className={`chip${reportType === "ai" ? " active" : ""}`}
              onClick={() => setReportType("ai")}
            >
              AI report
            </button>
            <button
              type="button"
              className={`chip${reportType === "standard" ? " active" : ""}`}
              onClick={() => setReportType("standard")}
            >
              Standard report
            </button>
          </div>
          <p className="report-type-hint">
            {reportType === "ai"
              ? "Written by AI from your real data. May be slower, or unavailable if usage limits are hit."
              : "Instant, generated directly from your data with no AI call — a reliable fallback."}
          </p>
          <button type="button" className="btn" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating…" : "Generate report"}
          </button>
        </div>
      </div>

      {genError && (
        <div className="panel report-error">
          <strong>Couldn&apos;t generate report:</strong> {genError}
        </div>
      )}

      {loadError && (
        <div className="panel report-error">
          <strong>Couldn&apos;t load reports:</strong> {loadError}
        </div>
      )}

      {reports === null && !loadError && (
        <div className="panel placeholder-panel">
          <h2>Loading…</h2>
        </div>
      )}

      {reports !== null && reports.length === 0 && (
        <div className="panel placeholder-panel">
          <h2>No reports yet</h2>
          <p>Generate your first report to see an executive summary and breakdowns of your PR sending data.</p>
        </div>
      )}

      {reports !== null && reports.length > 0 && (
        <div className="panel reports-list">
          {reports.map((r) => (
            <a key={r.id} className="report-card" href={`/reports/${r.id}`}>
              <div>
                <div className="report-card-date">
                  {fmtGeneratedAt(r.generatedAt)}{" "}
                  <span className={`badge ${r.reportType === "ai" ? "ai" : "standard"}`}>
                    {r.reportType === "ai" ? "AI" : "Standard"}
                  </span>
                </div>
                <div className="report-card-meta">
                  Model: {r.model} · Status: {r.status}
                </div>
              </div>
              <span className="report-card-link">View report →</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
