// Port of CAT_COLORS / colorForCategory from the original dashboard.
const CAT_COLORS: Record<string, string> = {
  "Bisou-Lipstick": "#DD7C99",
  "Bisou-Lip Liner": "#A98BC7",
  "Bisou-Plumping Lipliner": "#D9A0BE",
  "Pastel Beauty Blush": "#F0A8B8",
  "Kajal/Brush set": "#8CA687",
};

export function colorForCategory(category: string): string {
  return CAT_COLORS[category] || "#C7A5B8";
}
