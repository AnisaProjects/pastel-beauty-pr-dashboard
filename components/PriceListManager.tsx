"use client";

import { useCallback, useEffect, useState } from "react";
import { createProductPrice, fetchProductPrices, updateProductPrice } from "@/lib/api-client";
import type { ProductPrice } from "@/lib/types";
import { fmtNum } from "@/lib/format";

export default function PriceListManager() {
  const [prices, setPrices] = useState<ProductPrice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("");
  const [shade, setShade] = useState("");
  const [productName, setProductName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const load = useCallback(async () => {
    try { setPrices(await fetchProductPrices()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load price list."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addPrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setNotice(null); setSaving(true);
    try {
      await createProductPrice({ category, shade, productName, unitPriceNpr: Number(unitPrice) });
      setCategory(""); setShade(""); setProductName(""); setUnitPrice("");
      setNotice("Product price added."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add price."); }
    finally { setSaving(false); }
  }

  async function saveEdit(id: number) {
    setError(null); setNotice(null); setSaving(true);
    try {
      await updateProductPrice(id, { productName: editName, unitPriceNpr: Number(editPrice) });
      setEditingId(null); setNotice("Product price updated. PR valuations use the current price list."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update price."); }
    finally { setSaving(false); }
  }

  return <main className="wrap">
    <section className="panel reports-toolbar"><div><h2>Product price list</h2><p>Manage official NPR prices used to calculate each PR send and its product-wise receipt. Price changes recalculate existing PR values after the data reloads; saved report snapshots keep the values they had when generated.</p></div></section>
    <form className="panel" onSubmit={addPrice} style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Add a product</h3>
      <div className="form-row">
        <div className="form-field"><label htmlFor="price-category">Category</label><input id="price-category" required value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Pastel Beauty Mascara" /></div>
        <div className="form-field"><label htmlFor="price-shade">Product / shade key</label><input id="price-shade" required value={shade} onChange={e => setShade(e.target.value)} placeholder="e.g. Black" /></div>
        <div className="form-field"><label htmlFor="price-name">Official product name</label><input id="price-name" required value={productName} onChange={e => setProductName(e.target.value)} /></div>
        <div className="form-field"><label htmlFor="price-amount">Unit price (NPR)</label><input id="price-amount" required type="number" min="1" step="1" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} /></div>
      </div>
      {error && <p className="form-error show" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Add product price"}</button>
    </form>
    {prices === null && !error && <div className="panel placeholder-panel"><h2>Loading…</h2></div>}
    {prices && <div className="panel" style={{ padding: 0, overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table className="data"><thead><tr><th>Category</th><th>Product / shade</th><th>Official product name</th><th>Unit price</th><th>Action</th></tr></thead><tbody>
      {prices.map(item => <tr key={item.id}><td>{item.category}</td><td>{item.shade}</td><td>{editingId === item.id ? <input aria-label="Official product name" value={editName} onChange={e => setEditName(e.target.value)} /> : item.productName}</td><td>{editingId === item.id ? <input aria-label="Unit price in NPR" type="number" min="1" step="1" value={editPrice} onChange={e => setEditPrice(e.target.value)} /> : `NPR ${fmtNum(item.unitPriceNpr)}`}</td><td>{editingId === item.id ? <div style={{ display: "flex", gap: 6 }}><button className="btn small" disabled={saving} onClick={() => saveEdit(item.id)}>Save</button><button className="btn subtle small" onClick={() => setEditingId(null)}>Cancel</button></div> : <button className="btn subtle small" onClick={() => { setEditingId(item.id); setEditName(item.productName); setEditPrice(String(item.unitPriceNpr)); }}>Edit</button>}</td></tr>)}
      {prices.length === 0 && <tr><td colSpan={5}>No product prices yet.</td></tr>}
    </tbody></table></div></div>}
  </main>;
}
