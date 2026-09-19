"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";

import "./chartSetup";
import { colorForCategory } from "@/lib/categoryColors";
import type { PrRecord } from "@/lib/types";

export default function ShadesChart({ filtered }: { filtered: PrRecord[] }) {
  const entries = useMemo(() => {
    const sums: Record<string, number> = {};
    const catOf: Record<string, string> = {};
    filtered.forEach((r) => {
      r.products.forEach((p) => {
        const label = p.shade + " (" + p.category.replace("Bisou-", "") + ")";
        sums[label] = (sums[label] || 0) + p.quantity;
        catOf[label] = p.category;
      });
    });
    return Object.keys(sums)
      .map((k) => [k, sums[k]] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([label, qty]) => ({ label, qty, category: catOf[label] }));
  }, [filtered]);

  if (entries.length === 0) {
    return <div className="empty-note">No product data in this selection</div>;
  }

  return (
    <Bar
      data={{
        labels: entries.map((e) => e.label),
        datasets: [
          {
            data: entries.map((e) => e.qty),
            backgroundColor: entries.map((e) => colorForCategory(e.category)),
            borderRadius: 3,
          },
        ],
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
