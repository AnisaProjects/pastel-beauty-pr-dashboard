"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";

import "@/components/charts/chartSetup";
import type { MonthlyTrendRow } from "@/lib/aggregations";

export default function MonthlyTrendChart({ rows }: { rows: MonthlyTrendRow[] }) {
  const { labels, sends, units } = useMemo(
    () => ({
      labels: rows.map((r) => {
        const d = new Date(r.month + "T00:00:00");
        return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      }),
      sends: rows.map((r) => r.sends),
      units: rows.map((r) => r.units),
    }),
    [rows],
  );

  if (rows.length === 0) {
    return <div className="empty-note">No dated sends available</div>;
  }

  return (
    <div className="canvas-box">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Sends",
              data: sends,
              borderColor: "#DD7C99",
              backgroundColor: "rgba(221,124,153,0.10)",
              fill: true,
              tension: 0.3,
              yAxisID: "y",
            },
            {
              label: "Units",
              data: units,
              borderColor: "#D3A968",
              backgroundColor: "rgba(211,169,104,0.10)",
              fill: true,
              tension: 0.3,
              yAxisID: "y1",
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14 } } },
          scales: {
            y: { position: "left", title: { display: true, text: "Sends" }, grid: { color: "#F7ECEB" } },
            y1: { position: "right", title: { display: true, text: "Units" }, grid: { drawOnChartArea: false } },
          },
        }}
      />
    </div>
  );
}
