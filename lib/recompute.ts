import { norm } from "@/lib/format";
import type { PrRecord } from "@/lib/types";

// Port of the original dashboard's recomputeDerived(): sendNum/isRepeat are
// never stored — they're recomputed at read time by grouping records by
// (fiscal_year, normalized recipient name) and ordering by date, exactly like
// the static dashboard did. Run this once over the full fetched record set.
export function recomputeDerived(records: PrRecord[]): void {
  const groups: Record<string, PrRecord[]> = {};
  records.forEach((r) => {
    if (!r.name || norm(r.name) === "") return;
    const key = r.fy + "||" + norm(r.name);
    (groups[key] ||= []).push(r);
  });
  Object.values(groups).forEach((arr) => {
    arr.sort((a, b) => {
      const da = a.date || "";
      const db = b.date || "";
      if (da < db) return -1;
      if (da > db) return 1;
      return (a.id || 0) - (b.id || 0);
    });
    arr.forEach((r, idx) => {
      r.sendNum = idx + 1;
      r.isRepeat = idx >= 1;
    });
  });
}
