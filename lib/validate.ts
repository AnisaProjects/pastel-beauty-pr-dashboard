import { adToBs } from "@/lib/nepali-date";
import type { PrRecordInput } from "@/lib/types";

export class ValidationError extends Error {}

// Hand-rolled validation (no extra dependency) for the PR record write
// payload. Throws ValidationError with a human-readable message on the first
// problem found.
export function parsePrRecordInput(body: unknown): PrRecordInput {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;

  const fy = typeof b.fy === "string" ? b.fy.trim() : "";
  if (!fy) throw new ValidationError("Fiscal year (fy) is required.");

  const date = typeof b.date === "string" ? b.date.trim() : "";
  if (!date) throw new ValidationError("Date sent (date) is required.");

  const productsRaw = Array.isArray(b.products) ? b.products : [];
  const products = productsRaw.map((p, i) => {
    if (!p || typeof p !== "object") throw new ValidationError(`products[${i}] must be an object.`);
    const line = p as Record<string, unknown>;
    const category = typeof line.category === "string" ? line.category.trim() : "";
    const shade = typeof line.shade === "string" ? line.shade.trim() : "";
    const quantity = Number(line.quantity);
    if (!category || !shade) throw new ValidationError(`products[${i}] needs both category and shade.`);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ValidationError(`products[${i}].quantity must be a positive number.`);
    }
    return { category, shade, quantity };
  });

  // The dashboard form derives the BS date from the English date. For any
  // other caller (JSON import, API) that leaves it blank, fill it in here so
  // every stored row has one. An explicitly supplied value is never overwritten
  // — legacy rows keep whatever the source workbook had.
  const suppliedBsDate = typeof b.bsDate === "string" ? b.bsDate.trim() : "";

  return {
    fy,
    date,
    bsDate: suppliedBsDate || adToBs(date)?.iso || null,
    name: typeof b.name === "string" ? b.name.trim() || null : null,
    address: typeof b.address === "string" ? b.address.trim() || null : null,
    phone: typeof b.phone === "string" ? b.phone.trim() || null : null,
    isTest: !!b.isTest,
    notes: typeof b.notes === "string" ? b.notes.trim() || null : null,
    products,
  };
}
