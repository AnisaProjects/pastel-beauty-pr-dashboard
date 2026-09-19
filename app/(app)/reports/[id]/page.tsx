import Link from "next/link";

import ReportView from "@/components/ReportView";
import { getReport } from "@/lib/reports";
import type { ReportAggregates } from "@/lib/aggregations";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);

  const row = Number.isInteger(id) && id > 0 ? await getReport(id) : null;

  if (!row) {
    return (
      <div className="wrap">
        <div className="panel placeholder-panel">
          <h2>Report #{idStr} not found</h2>
          <p>
            It may have been generated on a different environment, or the id is invalid.{" "}
            <Link href="/reports">Back to reports</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <ReportView
      report={{
        id: row.id,
        generatedAt: row.generatedAt.toISOString(),
        generatedBy: row.generatedBy,
        model: row.model,
        status: row.status,
        contentMd: row.contentMd,
        inputSnapshot: row.inputSnapshot as ReportAggregates,
      }}
    />
  );
}
