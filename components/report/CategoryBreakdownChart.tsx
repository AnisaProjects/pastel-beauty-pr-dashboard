"use client";

import { Doughnut } from "react-chartjs-2";

import "@/components/charts/chartSetup";
import { colorForCategory } from "@/lib/categoryColors";
import type { CategoryRow } from "@/lib/aggregations";

export default function CategoryBreakdownChart({ rows }: { rows: CategoryRow[] }) {
  if (rows.length === 0) {
    return <div className="empty-note">No product data available</div>;
  }

  return (
    <div className="canvas-box">
      <Doughnut
        data={{
          labels: rows.map((r) => `${r.category} (${r.pctOfTotal.toFixed(1)}%)`),
          datasets: [
            {
              data: rows.map((r) => r.units),
              backgroundColor: rows.map((r) => colorForCategory(r.category)),
              borderWidth: 2,
              borderColor: "#fff",
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "58%",
          plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 12, font: { size: 11 } } } },
        }}
      />
    </div>
  );
}
