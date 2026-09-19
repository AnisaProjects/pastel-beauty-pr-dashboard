import type { FiscalYearRow } from "@/lib/aggregations";
import { fmtNum } from "@/lib/format";

function pct(n: number | null): string {
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export default function FyPerformanceTable({ rows }: { rows: FiscalYearRow[] }) {
  if (rows.length === 0) return <div className="empty-note">No fiscal-year data available</div>;
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th>Fiscal Year</th>
          <th className="num">Sends</th>
          <th className="num">Units</th>
          <th className="num">vs. Prior FY</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.fiscalYear}>
            <td>FY {r.fiscalYear}</td>
            <td className="num">{fmtNum(r.sends)}</td>
            <td className="num">{fmtNum(r.units)}</td>
            <td className="num">{pct(r.unitsChangePct)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
