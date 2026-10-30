"use client";

import { useEffect, useMemo, useState } from "react";

import { fmtNum } from "@/lib/format";
import { AD_MAX, AD_MIN, adToBs } from "@/lib/nepali-date";
import type { PrRecord, PrRecordInput } from "@/lib/types";

const NEW_OPTION = "__new__";

type ProductRowState = {
  key: number;
  category: string;
  newCategory: string;
  shade: string;
  newShade: string;
  qty: string;
};

let rowKeySeq = 0;
function emptyRow(category = "", shade = "", qty = "1"): ProductRowState {
  return { key: ++rowKeySeq, category, newCategory: "", shade, newShade: "", qty };
}

export default function RecordModal({
  open,
  editingRecord,
  allFys,
  categories,
  shadesByCategory,
  onClose,
  onSubmit,
  onDelete,
  submitting,
}: {
  open: boolean;
  editingRecord: PrRecord | null;
  allFys: string[];
  categories: string[];
  shadesByCategory: Record<string, string[]>;
  onClose: () => void;
  onSubmit: (input: PrRecordInput) => Promise<void> | void;
  onDelete: (record: PrRecord) => void;
  submitting: boolean;
}) {
  const [fy, setFy] = useState("");
  const [newFy, setNewFy] = useState("");
  const [date, setDate] = useState("");
  const [bsDate, setBsDate] = useState("");
  // "auto": bsDate tracks `date` via adToBs() and the field is read-only.
  // "manual": the person is typing it themselves — used for legacy rows
  // whose BS date doesn't match a straight conversion, and as a fallback
  // for dates outside the converter's supported range (see lib/nepali-date.ts).
  const [bsMode, setBsMode] = useState<"auto" | "manual">("auto");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isTest, setIsTest] = useState(false);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ProductRowState[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);

  // Reset/populate the form whenever the modal opens (or switches between
  // add/edit) — a documented valid useEffect use case (resetting state in
  // response to a prop change), not a data-fetch-triggered cascade.
  useEffect(() => {
    if (!open) return;
    if (editingRecord) {
      const r = editingRecord;
      const recordDate = r.date ? r.date.slice(0, 10) : "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFy(allFys.includes(r.fy) ? r.fy : NEW_OPTION);
      setNewFy(allFys.includes(r.fy) ? "" : r.fy);
      setDate(recordDate);
      setBsDate(r.bsDate || "");
      // A saved BS date that matches what auto-conversion would produce from
      // the send date is treated as auto (so editing the date keeps it in
      // sync); anything else — legacy free text, an out-of-range date, a
      // hand-typed override — stays in manual mode untouched.
      setBsMode(r.bsDate && r.bsDate === adToBs(recordDate)?.iso ? "auto" : "manual");
      setName(r.name || "");
      setAddress(r.address || "");
      setPhone(r.phone || "");
      setIsTest(!!r.isTest);
      setNotes(r.notes || "");
      setRows(
        r.products.length
          ? r.products.map((p) => emptyRow(p.category, p.shade, String(p.quantity)))
          : [emptyRow()],
      );
    } else {
      setFy(allFys[0] || NEW_OPTION);
      setNewFy("");
      setDate("");
      setBsDate("");
      setBsMode("auto");
      setName("");
      setAddress("");
      setPhone("");
      setIsTest(false);
      setNotes("");
      setRows([emptyRow()]);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingRecord]);

  const bsPreview = useMemo(() => adToBs(date), [date]);

  function handleDateChange(next: string) {
    setDate(next);
    if (bsMode === "auto") {
      setBsDate(adToBs(next)?.iso || "");
    }
  }

  function switchToManual() {
    setBsMode("manual");
  }

  function switchToAuto() {
    setBsMode("auto");
    setBsDate(bsPreview?.iso || "");
  }

  const resolvedProducts = useMemo(() => {
    return rows
      .map((row) => {
        const category = row.category === NEW_OPTION ? row.newCategory.trim() : row.category;
        const shade = row.category === NEW_OPTION || row.shade === NEW_OPTION ? row.newShade.trim() : row.shade;
        const qty = parseFloat(row.qty);
        return { category, shade, quantity: qty };
      })
      .filter((p) => p.category && p.shade && Number.isFinite(p.quantity) && p.quantity > 0);
  }, [rows]);

  const totalPreview = useMemo(() => {
    const total = resolvedProducts.reduce((s, p) => s + p.quantity, 0);
    return resolvedProducts.length
      ? `${resolvedProducts.length} shade line${resolvedProducts.length === 1 ? "" : "s"} · ${fmtNum(total)} total units`
      : "No shades added yet";
  }, [resolvedProducts]);

  if (!open) return null;

  function updateRow(key: number, patch: Partial<ProductRowState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  async function handleSubmit() {
    setError(null);
    const resolvedFy = fy === NEW_OPTION ? newFy.trim() : fy;
    if (!resolvedFy) {
      setError("Please choose or enter a fiscal year.");
      return;
    }
    if (!date) {
      setError("Please pick the date this was sent.");
      return;
    }
    const input: PrRecordInput = {
      fy: resolvedFy,
      date,
      bsDate: bsDate.trim() || null,
      name: name.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      isTest,
      notes: notes.trim() || null,
      products: resolvedProducts,
    };
    await onSubmit(input);
  }

  return (
    <div
      className="modal-overlay open"
      id="modalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h2 id="modalTitle">{editingRecord ? "Edit PR send" : "Add a PR send"}</h2>
        <p className="sub">This is saved straight to the shared dashboard, charts and table.</p>

        <div className="form-row">
          <div className="form-field">
            <label>Fiscal year</label>
            <select value={fy} onChange={(e) => setFy(e.target.value)}>
              {allFys.map((f) => (
                <option key={f} value={f}>
                  FY {f}
                </option>
              ))}
              <option value={NEW_OPTION}>+ New fiscal year…</option>
            </select>
          </div>
          {fy === NEW_OPTION && (
            <div className="form-field">
              <label>New fiscal year label</label>
              <input
                type="text"
                value={newFy}
                onChange={(e) => setNewFy(e.target.value)}
                placeholder="e.g. 2084-85"
              />
            </div>
          )}
          <div className="form-field">
            <label>Date sent</label>
            <input
              type="date"
              value={date}
              min={AD_MIN}
              max={AD_MAX}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>
          <div className="form-field">
            <div className="field-note-row">
              <label>BS date {bsMode === "auto" ? "(auto)" : "(manual)"}</label>
              {bsMode === "auto" ? (
                <button type="button" className="field-link-btn" onClick={switchToManual}>
                  Enter manually
                </button>
              ) : (
                <button type="button" className="field-link-btn" onClick={switchToAuto} disabled={!bsPreview}>
                  Use calculated date
                </button>
              )}
            </div>
            {bsMode === "auto" ? (
              <input type="text" value={bsPreview ? bsPreview.label : ""} readOnly placeholder="Pick a date sent above" />
            ) : (
              <input
                type="text"
                value={bsDate}
                onChange={(e) => setBsDate(e.target.value)}
                placeholder="e.g. 2082-05-12"
              />
            )}
            {bsMode === "auto" && date && !bsPreview && (
              <span className="field-note">
                Outside the supported BS conversion range — enter it manually instead.
              </span>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Recipient name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sujata Karki" />
          </div>
          <div className="form-field">
            <label>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Studio, Baneshwor"
            />
          </div>
          <div className="form-field">
            <label>Phone (optional)</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field checkline">
            <input type="checkbox" id="fld-isTest" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />
            <label htmlFor="fld-isTest">Mark as test / internal send</label>
          </div>
          <div className="form-field">
            <label>Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. bulk replacement, verify"
            />
          </div>
        </div>

        <hr className="divider" />
        <label
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--ink-soft)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          Shades sent
        </label>
        <div style={{ marginTop: 10 }}>
          {rows.map((row) => {
            const shadeOptions = row.category && row.category !== NEW_OPTION ? shadesByCategory[row.category] || [] : [];
            return (
              <div className="product-row" key={row.key}>
                <div className="form-field">
                  <label>Category</label>
                  <select
                    value={row.category}
                    onChange={(e) => updateRow(row.key, { category: e.target.value, shade: "" })}
                  >
                    <option value="" disabled>
                      Choose…
                    </option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value={NEW_OPTION}>+ New category…</option>
                  </select>
                  {row.category === NEW_OPTION && (
                    <input
                      type="text"
                      className="p-cat-new"
                      placeholder="New category name"
                      style={{ marginTop: 6 }}
                      value={row.newCategory}
                      onChange={(e) => updateRow(row.key, { newCategory: e.target.value })}
                    />
                  )}
                </div>
                <div className="form-field">
                  <label>Shade</label>
                  {row.category === NEW_OPTION || row.shade === NEW_OPTION ? (
                    <input
                      type="text"
                      className="p-shade-new"
                      placeholder="New shade name"
                      value={row.newShade}
                      onChange={(e) => updateRow(row.key, { newShade: e.target.value })}
                    />
                  ) : (
                    <select value={row.shade} onChange={(e) => updateRow(row.key, { shade: e.target.value })}>
                      <option value="" disabled>
                        Choose…
                      </option>
                      {shadeOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option value={NEW_OPTION}>+ New shade…</option>
                    </select>
                  )}
                </div>
                <div className="form-field qty-field">
                  <label>Qty</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={row.qty}
                    onChange={(e) => updateRow(row.key, { qty: e.target.value })}
                  />
                </div>
                <button type="button" className="remove-line" title="Remove this line" onClick={() => removeRow(row.key)}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" className="btn subtle small" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
          + Add another shade
        </button>

        {error && <div className="form-error show">{error}</div>}

        <div className="modal-footer">
          <div className="left">
            <button className="btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : editingRecord ? "Save changes" : "Save PR send"}
            </button>
            <button className="btn ghost" onClick={onClose} type="button">
              Cancel
            </button>
            {editingRecord && (
              <button
                className="btn danger"
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(editingRecord);
                }}
              >
                Delete
              </button>
            )}
          </div>
          <span className="note" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            {totalPreview}
          </span>
        </div>
      </div>
    </div>
  );
}
