// Server-side aggregation queries feeding the AI report pipeline (Stage 2).
//
// Every function here excludes soft-deleted rows (is_deleted = true) always,
// and excludes test/internal sends (is_test = true) by default — but the
// excluded-test count is surfaced separately (see getOverallTotals) so the
// report can be transparent about what was left out rather than silently
// dropping data. Kept in the same "plain async function + db.select()" style
// as lib/pr-records.ts.
import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { prRecords, prRecordProducts } = schema;

// Shared WHERE fragments.
const notDeleted = eq(prRecords.isDeleted, false);
const notTestOrDeleted = and(notDeleted, eq(prRecords.isTest, false));

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface OverallTotals {
  sends: number;
  units: number;
  excludedTestSends: number;
}

export async function getOverallTotals(): Promise<OverallTotals> {
  const [real] = await db
    .select({
      sends: sql<number>`count(*)::int`,
      units: sql<number>`coalesce(sum(${prRecords.totalQty}), 0)::int`,
    })
    .from(prRecords)
    .where(notTestOrDeleted);

  const [test] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prRecords)
    .where(and(notDeleted, eq(prRecords.isTest, true)));

  return { sends: real.sends, units: real.units, excludedTestSends: test.count };
}

export interface FiscalYearRow {
  fiscalYear: string;
  sends: number;
  units: number;
  unitsChangePct: number | null; // vs. prior FY in the list, null for the first
}

export async function getPerFiscalYear(): Promise<FiscalYearRow[]> {
  const rows = await db
    .select({
      fiscalYear: prRecords.fiscalYear,
      sends: sql<number>`count(*)::int`,
      units: sql<number>`coalesce(sum(${prRecords.totalQty}), 0)::int`,
    })
    .from(prRecords)
    .where(notTestOrDeleted)
    .groupBy(prRecords.fiscalYear)
    .orderBy(prRecords.fiscalYear); // lexical sort works given fixed-width "YYYY-YY" labels

  return rows.map((row, i) => {
    const prevUnits = i > 0 ? rows[i - 1].units : null;
    const unitsChangePct =
      prevUnits && prevUnits > 0 ? ((row.units - prevUnits) / prevUnits) * 100 : null;
    return { ...row, unitsChangePct: unitsChangePct !== null ? round1(unitsChangePct) : null };
  });
}

export interface MonthlyTrendRow {
  month: string; // "YYYY-MM-DD" (first of month)
  sends: number;
  units: number;
}

