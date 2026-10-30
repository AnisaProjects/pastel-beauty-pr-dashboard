// Server-side data access for pr_records / pr_record_products. Kept separate
// from the route handlers so the API routes stay thin.
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { PrRecord, PrRecordInput, ProductLine } from "@/lib/types";
import { calculatePrValue } from "@/lib/pr-pricing";

type ProductInput = { category: string; shade: string; quantity: number };

function sumQty(products: ProductInput[]): number {
  return products.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
}

function toIsoDateOnly(date: string): string {
  // Accepts "yyyy-mm-dd" or a full ISO datetime; stores date-only text,
  // matching the legacy field (which carried a "T00:00:00" suffix).
  return date.length > 10 ? date.slice(0, 10) : date;
}

function rowToClient(
  row: typeof schema.prRecords.$inferSelect,
  products: ProductLine[],
): PrRecord {
  return {
    id: row.id,
    fy: row.fiscalYear,
    date: row.sentDate,
    bsDate: row.bsDate,
    name: row.recipientName,
    address: row.address,
    phone: row.phone,
    isTest: row.isTest,
    notes: row.notes,
    totalQty: row.totalQty,
    products,
    valuation: calculatePrValue(products),
    isDeleted: row.isDeleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function attachProducts(
  rows: (typeof schema.prRecords.$inferSelect)[],
): Promise<PrRecord[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const productRows = await db
    .select()
    .from(schema.prRecordProducts)
    .where(inArray(schema.prRecordProducts.prRecordId, ids));

  const byRecord = new Map<number, ProductLine[]>();
  for (const p of productRows) {
    const list = byRecord.get(p.prRecordId) ?? [];
    list.push({ category: p.category, shade: p.shade, quantity: p.quantity });
    byRecord.set(p.prRecordId, list);
  }

  return rows.map((row) => rowToClient(row, byRecord.get(row.id) ?? []));
}

export async function listPrRecords(opts: { deleted?: boolean } = {}): Promise<PrRecord[]> {
  const rows = await db
    .select()
    .from(schema.prRecords)
    .where(eq(schema.prRecords.isDeleted, !!opts.deleted))
    .orderBy(desc(schema.prRecords.sentDate), asc(schema.prRecords.id));
  return attachProducts(rows);
}

export async function getPrRecord(id: number): Promise<PrRecord | null> {
  const [row] = await db.select().from(schema.prRecords).where(eq(schema.prRecords.id, id)).limit(1);
  if (!row) return null;
  const [record] = await attachProducts([row]);
  return record;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function replaceProducts(
  tx: Tx,
  prRecordId: number,
  products: ProductInput[],
): Promise<void> {
  await tx.delete(schema.prRecordProducts).where(eq(schema.prRecordProducts.prRecordId, prRecordId));
  // collapse duplicate category/shade lines (matches the legacy UI, which
  // summed quantities into a single "Category::Shade" key)
  const merged = new Map<string, ProductInput>();
  for (const p of products) {
    if (!p.category || !p.shade) continue;
    const qty = Number(p.quantity);
    if (!qty || qty <= 0) continue;
    const key = `${p.category}::${p.shade}`;
    const existing = merged.get(key);
    merged.set(key, { category: p.category, shade: p.shade, quantity: (existing?.quantity ?? 0) + qty });
  }
  const rows = Array.from(merged.values());
  if (rows.length > 0) {
    await tx.insert(schema.prRecordProducts).values(
      rows.map((p) => ({ prRecordId, category: p.category, shade: p.shade, quantity: p.quantity })),
    );
  }
}

export async function createPrRecord(input: PrRecordInput, userId: string | undefined): Promise<PrRecord> {
  return db.transaction(async (tx) => {
    const totalQty = sumQty(input.products);
    const [row] = await tx
      .insert(schema.prRecords)
      .values({
        fiscalYear: input.fy,
        sentDate: toIsoDateOnly(input.date),
        bsDate: input.bsDate || null,
        recipientName: input.name || null,
        address: input.address || null,
        phone: input.phone || null,
        isTest: !!input.isTest,
        notes: input.notes || null,
        totalQty,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    await replaceProducts(tx, row.id, input.products);
    const products = input.products
      .filter((p) => p.category && p.shade && Number(p.quantity) > 0)
      .map((p) => ({ category: p.category, shade: p.shade, quantity: Number(p.quantity) }));
    return rowToClient({ ...row, totalQty }, products);
  });
}

export async function updatePrRecord(
  id: number,
  input: PrRecordInput,
  userId: string | undefined,
): Promise<PrRecord | null> {
  return db.transaction(async (tx) => {
    const totalQty = sumQty(input.products);
    const [row] = await tx
      .update(schema.prRecords)
      .set({
        fiscalYear: input.fy,
        sentDate: toIsoDateOnly(input.date),
        bsDate: input.bsDate || null,
        recipientName: input.name || null,
        address: input.address || null,
        phone: input.phone || null,
        isTest: !!input.isTest,
        notes: input.notes || null,
        totalQty,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(schema.prRecords.id, id))
      .returning();
    if (!row) return null;
    await replaceProducts(tx, id, input.products);
    const products = input.products
      .filter((p) => p.category && p.shade && Number(p.quantity) > 0)
      .map((p) => ({ category: p.category, shade: p.shade, quantity: Number(p.quantity) }));
    return rowToClient(row, products);
  });
}

export async function softDeletePrRecord(id: number, userId: string | undefined): Promise<boolean> {
  const rows = await db
    .update(schema.prRecords)
    .set({ isDeleted: true, updatedBy: userId, updatedAt: new Date() })
    .where(and(eq(schema.prRecords.id, id), eq(schema.prRecords.isDeleted, false)))
    .returning({ id: schema.prRecords.id });
  return rows.length > 0;
}

export async function restorePrRecord(id: number, userId: string | undefined): Promise<boolean> {
  const rows = await db
    .update(schema.prRecords)
    .set({ isDeleted: false, updatedBy: userId, updatedAt: new Date() })
    .where(and(eq(schema.prRecords.id, id), eq(schema.prRecords.isDeleted, true)))
    .returning({ id: schema.prRecords.id });
  return rows.length > 0;
}

export async function bulkCreatePrRecords(
  inputs: PrRecordInput[],
  userId: string | undefined,
): Promise<{ inserted: number }> {
  let inserted = 0;
  for (const input of inputs) {
    if (!input || !input.fy || !input.date) continue;
    await createPrRecord(input, userId);
    inserted++;
  }
  return { inserted };
}

export async function getMeta(): Promise<{ categories: string[]; shadesByCategory: Record<string, string[]> }> {
  const rows = await db
    .selectDistinct({
      category: schema.prRecordProducts.category,
      shade: schema.prRecordProducts.shade,
    })
    .from(schema.prRecordProducts);

  const shadesByCategory: Record<string, string[]> = {};
  for (const r of rows) {
    const list = shadesByCategory[r.category] ?? (shadesByCategory[r.category] = []);
    if (!list.includes(r.shade)) list.push(r.shade);
  }
  const categories = Object.keys(shadesByCategory).sort();
  categories.forEach((c) => shadesByCategory[c].sort());
  return { categories, shadesByCategory };
}
