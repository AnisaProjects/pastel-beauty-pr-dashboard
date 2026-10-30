import type { ShadeRow } from "@/lib/aggregations";
import { fmtNum } from "@/lib/format";

export default function ShadeBreakdownTable({ rows }: { rows: ShadeRow[] }) {
  if (rows.length === 0) return <div className="empty-note">No product line data available</div>;
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Shade</th>
            <th className="num">Units</th>
            <th className="num">PR value (NPR)</th>
            <th className="num">Unpriced lines</th>
            <th className="num">% of Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.category}::${r.shade}`}>
              <td>{r.category}</td>
              <td>{r.shade}</td>
              <td className="num">{fmtNum(r.units)}</td>
              <td className="num">{r.prValueNpr === undefined ? "—" : fmtNum(r.prValueNpr)}</td>
              <td className="num">{r.unpricedProductLines === undefined ? "—" : fmtNum(r.unpricedProductLines)}</td>
              <td className="num">{r.pctOfTotal.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
