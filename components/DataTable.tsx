"use client";

import { Fragment, useMemo } from "react";

import { fmtDate, fmtNum } from "@/lib/format";
import type { PrRecord } from "@/lib/types";

type SortKey = "date" | "fy" | "name" | "address" | "totalQty" | "sendNum" | "status";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "fy", label: "FY" },
  { key: "name", label: "Recipient" },
  { key: "address", label: "Address" },
  { key: "totalQty", label: "Units" },
  { key: "sendNum", label: "Visit #" },
  { key: "status", label: "Status" },
];

export default function DataTable({
  filtered,
  sortKey,
  sortDir,
  onSort,
  page,
  pageSize,
  onPageChange,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  filtered: PrRecord[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  expanded: number | null;
  onToggleExpand: (id: number) => void;
  onEdit: (record: PrRecord) => void;
  onDelete: (record: PrRecord) => void;
}) {
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const arr = filtered.slice();
    arr.sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "status") {
        av = a.isRepeat ? 1 : 0;
        bv = b.isRepeat ? 1 : 0;
      } else {
        av = (a[sortKey] ?? "") as string | number;
        bv = (b[sortKey] ?? "") as string | number;
      }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  return (
    <>
      <span className="count" id="rowCount">
        {sorted.length} send{sorted.length === 1 ? "" : "s"} matching current filters
      </span>
      <div style={{ overflowX: "auto" }}>
        <table className="data" id="dataTable">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={col.key === sortKey ? "sorted" : ""}
                  onClick={() => onSort(col.key)}
                >
                  {col.label}
                  {col.key === sortKey && <span className="arrow"> {sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody id="tableBody">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-note">
                  No sends match the current filters
                </td>
              </tr>
            )}
            {pageRows.map((r) => {
              const isExpanded = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    className={"datarow" + (isExpanded ? " expanded" : "")}
                    onClick={() => onToggleExpand(r.id)}
                  >
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.fy}</td>
                    <td>{r.name || "—"}</td>
                    <td>{r.address || "—"}</td>
                    <td>{fmtNum(r.totalQty)}</td>
                    <td>{r.sendNum || "—"}</td>
                    <td>
                      {r.isTest ? (
                        <span className="badge test">test</span>
                      ) : r.isRepeat ? (
                        <span className="badge repeat">repeat</span>
                      ) : (
                        <span className="badge new">new</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="detail-row">
                      <td colSpan={7}>
                        <div className="detail-grid">
                          {r.products.length === 0 ? (
                            <span className="empty-note" style={{ padding: 0 }}>
                              No shade quantities recorded on this row.
                            </span>
                          ) : (
                            r.products.map((p) => (
                              <span className="detail-chip" key={p.category + "::" + p.shade}>
                                {p.shade}{" "}
                                <b style={{ color: "var(--primary)" }}>×{fmtNum(p.quantity)}</b>{" "}
                                <span style={{ color: "#999" }}>— {p.category}</span>
                              </span>
                            ))
                          )}
                        </div>
                        {r.notes && (
                          <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-soft)" }}>
                            Note: {r.notes}
                          </div>
                        )}
                        <div className="detail-actions">
                          <button
                            className="btn ghost small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(r);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn danger small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(r);
                            }}
                          >
                            Remove this row
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination" id="pagination">
        <button disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
          ‹
        </button>
        <span>
          Page {safePage} of {totalPages}
        </span>
        <button disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}>
          ›
        </button>
      </div>
    </>
  );
}
