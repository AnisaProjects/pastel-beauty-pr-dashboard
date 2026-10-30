"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  bulkImportPrRecords,
  createPrRecord as apiCreate,
  deletePrRecord as apiDelete,
  fetchMeta,
  fetchPrRecords,
  restorePrRecord as apiRestore,
  updatePrRecord as apiUpdate,
} from "@/lib/api-client";
import CategoryChart from "@/components/charts/CategoryChart";
import FyChart from "@/components/charts/FyChart";
import RecipientsChart from "@/components/charts/RecipientsChart";
import ShadesChart from "@/components/charts/ShadesChart";
import TimelineChart from "@/components/charts/TimelineChart";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import KpiStrip from "@/components/KpiStrip";
import Leaderboard from "@/components/Leaderboard";
import RecordModal from "@/components/RecordModal";
import { useToast } from "@/components/ToastProvider";
import TrashPanel from "@/components/TrashPanel";
import { exportCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/format";
import { parsePrImport } from "@/lib/import-pr";
import { recomputeDerived } from "@/lib/recompute";
import type { MetaResponse, PrRecord, PrRecordInput } from "@/lib/types";

type SortKey = "date" | "fy" | "name" | "address" | "totalQty" | "sendNum" | "status";

function importIdentity(record: PrRecordInput | PrRecord): string {
  const text = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase();
  const products = record.products
    .map((product) => [text(product.category), text(product.shade), Number(product.quantity)])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify([
    record.fy,
    (record.date ?? "").slice(0, 10),
    text(record.name),
    text(record.address),
    text(record.phone),
    text(record.notes),
    record.isTest,
    products,
  ]);
}

export default function Dashboard() {
  const [records, setRecords] = useState<PrRecord[] | null>(null);
  const [meta, setMeta] = useState<MetaResponse>({ categories: [], shadesByCategory: {} });
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fys, setFys] = useState<Set<string> | null>(null);
  const [includeTest, setIncludeTest] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [expanded, setExpanded] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PrRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [trashOpen, setTrashOpen] = useState(false);
  const [trashRecords, setTrashRecords] = useState<PrRecord[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [recs, m] = await Promise.all([fetchPrRecords(), fetchMeta()]);
      recomputeDerived(recs);
      setRecords(recs);
      setMeta(m);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: the setState calls inside loadData() only run after
    // its `await`s resolve, not synchronously within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const allFys = useMemo(() => {
    if (!records) return [];
    return Array.from(new Set(records.map((r) => r.fy))).sort();
  }, [records]);

  // default the FY filter to "everything" once we know what fiscal years exist
  // (derived-state-on-prop-change — a documented valid useEffect use case)
  useEffect(() => {
    if (fys === null && allFys.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFys(new Set(allFys));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFys]);

  const activeFys = useMemo(() => fys ?? new Set(allFys), [fys, allFys]);

  const filtered = useMemo(() => {
    if (!records) return [];
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (!activeFys.has(r.fy)) return false;
      if (!includeTest && r.isTest) return false;
      if (q) {
        const hay = ((r.name || "") + " " + (r.address || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }, [records, activeFys, includeTest, search]);

  const activeFyList = useMemo(() => allFys.filter((fy) => activeFys.has(fy)), [allFys, activeFys]);

  const dateRange = useMemo(() => {
    if (!records) return "—";
    const dates = records.map((r) => r.date).filter((d): d is string => !!d).sort();
    if (!dates.length) return "—";
    return `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}`;
  }, [records]);

  function toggleFy(fy: string) {
    setFys((prev) => {
      const next = new Set(prev ?? allFys);
      if (next.has(fy)) {
        if (next.size === 1) return next;
        next.delete(fy);
      } else {
        next.add(fy);
      }
      return next;
    });
    setPage(1);
  }

  function resetFilters() {
    setFys(new Set(allFys));
    setIncludeTest(false);
    setSearch("");
    setSortKey("date");
    setSortDir("asc");
    setPage(1);
    setExpanded(null);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function openAddModal() {
    setEditingRecord(null);
    setModalOpen(true);
  }
  function openEditModal(r: PrRecord) {
    setEditingRecord(r);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditingRecord(null);
  }

  async function handleSubmitRecord(input: PrRecordInput) {
    setSubmitting(true);
    try {
      if (editingRecord) {
        await apiUpdate(editingRecord.id, input);
        if (input.isTest) {
          toast.warning("Saved as a test/internal send — hidden from totals unless you include test/internal sends.");
        } else {
          toast.success("Changes saved");
        }
      } else {
        await apiCreate(input);
        if (input.isTest) {
          toast.warning("Saved as a test/internal send — hidden from totals unless you include test/internal sends.");
        } else {
          toast.success("PR send added");
        }
      }
      closeModal();
      setExpanded(null);
      await loadData();
      setFys((prev) => {
        if (!prev || prev.has(input.fy)) return prev;
        const next = new Set(prev);
        next.add(input.fy);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(r: PrRecord) {
    if (!window.confirm("Remove this row from the dashboard? You can restore it later from \"Removed rows\".")) return;
    try {
      await apiDelete(r.id);
      setExpanded(null);
      toast.success('Row removed', {
        action: { label: "Undo", onClick: () => handleRestore(r) },
      });
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function openTrash() {
    setTrashOpen(true);
    setTrashLoading(true);
    try {
      const deleted = await fetchPrRecords({ deleted: true });
      setTrashRecords(deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load removed rows");
    } finally {
      setTrashLoading(false);
    }
  }

  async function handleRestore(r: PrRecord) {
    try {
      await apiRestore(r.id);
      setTrashRecords((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Row restored");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    }
  }

  function handleExportCsv() {
    exportCsv(filtered);
  }

  const importInputRef = useRef<HTMLInputElement | null>(null);
  function handleImportClick() {
    importInputRef.current?.click();
  }
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = await parsePrImport(file);
      let inputs = parsed;
      let skippedDuplicates = 0;
      const isSpreadsheet = file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".xlsx");
      if (isSpreadsheet) {
        const known = new Set((records ?? []).map(importIdentity));
        inputs = parsed.filter((record) => {
          const key = importIdentity(record);
          if (known.has(key)) { skippedDuplicates++; return false; }
          known.add(key);
          return true;
        });
      }
      if (isSpreadsheet && parsed.length > 0 && inputs.length === 0) {
        toast.success(`All ${parsed.length} spreadsheet sends already exist; no duplicates added`);
        return;
      }
      const result = await bulkImportPrRecords(inputs);
      toast.success(`Imported ${result.inserted} entr${result.inserted === 1 ? "y" : "ies"}${skippedDuplicates ? `; skipped ${skippedDuplicates} existing` : ""}`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read this file. Check its columns and try again.");
    }
  }

  if (loadError) {
    return (
      <div className="wrap">
        <div className="panel placeholder-panel">
          <h2>Couldn&apos;t load the dashboard</h2>
          <p>{loadError}</p>
          <button className="btn" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!records) {
    return (
      <div className="wrap">
        <div className="empty-note">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="table-toolbar" style={{ marginBottom: 4 }}>
        <span className="count top-meta">{dateRange}</span>
        <div className="actions">
          <button className="btn" id="openAddModal" onClick={openAddModal}>
            + Add PR send
          </button>
        </div>
      </div>

      <FilterBar
        allFys={allFys}
        activeFys={activeFys}
        onToggleFy={toggleFy}
        includeTest={includeTest}
        onToggleIncludeTest={(v) => {
          setIncludeTest(v);
          setPage(1);
          toast.info(v ? "Now showing test/internal sends too" : "Test/internal sends hidden again", {
            id: "include-test-toggle",
            duration: 2200,
          });
        }}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onReset={resetFilters}
      />

      <KpiStrip filtered={filtered} fyCountAll={allFys.length} selectedFyCount={activeFys.size} />

      <section>
        <div className="section-head">
          <h2>Overview</h2>
          <span className="note">{includeTest ? "test/internal included" : "test/internal excluded"}</span>
        </div>
        <div className="chart-grid">
          <div className="panel">
            <h3>Sends &amp; units by fiscal year</h3>
            <div className="canvas-box">
              <FyChart filtered={filtered} activeFys={activeFyList} />
            </div>
          </div>
          <div className="panel">
            <h3>Units by product category</h3>
            <div className="canvas-box">
              <CategoryChart filtered={filtered} categories={meta.categories} />
            </div>
          </div>
          <div className="panel wide">
            <h3>Sends over time (monthly)</h3>
            <div className="canvas-box">
              <TimelineChart filtered={filtered} />
            </div>
          </div>
          <div className="panel">
            <h3>Top 12 shades by units sent</h3>
            <div className="canvas-box tall">
              <ShadesChart filtered={filtered} />
            </div>
          </div>
          <div className="panel">
            <h3>Top 10 recipients by units</h3>
            <div className="canvas-box tall">
              <RecipientsChart filtered={filtered} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Repeat customers</h2>
          <span className="note">Matched by exact name, trimmed &amp; case-insensitive.</span>
        </div>
        <Leaderboard filtered={filtered} />
      </section>

      <section>
        <div className="section-head">
          <h2>All PR sends</h2>
          <span className="note">Click a row to see its full shade breakdown.</span>
        </div>
        <div className="panel" style={{ padding: "16px 18px" }}>
          <div className="table-toolbar">
            <span className="note">Import JSON, CSV, or Excel (.xlsx, latest FY tab)</span>
            <div className="actions">
              <button className="btn ghost small" onClick={handleExportCsv}>
                Export CSV
              </button>
              <button className="btn ghost small" onClick={handleImportClick}>
                Import file
              </button>
              <button className="btn ghost small" onClick={openTrash}>
                Removed rows
              </button>
              <input
                type="file"
                accept=".json,.csv,.xlsx,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ref={importInputRef}
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
            </div>
          </div>
          <DataTable
            filtered={filtered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            expanded={expanded}
            onToggleExpand={(id) => setExpanded((prev) => (prev === id ? null : id))}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        </div>
      </section>

      <footer>Pastel Beauty PR dashboard — data stored centrally, shared by everyone on your team.</footer>

      <RecordModal
        open={modalOpen}
        editingRecord={editingRecord}
        allFys={allFys}
        categories={meta.categories}
        shadesByCategory={meta.shadesByCategory}
        onClose={closeModal}
        onSubmit={handleSubmitRecord}
        onDelete={(r) => {
          closeModal();
          handleDelete(r);
        }}
        submitting={submitting}
      />

      <TrashPanel
        open={trashOpen}
        records={trashRecords}
        loading={trashLoading}
        onClose={() => setTrashOpen(false)}
        onRestore={handleRestore}
      />
    </div>
  );
}
