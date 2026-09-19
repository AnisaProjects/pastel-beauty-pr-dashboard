// Migrates the 179 legacy PR-send records into pr_records/pr_record_products.
//
// WHEN TO RUN THIS: once per environment, after POSTGRES_URL points at a real,
// migrated database (apply the SQL in drizzle/migrations first — e.g. via
// `npm run db:migrate`, or by running the .sql files yourself). It is not run
// automatically and does not run during `next build`.
//
//   npm run migrate:legacy:data
//
// It is safe to re-run in the sense that it always *inserts* new rows — it
// does not delete/upsert existing ones. Re-running it against a database that
// already has the legacy rows will duplicate them, so only run it once per
// environment (dev, then prod), and verify counts before/after (step 4 below).
//
// What it does (per the migration plan):
//   1. Reads scripts/legacy-data.json (produced by `npm run migrate:legacy:extract`
//      from the original pastel_beauty_pr_dashboard.html — already committed).
//   2. If the interim cloud-sync scaffold was ever actually used against this
//      database (a `pr_overlay_state` table exists with rows), applies its
//      baseEdits/baseDeletes onto the base records first (deleted rows are
//      inserted with is_deleted=true rather than dropped, so nothing is lost),
//      then appends its customEntries as additional records.
//   3. Inserts each record into pr_records (fy -> fiscal_year, date -> sent_date,
//      bsDate -> bs_date, name -> recipient_name, etc.) and explodes its
//      products map ("Category::Shade" -> qty) into pr_record_products rows.
//      sendNum/isRepeat are NOT migrated — the app recomputes them at read time.
//   4. Prints a per-fiscal-year count(*) / sum(total_qty) summary so you can
//      compare it against what the dashboard currently displays before cutting
//      production over.
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { sql } from "@vercel/postgres";

import { db, schema } from "../lib/db";

type LegacyRecord = {
  fy: string;
  date: string | null;
  bsDate: string | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  isTest?: boolean;
  notes: string | null;
  totalQty?: number;
  products?: Record<string, number>;
};

type LegacyData = {
  categories: string[];
  shadesByCategory: Record<string, string[]>;
  records: LegacyRecord[];
};

const LEGACY_JSON_PATH = path.resolve(__dirname, "legacy-data.json");

const OVERLAY_KEYS = {
  custom: "pastelBeautyPR_customEntries_v1",
  edits: "pastelBeautyPR_baseEdits_v1",
  deletes: "pastelBeautyPR_baseDeletes_v1",
};

function toIsoDateOnly(date: string | null): string | null {
  if (!date) return null;
  return date.length > 10 ? date.slice(0, 10) : date;
}

async function loadOverlayState(): Promise<{
  customEntries: LegacyRecord[];
  baseEdits: Record<number, Partial<LegacyRecord>>;
  baseDeletes: number[];
}> {
  const empty = { customEntries: [] as LegacyRecord[], baseEdits: {} as Record<number, Partial<LegacyRecord>>, baseDeletes: [] as number[] };
  try {
    const check = await sql`SELECT to_regclass('public.pr_overlay_state') as reg`;
    if (!check.rows[0]?.reg) return empty; // table doesn't exist — interim scaffold was never used here
    const { rows } = await sql`SELECT key, value FROM pr_overlay_state`;
    if (rows.length === 0) return empty;
    const byKey: Record<string, unknown> = {};
    rows.forEach((r) => (byKey[r.key as string] = r.value));
    return {
      customEntries: (byKey[OVERLAY_KEYS.custom] as LegacyRecord[]) || [],
      baseEdits: (byKey[OVERLAY_KEYS.edits] as Record<number, Partial<LegacyRecord>>) || {},
      baseDeletes: (byKey[OVERLAY_KEYS.deletes] as number[]) || [],
    };
  } catch {
    return empty; // pr_overlay_state not reachable/doesn't exist — fine, nothing to apply
  }
}

async function insertRecord(rec: LegacyRecord, isDeleted: boolean) {
  const products = rec.products || {};
  const lines = Object.entries(products)
    .map(([key, qty]) => {
      const sep = key.indexOf("::");
      if (sep === -1) return null;
      return { category: key.slice(0, sep), shade: key.slice(sep + 2), quantity: Math.round(Number(qty)) };
    })
    .filter((l): l is { category: string; shade: string; quantity: number } => !!l && l.quantity > 0);

  const totalQty =
    typeof rec.totalQty === "number" ? rec.totalQty : lines.reduce((s, l) => s + l.quantity, 0);

  const [row] = await db
    .insert(schema.prRecords)
    .values({
      fiscalYear: rec.fy,
      sentDate: toIsoDateOnly(rec.date),
      bsDate: rec.bsDate || null,
      recipientName: rec.name || null,
      address: rec.address || null,
      phone: rec.phone || null,
      isTest: !!rec.isTest,
      notes: rec.notes || null,
      totalQty,
      isDeleted,
    })
    .returning({ id: schema.prRecords.id });

  if (lines.length > 0) {
    await db.insert(schema.prRecordProducts).values(
      lines.map((l) => ({ prRecordId: row.id, category: l.category, shade: l.shade, quantity: l.quantity })),
    );
  }
}

async function main() {
  if (!fs.existsSync(LEGACY_JSON_PATH)) {
    throw new Error(
      `${LEGACY_JSON_PATH} not found. Run \`npm run migrate:legacy:extract\` first (while pastel_beauty_pr_dashboard.html still exists), or restore scripts/legacy-data.json from git history.`,
    );
  }
  const data = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, "utf8")) as LegacyData;
  console.log(`Loaded ${data.records.length} base records from legacy-data.json`);

  const overlay = await loadOverlayState();
  const hasOverlay =
    overlay.customEntries.length > 0 || Object.keys(overlay.baseEdits).length > 0 || overlay.baseDeletes.length > 0;
  if (hasOverlay) {
    console.log(
      `Applying interim cloud-sync overlay: ${overlay.customEntries.length} custom entries, ` +
        `${Object.keys(overlay.baseEdits).length} edits, ${overlay.baseDeletes.length} deletes.`,
    );
  }
  const deleteSet = new Set(overlay.baseDeletes);

  let inserted = 0;
  for (let i = 0; i < data.records.length; i++) {
    const base = data.records[i];
    const edit = overlay.baseEdits[i];
    const rec = edit ? { ...base, ...edit } : base;
    await insertRecord(rec, deleteSet.has(i));
    inserted++;
  }
  for (const custom of overlay.customEntries) {
    await insertRecord(custom, false);
    inserted++;
  }
  console.log(`Inserted ${inserted} pr_records rows.`);

  const byFy = new Map<string, { count: number; qty: number }>();
  const all = await db.select().from(schema.prRecords);
  all.forEach((r) => {
    const e = byFy.get(r.fiscalYear) || { count: 0, qty: 0 };
    e.count++;
    e.qty += r.totalQty;
    byFy.set(r.fiscalYear, e);
  });
  console.log("\nPer-fiscal-year summary (compare against the dashboard before cutting over):");
  Array.from(byFy.keys())
    .sort()
    .forEach((fy) => {
      const e = byFy.get(fy)!;
      console.log(`  FY ${fy}: ${e.count} sends, ${e.qty} total units`);
    });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("migrate-legacy-data failed:", err);
    process.exit(1);
  });
