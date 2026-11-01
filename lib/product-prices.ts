import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { ProductPrice } from "@/lib/pr-pricing";

export class ProductPriceError extends Error {}

export type ProductPriceInput = {
  category: string;
  shade: string;
  productName: string;
  unitPriceNpr: number;
};

function validatePrice(input: ProductPriceInput): ProductPriceInput {
  const category = input.category.trim();
  const shade = input.shade.trim();
  const productName = input.productName.trim();
  if (!category) throw new ProductPriceError("Category is required.");
  if (!shade) throw new ProductPriceError("Product or shade is required.");
  if (!productName) throw new ProductPriceError("Official product name is required.");
  if (!Number.isSafeInteger(input.unitPriceNpr) || input.unitPriceNpr <= 0) {
    throw new ProductPriceError("Unit price must be a positive whole number of NPR.");
  }
  return { category, shade, productName, unitPriceNpr: input.unitPriceNpr };
}

function toProductPrice(row: typeof schema.productPrices.$inferSelect): ProductPrice {
  return {
    id: row.id,
    category: row.category,
    shade: row.shade,
    productName: row.productName,
    unitPriceNpr: row.unitPriceNpr,
  };
}

export async function listProductPrices(): Promise<ProductPrice[]> {
  const rows = await db
    .select()
    .from(schema.productPrices)
    .orderBy(asc(schema.productPrices.category), asc(schema.productPrices.shade));
  return rows.map(toProductPrice);
}

export async function createProductPrice(
  rawInput: ProductPriceInput,
  updatedBy: string,
): Promise<ProductPrice> {
  const input = validatePrice(rawInput);
  try {
    const [row] = await db.insert(schema.productPrices).values({ ...input, updatedBy }).returning();
    return toProductPrice(row);
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      throw new ProductPriceError("A price already exists for this category and product/shade.");
    }
    throw error;
  }
}

export async function updateProductPrice(
  id: number,
  rawInput: Pick<ProductPriceInput, "productName" | "unitPriceNpr">,
  updatedBy: string,
): Promise<ProductPrice> {
  const productName = rawInput.productName.trim();
  if (!productName) throw new ProductPriceError("Official product name is required.");
  if (!Number.isSafeInteger(rawInput.unitPriceNpr) || rawInput.unitPriceNpr <= 0) {
    throw new ProductPriceError("Unit price must be a positive whole number of NPR.");
  }

  const [row] = await db
    .update(schema.productPrices)
    .set({ productName, unitPriceNpr: rawInput.unitPriceNpr, updatedBy, updatedAt: new Date() })
    .where(eq(schema.productPrices.id, id))
    .returning();
  if (!row) throw new ProductPriceError("Product price not found.");
  return toProductPrice(row);
}
