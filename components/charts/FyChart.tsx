"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";

import { chartTheme } from "./chartSetup";
import { useTheme } from "@/components/ThemeProvider";
import type { PrRecord } from "@/lib/types";

export default function FyChart({ filtered, activeFys }: { filtered: PrRecord[]; activeFys: string[] }) {
  const { theme } = useTheme();
  const ct = chartTheme(theme);
  const { labels, sends, units } = useMemo(() => {
    const sendsBy: Record<string, number> = {};
    const unitsBy: Record<string, number> = {};
    activeFys.forEach((fy) => {
      sendsBy[fy] = 0;
      unitsBy[fy] = 0;
    });
    filtered.forEach((r) => {
      sendsBy[r.fy] = (sendsBy[r.fy] || 0) + 1;
      unitsBy[r.fy] = (unitsBy[r.fy] || 0) + (r.totalQty || 0);
    });
    return {
      labels: activeFys.map((f) => "FY " + f),
      sends: activeFys.map((f) => sendsBy[f]),
      units: activeFys.map((f) => unitsBy[f]),
    };
  }, [filtered, activeFys]);

  if (activeFys.length === 0) {
    return <div className="empty-note">No fiscal years selected</div>;
  }

  return (
    <Bar
      data={{
        labels,
        datasets: [
          { label: "PR sends", data: sends, backgroundColor: "#F1DFE1", borderRadius: 4, yAxisID: "y" },
          { label: "Total units", data: units, backgroundColor: "#DD7C99", borderRadius: 4, yAxisID: "y1" },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14, color: ct.text } } },
        scales: {
          y: {
            position: "left",
            title: { display: true, text: "Sends", color: ct.text },
            grid: { color: ct.grid },
            ticks: { color: ct.text },
          },
          y1: {
            position: "right",
            title: { display: true, text: "Units", color: ct.text },
            grid: { drawOnChartArea: false },
            ticks: { color: ct.text },
          },
          x: { ticks: { color: ct.text } },
        },
      }}
    />
  );
}
