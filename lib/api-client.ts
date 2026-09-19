"use client";

import type {
  MetaResponse,
  PrRecord,
  PrRecordInput,
  ReportDetail,
  ReportSummary,
  ReportType,
  UserRole,
  UserSummary,
} from "@/lib/types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — non-JSON error body
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function fetchPrRecords(opts: { deleted?: boolean } = {}): Promise<PrRecord[]> {
  const qs = opts.deleted ? "?deleted=1" : "";
  const { records } = await handle<{ records: PrRecord[] }>(await fetch(`/api/pr-records${qs}`));
  return records;
}

export async function fetchMeta(): Promise<MetaResponse> {
  return handle<MetaResponse>(await fetch("/api/meta"));
}

export async function createPrRecord(input: PrRecordInput): Promise<PrRecord> {
  const { record } = await handle<{ record: PrRecord }>(
    await fetch("/api/pr-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return record;
}

export async function updatePrRecord(id: number, input: PrRecordInput): Promise<PrRecord> {
  const { record } = await handle<{ record: PrRecord }>(
    await fetch(`/api/pr-records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return record;
}

export async function deletePrRecord(id: number): Promise<void> {
  await handle(await fetch(`/api/pr-records/${id}`, { method: "DELETE" }));
}

export async function restorePrRecord(id: number): Promise<void> {
  await handle(await fetch(`/api/pr-records/${id}/restore`, { method: "POST" }));
}

export async function bulkImportPrRecords(records: PrRecordInput[]): Promise<{ inserted: number }> {
  return handle<{ inserted: number }>(
    await fetch("/api/pr-records/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(records),
    }),
  );
}

// ---------- Stage 2: AI reports ----------

export async function fetchReports(): Promise<ReportSummary[]> {
  const { reports } = await handle<{ reports: ReportSummary[] }>(await fetch("/api/reports"));
  return reports;
}

export async function fetchReport(id: number | string): Promise<ReportDetail> {
  const { report } = await handle<{ report: ReportDetail }>(await fetch(`/api/reports/${id}`));
  return report;
}

export async function generateReport(type: ReportType = "ai"): Promise<ReportDetail> {
  const { report } = await handle<{ report: ReportDetail }>(
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    }),
  );
  return report;
}

// ---------- User management (admin-only, except changeOwnPassword) ----------

export async function fetchUsers(): Promise<UserSummary[]> {
  const { users } = await handle<{ users: UserSummary[] }>(await fetch("/api/users"));
  return users;
}

export async function createUser(input: { name: string; email: string; password: string; role: UserRole }): Promise<UserSummary> {
  const { user } = await handle<{ user: UserSummary }>(
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return user;
}

async function patchUser(id: string, body: object): Promise<UserSummary> {
  const { user } = await handle<{ user: UserSummary }>(
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return user;
}

export function updateUserRole(id: string, role: UserRole): Promise<UserSummary> {
  return patchUser(id, { role });
}

export function setUserActive(id: string, isActive: boolean): Promise<UserSummary> {
  return patchUser(id, { isActive });
}

export function resetUserPassword(id: string, newPassword: string): Promise<UserSummary> {
  return patchUser(id, { newPassword });
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  await handle(
    await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  );
}
