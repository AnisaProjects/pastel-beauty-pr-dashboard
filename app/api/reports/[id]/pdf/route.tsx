import { renderToBuffer } from "@react-pdf/renderer";

import { ReportPdfDocument } from "@/lib/pdf";
import { getReport } from "@/lib/reports";
import type { ReportAggregates } from "@/lib/aggregations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { params: Promise<{ id: string }> };

function parseId(idStr: string): number | null {
  const id = Number(idStr);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: Request, { params }: Params) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (id === null) return new Response("Invalid id", { status: 400 });

  const row = await getReport(id);
  if (!row) return new Response("Report not found", { status: 404 });

  const buffer = await renderToBuffer(
    <ReportPdfDocument
      report={{
        id: row.id,
        generatedAt: row.generatedAt,
        model: row.model,
        contentMd: row.contentMd,
        inputSnapshot: row.inputSnapshot as ReportAggregates,
      }}
    />,
  );

  const dateStr = row.generatedAt.toISOString().slice(0, 10);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pastel-beauty-pr-report-${dateStr}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
