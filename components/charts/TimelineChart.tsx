"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";

import "./chartSetup";
import type { PrRecord } from "@/lib/types";

export default function TimelineChart({ filtered }: { filtered: PrRecord[] }) {
  const { labels, sends, units } = useMemo(() => {
    const byMonth: Record<string, { sends: number; units: number }> = {};
    filtered.forEach((r) => {
      if (!r.date) return;
      const m = r.date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { sends: 0, units: 0 };
      byMonth[m].sends++;
      byMonth[m].units += r.totalQty || 0;
    });
    const months = Object.keys(byMonth).sort();
    return {
      labels: months.map((m) => {
        const d = new Date(m + "-02");
        return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      }),
      sends: months.map((m) => byMonth[m].sends),
      units: months.map((m) => byMonth[m].units),
      months,
    };
  }, [filtered]);

  if (labels.length === 0) {
    return <div className="empty-note">No dated sends in this selection</div>;
  }

  return (
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
  );
}
