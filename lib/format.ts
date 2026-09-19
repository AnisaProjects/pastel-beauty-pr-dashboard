// Small formatting helpers ported 1:1 from the original dashboard's
// fmtDate/fmtNum/escapeHtml (escapeHtml is unnecessary in React — JSX escapes
// text content automatically — so only fmtDate/fmtNum/norm are kept here).

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtNum(n: number | null | undefined): string {
  const v = n || 0;
  return Math.round(v) === v ? v.toLocaleString() : (Math.round(v * 10) / 10).toLocaleString();
}

export function norm(name: string | null | undefined): string {
  return (name || "").toString().trim().toLowerCase();
}
