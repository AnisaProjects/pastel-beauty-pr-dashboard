"use client";

import { useMemo } from "react";

import { fmtNum, norm } from "@/lib/format";
import type { PrRecord } from "@/lib/types";

const ICONS = [
  <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>,
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>,
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>,
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>,
  <svg key="4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>,
];

export default function KpiStrip({
  filtered,
  fyCountAll,
  selectedFyCount,
}: {
  filtered: PrRecord[];
  fyCountAll: number;
  selectedFyCount: number;
}) {
  const { values, subs } = useMemo(() => {
    const sends = filtered.length;
    const units = filtered.reduce((s, r) => s + (r.totalQty || 0), 0);
    const namedRecords = filtered.filter((r) => r.name && norm(r.name) !== "");
    const uniqueNames = new Set(namedRecords.map((r) => norm(r.name)));
    const counts: Record<string, number> = {};
    namedRecords.forEach((r) => {
      const k = norm(r.name);
      counts[k] = (counts[k] || 0) + 1;
    });
    const repeatCount = Object.keys(counts).filter((k) => counts[k] >= 2).length;
    const avg = sends ? units / sends : 0;

    const values = [sends, units, uniqueNames.size, repeatCount, avg];
    const subs = [
      selectedFyCount < fyCountAll ? "in selected years" : "across all fiscal years",
      sends ? fmtNum(avg) + " avg per send" : "",
      "exact-name match",
      "sent to ≥2 times",
      "",
    ];

    return { values, subs };
  }, [filtered, fyCountAll, selectedFyCount]);

  const labels = ["PR sends", "Total units sent", "Unique recipients", "Repeat customers", "Avg units / send"];

  return (
    <div className="kpis">
      {labels.map((lbl, i) => (
        <div className="kpi" key={lbl}>
          <div className={`kpi-icon kpi-icon${i}`}>{ICONS[i]}</div>
          <div className="num">{fmtNum(values[i])}</div>
          <div className="lbl">{lbl}</div>
          <div className="sub">{subs[i]}</div>
        </div>
      ))}
    </div>
  );
}
