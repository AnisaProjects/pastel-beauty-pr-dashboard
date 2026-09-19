"use client";

import { useMemo } from "react";

import { fmtDate, fmtNum, norm } from "@/lib/format";
import type { PrRecord } from "@/lib/types";

type Group = {
  name: string;
  sends: number;
  units: number;
  fys: Set<string>;
  first: string | null;
  last: string | null;
  anyTest: boolean;
};

export default function Leaderboard({ filtered }: { filtered: PrRecord[] }) {
  const list = useMemo(() => {
    const groups: Record<string, Group> = {};
    filtered.forEach((r) => {
      if (!r.name || norm(r.name) === "") return;
      const k = norm(r.name);
      if (!groups[k]) {
        groups[k] = { name: r.name.trim(), sends: 0, units: 0, fys: new Set(), first: r.date, last: r.date, anyTest: false };
      }
      const g = groups[k];
      g.sends++;
      g.units += r.totalQty || 0;
      g.fys.add(r.fy);
      if (r.isTest) g.anyTest = true;
      if (r.date && (!g.first || r.date < g.first)) g.first = r.date;
      if (r.date && (!g.last || r.date > g.last)) g.last = r.date;
    });
    return Object.values(groups)
      .filter((g) => g.sends >= 2)
      .sort((a, b) => b.sends - a.sends || b.units - a.units);
  }, [filtered]);

  if (list.length === 0) {
    return <div className="empty-note">No repeat customers in this selection</div>;
  }

  return (
    <div className="leaderboard">
      {list.map((g, i) => (
        <div className="lb-card" key={g.name}>
          <div className="lb-rank">{i + 1}</div>
          <div className="lb-name">
            {g.name}
            {g.anyTest && <span className="badge test"> test</span>}
          </div>
          <div className="lb-stat">
            Sent to <b>{g.sends}×</b> · <b>{fmtNum(g.units)}</b> units total
          </div>
          <div className="lb-stat">Fiscal years: {Array.from(g.fys).sort().join(", ")}</div>
          <div className="lb-stat">
            {fmtDate(g.first)} → {fmtDate(g.last)}
          </div>
        </div>
      ))}
    </div>
  );
}
