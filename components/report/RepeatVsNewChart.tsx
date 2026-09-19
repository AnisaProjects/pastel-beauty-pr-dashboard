"use client";

import { Bar } from "react-chartjs-2";

import "@/components/charts/chartSetup";
import type { RepeatRow } from "@/lib/aggregations";

export default function RepeatVsNewChart({ rows }: { rows: RepeatRow[] }) {
  if (rows.length === 0) {
    return <div className="empty-note">No repeat-recipient data available</div>;
  }

  return (
    <div className="canvas-box">
      <Bar
        data={{
          labels: rows.map((r) => `FY ${r.fiscalYear}`),
          datasets: [
            { label: "New", data: rows.map((r) => r.newSends), backgroundColor: "#F1DFE1", borderRadius: 4 },
            { label: "Repeat", data: rows.map((r) => r.repeatSends), backgroundColor: "#DD7C99", borderRadius: 4 },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, grid: { color: "#F7ECEB" } },
          },
          plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14 } } },
        }}
      />
    </div>
  );
}
