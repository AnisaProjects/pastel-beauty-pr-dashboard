import type { ProductLine } from "@/lib/types";

export type PrValueLine = ProductLine & {
  productName: string;
  unitPrice: number | null;
  subtotal: number | null;
};

export type PrValuation = {
  lines: PrValueLine[];
  totalQty: number;
  totalValue: number | null;
  complete: boolean;
};

type PricedProduct = { name: string; unitPrice: number };

// Official NPR prices transcribed from the user's Price list.xlsx. The key is
// the category/shade identity already stored on each database line item.
const PRICE_CATALOG: Record<string, PricedProduct> = {};

function add(category: string, shades: [string, string, number][]) {
  for (const [storedShade, officialName, unitPrice] of shades) {
    PRICE_CATALOG[`${category}::${storedShade}`] = { name: officialName, unitPrice };
  }
}

add("Bisou-Lipstick", [
  ["ROSE", "Lipstick - ROSE 01", 650],
  ["ORCHID", "Lipstick - ORCHID 02", 650],
  ["VIOLET", "Lipstick - VIOLET 03", 650],
  ["LILY", "Lipstick - LILY 04", 650],
  ["TULIP", "Lipstick - TULIP 05", 650],
  ["DAISY", "Lipstick - DAISY 06", 650],
  ["PEONY", "Lipstick - PEONY 07", 650],
  ["IRIS", "Lipstick - IRIS 08", 650],
  ["JASMINE", "Lipstick - JASMINE 09", 650],
  ["POPPY", "Lipstick - POPPY 10", 650],
  ["Dhalia", "Lipstick-Dahlia", 650],
  ["Magnolia", "Lipstick-Magnolia", 650],
  ["Marigold", "Lipstick-Marigold", 650],
  ["Hydrangea", "Lipstick-Hydrangea", 650],
  ["Freesia", "Lipstick-Freesia", 650],
  ["Carnation", "Lipstick-Carnation", 650],
  ["Pansy", "Lipstick-Pansy", 650],
  ["Buttercup", "Lipstick-Buttercup", 650],
]);

add("Bisou-Lip Liner", [
  ["ROSE", "Lip Liner - ROSE 01", 450],
  ["ORCHID", "Lip Liner - ORCHID 02", 450],
  ["VIOLET", "Lip Liner - VIOLET 03", 450],
  ["LILY", "Lip Liner - LILY 04", 450],
  ["TULIP", "Lip Liner - TULIP 05", 450],
  ["DAISY", "Lip Liner - DAISY 06", 450],
  ["PEONY", "Lip Liner - PEONY 07", 450],
  ["IRIS", "Lip Liner - IRIS 08", 450],
  ["JASMINE", "Lip Liner - JASMINE 09", 450],
  ["POPPY", "Lip Liner - POPPY 10", 450],
]);

add("Bisou-Plumping Lipliner", [
  ["Brown Sugar", "Lip Liner- Brown Sugar", 490],
  ["Brown Mocha", "Lip Liner- Brown Mocha", 490],
  ["Deep Down", "Lip Liner-Deep Down", 490],
  ["Cyra", "Lip Liner- Cyra", 490],
  ["Choco Butter", "Lip Liner- Choco Butter", 490],
  ["Rose wood", "Lip Liner- Rosewood", 490],
  ["Rose Mauve", "Lip Liner -Rose Mauve", 490],
  ["Black Cherry", "Lip Liner- Black Cherry", 490],
]);

add("Pastel Beauty Blush", [
  ["Golden Hour", "Golden Hour", 1490],
  ["Wild Rose", "Wild Rose", 1490],
  ["Dewy Balm", "Dewy Balm", 1490],
  ["Blossom", "Blossom Glow", 1490],
  ["Cherry Amour", "Cherry Amour", 1490],
]);

add("Kajal/Brush set", [
  ["Kajol", "Kajal", 450],
  ["Brushset", "10 Set Brush", 2490],
  ["Duo brush", "Flawless Duo", 950],
]);

export function calculatePrValue(products: ProductLine[]): PrValuation {
  const lines = products.map((product) => {
    const match = PRICE_CATALOG[`${product.category}::${product.shade}`];
    return {
      ...product,
      productName: match?.name ?? `${product.shade} (${product.category})`,
      unitPrice: match?.unitPrice ?? null,
      subtotal: match ? match.unitPrice * product.quantity : null,
    };
  });
  const complete = lines.length > 0 && lines.every((line) => line.unitPrice !== null);
  return {
    lines,
    totalQty: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalValue: complete ? lines.reduce((sum, line) => sum + (line.subtotal ?? 0), 0) : null,
    complete,
  };
}
