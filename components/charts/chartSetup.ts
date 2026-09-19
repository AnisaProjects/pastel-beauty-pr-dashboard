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
ChartJS.defaults.color = "#8C7378";

export { ChartJS };