export async function getMonthlyTrend(): Promise<MonthlyTrendRow[]> {
  // sent_date is stored as free-text "yyyy-mm-dd" (see lib/schema.ts), not a
  // native date/timestamp column, so it needs an explicit ::date cast before
  // date_trunc can operate on it. Rows with a null/unparsable sent_date are
  // excluded from the trend (nothing to bucket them by).
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${prRecords.sentDate}::date), 'YYYY-MM-DD')`,
      sends: sql<number>`count(*)::int`,
      units: sql<number>`coalesce(sum(${prRecords.totalQty}), 0)::int`,
    })
    .from(prRecords)
    .where(and(notTestOrDeleted, sql`${prRecords.sentDate} is not null`))
    .groupBy(sql`date_trunc('month', ${prRecords.sentDate}::date)`)
    .orderBy(sql`date_trunc('month', ${prRecords.sentDate}::date)`);

  return rows;
}

export interface TopRecipientRow {
  name: string;
  sends: number;
  units: number;
}

export async function getTopRecipients(limit = 10): Promise<TopRecipientRow[]> {
  const rows = await db
    .select({
      name: sql<string>`max(${prRecords.recipientName})`,
      sends: sql<number>`count(*)::int`,
      units: sql<number>`coalesce(sum(${prRecords.totalQty}), 0)::int`,
    })
    .from(prRecords)
    .where(and(notTestOrDeleted, sql`${prRecords.recipientName} is not null`))
    .groupBy(sql`lower(trim(${prRecords.recipientName}))`)
    .orderBy(sql`sum(${prRecords.totalQty}) desc`)
    .limit(limit);

  return rows;
}

export interface CategoryRow {
  category: string;
  units: number;
  pctOfTotal: number;
}

export async function getCategoryBreakdown(): Promise<CategoryRow[]> {
  const rows = await db
    .select({
      category: prRecordProducts.category,
      units: sql<number>`coalesce(sum(${prRecordProducts.quantity}), 0)::int`,
    })
    .from(prRecordProducts)
    .innerJoin(prRecords, eq(prRecords.id, prRecordProducts.prRecordId))
    .where(notTestOrDeleted)
    .groupBy(prRecordProducts.category)
    .orderBy(sql`sum(${prRecordProducts.quantity}) desc`);

  const grandTotal = rows.reduce((s, r) => s + r.units, 0);
  return rows.map((r) => ({
    ...r,
    pctOfTotal: grandTotal > 0 ? round1((r.units / grandTotal) * 100) : 0,
  }));
}

export interface ShadeRow {
  category: string;
  shade: string;
  units: number;
  pctOfTotal: number;
}

export async function getShadeBreakdown(limit = 15): Promise<ShadeRow[]> {
  const rows = await db
    .select({
      category: prRecordProducts.category,
      shade: prRecordProducts.shade,
      units: sql<number>`coalesce(sum(${prRecordProducts.quantity}), 0)::int`,
    })
    .from(prRecordProducts)
    .innerJoin(prRecords, eq(prRecords.id, prRecordProducts.prRecordId))
    .where(notTestOrDeleted)
    .groupBy(prRecordProducts.category, prRecordProducts.shade)
    .orderBy(sql`sum(${prRecordProducts.quantity}) desc`)
    .limit(limit);

  // % is relative to the overall product-units grand total, not just the top-N slice.
  const [{ grand }] = await db
    .select({ grand: sql<number>`coalesce(sum(${prRecordProducts.quantity}), 0)::int` })
    .from(prRecordProducts)
    .innerJoin(prRecords, eq(prRecords.id, prRecordProducts.prRecordId))
    .where(notTestOrDeleted);

  return rows.map((r) => ({
    ...r,
    pctOfTotal: grand > 0 ? round1((r.units / grand) * 100) : 0,
  }));
}

export interface RepeatRow {
  fiscalYear: string;
  newSends: number;
  repeatSends: number;
  repeatPct: number;
}

export async function getRepeatVsNew(): Promise<RepeatRow[]> {
  const result = await db.execute<{
    fiscal_year: string;
    new_sends: number;
    repeat_sends: number;
  }>(sql`
    WITH ranked AS (
      SELECT
        id,
        fiscal_year,
        ROW_NUMBER() OVER (
          PARTITION BY lower(trim(recipient_name))
          ORDER BY sent_date, id
        ) AS send_num
      FROM pr_records
      WHERE is_deleted = false AND is_test = false AND recipient_name IS NOT NULL
    )
    SELECT
      fiscal_year,
      count(*) FILTER (WHERE send_num = 1)::int AS new_sends,
      count(*) FILTER (WHERE send_num > 1)::int AS repeat_sends
    FROM ranked
    GROUP BY fiscal_year
    ORDER BY fiscal_year
  `);

  return result.rows.map((r) => {
    const total = Number(r.new_sends) + Number(r.repeat_sends);
    return {
      fiscalYear: r.fiscal_year,
      newSends: Number(r.new_sends),
      repeatSends: Number(r.repeat_sends),
      repeatPct: total > 0 ? round1((Number(r.repeat_sends) / total) * 100) : 0,
    };
  });
}

export interface ReportAggregates {
  overall: OverallTotals;
  perFiscalYear: FiscalYearRow[];
  monthlyTrend: MonthlyTrendRow[];
  topRecipients: TopRecipientRow[];
  categoryBreakdown: CategoryRow[];
  shadeBreakdown: ShadeRow[];
  repeatVsNew: RepeatRow[];
  generatedAt: string; // ISO timestamp, so the prompt/report can state "as of"
}

export async function buildReportAggregates(): Promise<ReportAggregates> {
  const [overall, perFiscalYear, monthlyTrend, topRecipients, categoryBreakdown, shadeBreakdown, repeatVsNew] =
    await Promise.all([
      getOverallTotals(),
      getPerFiscalYear(),
      getMonthlyTrend(),
      getTopRecipients(),
      getCategoryBreakdown(),
      getShadeBreakdown(),
      getRepeatVsNew(),
    ]);

  return {
    overall,
    perFiscalYear,
    monthlyTrend,
    topRecipients,
    categoryBreakdown,
    shadeBreakdown,
    repeatVsNew,
    generatedAt: new Date().toISOString(),
  };
}
