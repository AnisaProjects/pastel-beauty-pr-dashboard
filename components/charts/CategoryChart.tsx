"use client";

import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";

import "./chartSetup";
import { colorForCategory } from "@/lib/categoryColors";
import type { PrRecord } from "@/lib/types";

export default function CategoryChart({ filtered, categories }: { filtered: PrRecord[]; categories: string[] }) {
  const entries = useMemo(() => {
    const sums: Record<string, number> = {};
    categories.forEach((c) => (sums[c] = 0));
    filtered.forEach((r) => {
      r.products.forEach((p) => {
        sums[p.category] = (sums[p.category] || 0) + p.quantity;
      });
    });
    return Object.keys(sums).filter((c) => sums[c] > 0).map((c) => [c, sums[c]] as const);
  }, [filtered, categories]);

  if (entries.length === 0) {
    return <div className="empty-note">No product data in this selection</div>;
  }

  return (
    <Doughnut
      data={{
        labels: entries.map((e) => e[0]),
        datasets: [
          {
            data: entries.map((e) => e[1]),
            backgroundColor: entries.map((e) => colorForCategory(e[0])),
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
  );
}
