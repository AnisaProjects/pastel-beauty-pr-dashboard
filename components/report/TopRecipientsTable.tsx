import type { TopRecipientRow } from "@/lib/aggregations";
import { fmtNum } from "@/lib/format";

export default function TopRecipientsTable({ rows }: { rows: TopRecipientRow[] }) {
  if (rows.length === 0) return <div className="empty-note">No named recipients available</div>;
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th>Recipient</th>
          <th className="num">Sends</th>
          <th className="num">Units</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td className="num">{fmtNum(r.sends)}</td>
            <td className="num">{fmtNum(r.units)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
