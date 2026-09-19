"use client";

import { fmtDate, fmtNum } from "@/lib/format";
import type { PrRecord } from "@/lib/types";

export default function TrashPanel({
  open,
  records,
  loading,
  onClose,
  onRestore,
}: {
  open: boolean;
  records: PrRecord[];
  loading: boolean;
  onClose: () => void;
  onRestore: (record: PrRecord) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay open"
      id="trashOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: 560 }}>
        <h2>Removed PR sends</h2>
        <p className="sub">Rows removed from the dashboard are kept here so you can bring them back.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "50vh", overflowY: "auto" }}>
          {loading ? (
            <div className="empty-note">Loading…</div>
          ) : records.length === 0 ? (
            <div className="empty-note">No removed rows</div>
          ) : (
            records.map((r) => (
              <div className="trash-item" key={r.id}>
                <div className="info">
                  <b>{r.name || "(no name)"}</b>
                  {fmtDate(r.date)} · FY {r.fy} · {fmtNum(r.totalQty)} units total
                </div>
                <button className="btn subtle small" onClick={() => onRestore(r)}>
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
        <div className="modal-footer">
          <div className="left">
            <button className="btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
