import type { PrRecord } from "@/lib/types";

// Port of exportCsv()/downloadBlob() from the original dashboard — same
// columns, same behavior, client-side only.
const CSV_COLUMNS: (keyof PrRecord)[] = [
  "date",
  "bsDate",
  "fy",
  "name",
  "address",
  "phone",
  "isTest",
  "totalQty",
  "sendNum",
  "isRepeat",
];

export function downloadBlob(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCsv(records: PrRecord[]): void {
  const lines = [CSV_COLUMNS.join(",")];
  records.forEach((r) => {
    const row = CSV_COLUMNS.map((c) => {
      let v: unknown = r[c];
      if (v === null || v === undefined) v = "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    });
    lines.push(row.join(","));
  });
  downloadBlob(lines.join("\n"), "text/csv", "pr_sends_filtered.csv");
}
