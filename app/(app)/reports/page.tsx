// Stage 2 placeholder. The real report-history + "Generate report" UI lands
// here once /api/reports exists (aggregations + OpenAI prompt pipeline).
export default function ReportsPage() {
  return (
    <div className="wrap">
      <div className="panel placeholder-panel">
        <h2>AI reports — coming soon</h2>
        <p>
          Management reports generated from your real PR data will show up here: an executive summary,
          fiscal-year performance, sending trends, top recipients, and product/shade breakdowns — grounded
          strictly in the same numbers as the dashboard.
        </p>
      </div>
    </div>
  );
}
