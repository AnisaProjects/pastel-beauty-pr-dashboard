import type { ProductLine } from "@/lib/types";

export type ProductPrice = {
  id: number;
  category: string;
  shade: string;
  productName: string;
  unitPriceNpr: number;
};

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

export type PriceLookup = ReadonlyMap<string, ProductPrice>;

export function priceKey(category: string, shade: string): string {
  return `${category}::${shade}`;
}

export function makePriceLookup(prices: ProductPrice[]): PriceLookup {
  return new Map(prices.map((price) => [priceKey(price.category, price.shade), price]));
}

export function calculatePrValue(products: ProductLine[], prices: PriceLookup): PrValuation {
  const lines = products.map((product) => {
    const match = prices.get(priceKey(product.category, product.shade));
    return {
      ...product,
      productName: match?.productName ?? `${product.shade} (${product.category})`,
      unitPrice: match?.unitPriceNpr ?? null,
      subtotal: match ? match.unitPriceNpr * product.quantity : null,
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
