// Drizzle ORM schema for the Pastel Beauty PR dashboard.
//
// Four tables:
//  - users             named user accounts (Credentials auth, role-based: 'admin' | 'member')
//  - pr_records        one row per PR "send" (a gift/package sent to a recipient)
//  - pr_record_products line items (category + shade + quantity) for a send
//  - ai_reports         Stage 2 — AI-generated management reports (included now so
//                        the schema/migrations are complete in one pass; unused
//                        until Stage 2 wires up /api/reports)
//
// See /Users/anil.ghatan/.claude/plans/synchronous-churning-mango.md ("Data model")
// for the source of truth this file implements.

import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  // 'admin' can manage users (add/deactivate/change role/reset password);
  // 'member' has the same dashboard/report access as before, minus user
  // management. Everyone can change their own password regardless of role.
  role: text("role").notNull().default("member"),
  // Deactivated accounts can't log in but are kept (not deleted) so their
  // pr_records/ai_reports attribution (created_by/generated_by) stays intact.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prRecords = pgTable("pr_records", {
  id: bigserial("id", { mode: "number" }).primaryKey(),

  fiscalYear: text("fiscal_year").notNull(),
  sentDate: text("sent_date"), // stored as ISO date string (yyyy-mm-dd); legacy data has some odd values
  bsDate: text("bs_date"), // Bikram Sambat date, free text as in the source workbook

  recipientName: text("recipient_name"),
  address: text("address"),
  phone: text("phone"),

  isTest: boolean("is_test").notNull().default(false),
  notes: text("notes"),

  totalQty: integer("total_qty").notNull().default(0), // server-recomputed from line items on every write

  isDeleted: boolean("is_deleted").notNull().default(false), // single soft-delete flag

  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prRecordProducts = pgTable(
  "pr_record_products",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    prRecordId: bigint("pr_record_id", { mode: "number" })
      .notNull()
      .references(() => prRecords.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    shade: text("shade").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    uniqueIndex("pr_record_products_record_cat_shade_idx").on(
      table.prRecordId,
      table.category,
      table.shade,
    ),
  ],
);

export const aiReports = pgTable("ai_reports", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  generatedBy: uuid("generated_by").references(() => users.id),
  // "ai" (OpenAI-written narrative) or "standard" (deterministic, template-
  // generated from the same aggregates, no API call — the fallback for when
  // an AI report isn't wanted or the OpenAI quota/latency is a concern).
  reportType: text("report_type").notNull().default("ai"),
  model: text("model").notNull(), // the OpenAI model used, or "standard-template" for non-AI reports
  inputSnapshot: jsonb("input_snapshot").notNull(), // exact aggregate numbers fed to the prompt/template
  contentMd: text("content_md").notNull(), // narrative (prose/bullets only)
  status: text("status").notNull().default("completed"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PrRecordRow = typeof prRecords.$inferSelect;
export type NewPrRecordRow = typeof prRecords.$inferInsert;
export type PrRecordProductRow = typeof prRecordProducts.$inferSelect;
export type NewPrRecordProductRow = typeof prRecordProducts.$inferInsert;
export type AiReportRow = typeof aiReports.$inferSelect;
export type NewAiReportRow = typeof aiReports.$inferInsert;
