"use client";

import type { MetaResponse, PrRecord, PrRecordInput } from "@/lib/types";

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
