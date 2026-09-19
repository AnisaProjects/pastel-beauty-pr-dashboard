// Shared client-side shapes for PR records. These mirror the API response
// shape (see app/api/pr-records/route.ts) rather than the DB schema directly,
// since the client works with a flattened "products" array instead of
// separate rows, and carries a couple of derived fields (sendNum/isRepeat)
// that are never persisted — recomputed client-side, exactly like the
// original static dashboard's recomputeDerived().

export type ProductLine = {
  category: string;
  shade: string;
  quantity: number;
};

export type PrRecord = {
  id: number;
  fy: string;
  date: string | null; // ISO date string, e.g. "2025-03-28"
  bsDate: string | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  isTest: boolean;
  notes: string | null;
  totalQty: number;
  products: ProductLine[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;

  // derived client-side by recomputeDerived() — never sent to/from the API
  sendNum?: number;
  isRepeat?: boolean;
};

export type PrRecordInput = {
  fy: string;
  date: string; // "yyyy-mm-dd"
  bsDate?: string | null;
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  isTest?: boolean;
  notes?: string | null;
  products: { category: string; shade: string; quantity: number }[];
};

export type MetaResponse = {
  categories: string[];
  shadesByCategory: Record<string, string[]>;
};

// Stage 2 — AI reports. `import type` from lib/aggregations.ts is erased at
// compile time (no runtime import of lib/db.ts), so it's safe to reference
// ReportAggregates from client components via this file.
export type { ReportAggregates } from "@/lib/aggregations";

export type ReportType = "ai" | "standard";

export type ReportSummary = {
  id: number;
  generatedAt: string;
  generatedBy: string | null;
  reportType: ReportType;
  model: string;
  status: string;
};

export type ReportDetail = ReportSummary & {
  inputSnapshot: import("@/lib/aggregations").ReportAggregates;
  contentMd: string;
};

// ---------- User management ----------

export type UserRole = "admin" | "member";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};
