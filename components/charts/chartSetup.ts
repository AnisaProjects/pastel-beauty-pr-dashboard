import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

import type { Theme } from "@/lib/theme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

ChartJS.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
ChartJS.defaults.font.size = 11.5;

export { ChartJS };

// Chart.js draws on <canvas>, so it can't pick up CSS custom properties the
// way the rest of the UI does — every theme-sensitive value it needs (axis
// text, gridlines, the thin border between doughnut segments, tooltip
// chrome) has to be resolved to a literal color ahead of time. Kept in one
// place, in sync with the --ink-soft / --chart-grid / --panel values in
// app/globals.css, so a chart re-renders correctly whichever theme is active
// when the component calls this from useTheme().
export function chartTheme(theme: Theme) {
  const dark = theme === "dark";
  return {
    text: dark ? "#c9adb3" : "#8c7378",
    grid: dark ? "rgba(255,255,255,0.08)" : "#f7ecea",
    doughnutBorder: dark ? "#241a1e" : "#ffffff",
  };
}
