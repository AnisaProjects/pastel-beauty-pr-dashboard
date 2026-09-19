"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";

import "./chartSetup";
import { norm } from "@/lib/format";
import type { PrRecord } from "@/lib/types";

export default function RecipientsChart({ filtered }: { filtered: PrRecord[] }) {
  const entries = useMemo(() => {
    const sums: Record<string, { label: string; units: number }> = {};
    filtered.forEach((r) => {
      if (!r.name || norm(r.name) === "") return;
      const k = norm(r.name);
      if (!sums[k]) sums[k] = { label: r.name.trim(), units: 0 };
      sums[k].units += r.totalQty || 0;
    });
    return Object.values(sums)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);
  }, [filtered]);

  if (entries.length === 0) {
    return <div className="empty-note">No named recipients in this selection</div>;
  }

  return (
    <Bar
      data={{
        labels: entries.map((e) => e.label),
        datasets: [{ data: entries.map((e) => e.units), backgroundColor: "#A98BC7", borderRadius: 3 }],
      }}
      options={{
        indexAxis: "y" as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: "#F7ECEB" } }, y: { grid: { display: false } } },
      }}
    />
  );
}
