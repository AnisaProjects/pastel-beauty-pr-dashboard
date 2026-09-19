// Stage 2 placeholder — view/print/download a single generated report.
export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="wrap">
      <div className="panel placeholder-panel">
        <h2>Report #{id} — coming soon</h2>
        <p>Viewing, printing, and downloading generated reports as PDF arrives in a later stage.</p>
      </div>
    </div>
  );
}
