"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import {
  subscribeToInventory, createInventoryItem, updateInventoryStock, updateInventoryItem,
  subscribeToProduction, createProductionBatch, updateProductionBatch, completeProductionBatch,
  type InventoryItem, type ProductionBatch,
} from "@/lib/commerce";

const CATEGORIES = ["Water Bottles", "Refill Tanks", "Accessories", "Chemicals", "Other"];
type Tab = "stock" | "production";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [tab, setTab] = useState<Tab>("stock");
  const [form, setForm] = useState({ name: "", sku: "", category: "Water Bottles", price: "", stock: "", reorderPoint: "" });
  const [prodForm, setProdForm] = useState({
    batchNumber: "", rawWaterLitres: "", treatedWaterLitres: "",
    bottled20L: "", bottled10L: "", bottled5L: "", bottled1L: "", bottled500ml: "",
    wasteLitres: "", startMeter: "", endMeter: "", operator: "", notes: ""
  });
  const [completingBatch, setCompletingBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prodLoading, setProdLoading] = useState(false);
  const [error, setError] = useState("");
  const [prodError, setProdError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showProdForm, setShowProdForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState("");
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState("");
  const [transferModal, setTransferModal] = useState<{ open: boolean; item: InventoryItem | null }>({ open: false, item: null });
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");

  useEffect(() => {
    const u1 = subscribeToInventory(setInventory);
    const u2 = subscribeToProduction(setBatches);
    return () => { u1(); u2(); };
  }, []);

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.stock <= item.reorderPoint),
    [inventory]
  );

  const totalValue = useMemo(
    () => inventory.reduce((sum, item) => sum + item.price * item.stock, 0),
    [inventory]
  );

  const filteredInventory = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [inventory, searchTerm]
  );

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Product name is required."); return; }
    setLoading(true); setError("");
    try {
      await createInventoryItem({ name: form.name.trim(), sku: form.sku.trim() || `SKU-${Date.now()}`, category: form.category, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0, productionStock: 0, reorderPoint: parseInt(form.reorderPoint) || 10 });
      setForm({ name: "", sku: "", category: "Water Bottles", price: "", stock: "", reorderPoint: "" });
      setShowForm(false);
    } catch { setError("Failed to add item. Please try again."); }
    finally { setLoading(false); }
  };

  const submitProdForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prodForm.batchNumber.trim()) { setProdError("Batch number is required."); return; }
    setProdLoading(true); setProdError("");
    try {
      const startMeter = parseFloat(prodForm.startMeter) || 0;
      const endMeter = parseFloat(prodForm.endMeter) || 0;
      const treatedWaterLitres = (endMeter - startMeter) || 0;
      const bottled20L = parseInt(prodForm.bottled20L) || 0;
      const bottled10L = parseInt(prodForm.bottled10L) || 0;
      const bottled5L = parseInt(prodForm.bottled5L) || 0;
      const bottled1L = parseInt(prodForm.bottled1L) || 0;
      const bottled500ml = parseInt(prodForm.bottled500ml) || 0;
      // Expected end meter = start + total bottled litres
      const totalBottledLitres = bottled20L * 20 + bottled10L * 10 + bottled5L * 5 + bottled1L * 1 + bottled500ml * 0.5;
      const expectedEndMeter = startMeter + totalBottledLitres;
      // Variance = actual meter reading vs expected (negative = loss)
      const actualUsed = endMeter - startMeter;
      const variance = actualUsed > 0 ? totalBottledLitres - actualUsed : 0;

      await createProductionBatch({
        batchNumber: prodForm.batchNumber.trim(),
        rawWaterLitres: parseFloat(prodForm.rawWaterLitres) || 0,
        treatedWaterLitres,
        bottled20L, bottled10L, bottled5L, bottled1L, bottled500ml,
        wasteLitres: parseFloat(prodForm.wasteLitres) || 0,
        startMeter, endMeter, expectedEndMeter, variance,
        status: "In progress",
        operator: prodForm.operator.trim() || "—",
        notes: prodForm.notes.trim(),
        startedAt: new Date().toISOString(),
      });
      setProdForm({ batchNumber: "", rawWaterLitres: "", treatedWaterLitres: "", bottled20L: "", bottled10L: "", bottled5L: "", bottled1L: "", bottled500ml: "", wasteLitres: "", startMeter: "", endMeter: "", operator: "", notes: "" });
      setShowProdForm(false);
    } catch (err: unknown) {
      setProdError(err instanceof Error ? err.message : "Failed to log batch.");
    } finally { setProdLoading(false); }
  };

  const saveStock = async (itemId: string) => {
    const val = parseInt(newStockValue);
    if (!isNaN(val) && val >= 0) await updateInventoryItem(itemId, { stock: val });
    setEditingStock(null);
    setNewStockValue("");
  };

  const savePrice = async (itemId: string) => {
    const val = parseFloat(newPriceValue);
    if (!isNaN(val) && val >= 0) await updateInventoryItem(itemId, { price: val });
    setEditingPrice(null);
    setNewPriceValue("");
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transferModal.item) return;
    const qty = parseInt(transferAmount);
    if (isNaN(qty) || qty <= 0) { setTransferError("Enter a valid quantity."); return; }
    if (qty > transferModal.item.stock) { setTransferError("Not enough stock in Main Store."); return; }
    setTransferLoading(true); setTransferError("");
    try {
      await updateInventoryItem(transferModal.item.id, {
        stock: transferModal.item.stock - qty,
        productionStock: (transferModal.item.productionStock || 0) + qty
      });
      setTransferModal({ open: false, item: null });
      setTransferAmount("");
    } catch {
      setTransferError("Failed to transfer stock.");
    } finally {
      setTransferLoading(false);
    }
  };

  const prodMetrics = useMemo(() => {
    const completed = batches.filter((b) => b.status === "Completed");
    const totalRaw = batches.reduce((s, b) => s + b.rawWaterLitres, 0);
    const totalTreated = batches.reduce((s, b) => s + b.treatedWaterLitres, 0);
    const totalBottled20L = batches.reduce((s, b) => s + b.bottled20L, 0);
    const totalWaste = batches.reduce((s, b) => s + b.wasteLitres, 0);
    const efficiency = totalRaw > 0 ? Math.round(((totalRaw - totalWaste) / totalRaw) * 100) : 0;
    return { completed: completed.length, totalBatches: batches.length, totalRaw, totalTreated, totalBottled20L, totalWaste, efficiency };
  }, [batches]);

  const statusBadge: Record<string, string> = {
    "In progress": "bg-blue-50 text-blue-700 border-blue-200",
    "Completed": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Quality check": "bg-amber-50 text-amber-700 border-amber-200",
    "Rejected": "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <SiteShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600 mb-1">Stock control</p>
            <h1 className="text-3xl font-bold text-slate-900">Inventory & Production</h1>
            <p className="text-slate-500 mt-1 text-sm">Track stock levels, production batches, and water output.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/retail" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">POS</Link>
            {tab === "stock" ? (
              <button onClick={() => { setShowForm((v) => !v); setError(""); }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add item
              </button>
            ) : (
              <button onClick={() => { setShowProdForm((v) => !v); setProdError(""); }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Log batch
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
          {([["stock", "📦 Stock"], ["production", "🏭 Production"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* STOCK TAB */}
        {tab === "stock" && (<>
        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total SKUs", value: inventory.length.toString(), color: "text-sky-600" },
            { label: "Low stock alerts", value: lowStockItems.length.toString(), color: lowStockItems.length > 0 ? "text-amber-600" : "text-emerald-600" },
            { label: "Inventory value", value: `KES ${totalValue.toLocaleString()}`, color: "text-emerald-600" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
              <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Low stock alert */}
        {lowStockItems.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-sm font-semibold text-amber-900">Low stock — reorder needed</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <span key={item.id} className="rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
                  {item.name}: {item.stock} / {item.reorderPoint}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add item form */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">New inventory item</h2>
            <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Product name *", key: "name", placeholder: "e.g. 20L Water Bottle", type: "text" },
                { label: "SKU", key: "sku", placeholder: "e.g. WB-20L-001", type: "text" },
                { label: "Price (KES)", key: "price", placeholder: "e.g. 320", type: "number" },
                { label: "Current stock", key: "stock", placeholder: "e.g. 150", type: "number" },
                { label: "Reorder point", key: "reorderPoint", placeholder: "e.g. 20", type: "number" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                    required={key === "name"}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</label>
                <div className="relative flex items-center">
                  <select
                    value={CATEGORIES.includes(form.category) ? form.category : "Custom"}
                    onChange={(e) => {
                      if (e.target.value === "Custom") setForm((f) => ({ ...f, category: "" }));
                      else setForm((f) => ({ ...f, category: e.target.value }));
                    }}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="Custom">Add New...</option>
                  </select>
                  {!CATEGORIES.includes(form.category) && (
                    <input
                      type="text"
                      placeholder="Enter new category"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="ml-2 flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                      autoFocus
                      required
                    />
                  )}
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition"
                >
                  {loading ? "Saving..." : "Save item"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Inventory table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
              />
            </div>
            <span className="text-sm text-slate-500 shrink-0">{filteredInventory.length} items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left">
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Product</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">SKU</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Category</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Price</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Main Stock</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Prod. Floor</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const isLow = item.stock <= item.reorderPoint;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="px-6 py-4 text-slate-600">{item.category}</td>
                      <td className="px-6 py-4">
                        {editingPrice === item.id ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">KES</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newPriceValue}
                                onChange={(e) => setNewPriceValue(e.target.value)}
                                className="w-28 pl-9 pr-2 py-1.5 border-2 border-blue-400 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") savePrice(item.id);
                                  if (e.key === "Escape") { setEditingPrice(null); setNewPriceValue(""); }
                                }}
                              />
                            </div>
                            <button onClick={() => savePrice(item.id)} className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-2.5 py-1.5 transition">Save</button>
                            <button onClick={() => { setEditingPrice(null); setNewPriceValue(""); }} className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1.5 transition">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">KES {item.price.toLocaleString()}</span>
                            <button
                              onClick={() => { setEditingPrice(item.id); setNewPriceValue(item.price.toString()); }}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-slate-500 text-xs font-semibold px-2 py-1 transition"
                              title="Update price"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                              </svg>
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingStock === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={newStockValue}
                              onChange={(e) => setNewStockValue(e.target.value)}
                              className="w-24 px-3 py-1.5 border-2 border-blue-400 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveStock(item.id);
                                if (e.key === "Escape") { setEditingStock(null); setNewStockValue(""); }
                              }}
                            />
                            <button
                              onClick={() => saveStock(item.id)}
                              className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-2.5 py-1.5 transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingStock(null); setNewStockValue(""); }}
                              className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1.5 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-base font-black ${isLow ? "text-rose-600" : "text-slate-900"}`}>
                              {item.stock}
                            </span>
                            <button
                              onClick={() => { setEditingStock(item.id); setNewStockValue(item.stock.toString()); }}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-slate-500 text-xs font-semibold px-2 py-1 transition"
                              title="Update stock"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => setTransferModal({ open: true, item })}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 text-slate-500 text-xs font-semibold px-2 py-1 transition"
                              title="Transfer to Production Floor"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                              Transfer
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-700">
                        {item.productionStock || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isLow ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {isLow ? "Low stock" : "In stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        KES {(item.stock * item.price).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredInventory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="font-medium">{searchTerm ? "No items match your search" : "No inventory items yet"}</p>
              {!searchTerm && (
                <button onClick={() => setShowForm(true)} className="mt-3 text-sky-600 hover:text-sky-700 font-semibold text-sm">
                  Add your first item →
                </button>
              )}
            </div>
          )}
        </div>
        </>)}

        {/* PRODUCTION TAB */}
        {tab === "production" && (<>
          {/* Production metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total batches", value: prodMetrics.totalBatches.toString(), color: "text-blue-600" },
              { label: "Raw water (L)", value: prodMetrics.totalRaw.toLocaleString(), color: "text-sky-600" },
              { label: "20L bottles produced", value: prodMetrics.totalBottled20L.toLocaleString(), color: "text-emerald-600" },
              { label: "Production efficiency", value: `${prodMetrics.efficiency}%`, color: prodMetrics.efficiency >= 90 ? "text-emerald-600" : prodMetrics.efficiency >= 75 ? "text-amber-600" : "text-rose-600" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
                <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Production pipeline visual */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-4">Production pipeline</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[
                { label: "Raw water intake", value: `${prodMetrics.totalRaw.toLocaleString()} L`, icon: "💧", color: "bg-blue-100 border-blue-300 text-blue-800" },
                { label: "→", value: "", icon: "", color: "" },
                { label: "Treatment", value: `${prodMetrics.totalTreated.toLocaleString()} L`, icon: "⚗️", color: "bg-cyan-100 border-cyan-300 text-cyan-800" },
                { label: "→", value: "", icon: "", color: "" },
                { label: "Bottling", value: `${prodMetrics.totalBottled20L.toLocaleString()} × 20L`, icon: "🍶", color: "bg-sky-100 border-sky-300 text-sky-800" },
                { label: "→", value: "", icon: "", color: "" },
                { label: "Waste", value: `${prodMetrics.totalWaste.toLocaleString()} L`, icon: "♻️", color: "bg-slate-100 border-slate-300 text-slate-600" },
              ].map((step, i) =>
                step.label === "→" ? (
                  <span key={i} className="text-blue-300 font-bold text-xl shrink-0">→</span>
                ) : (
                  <div key={step.label} className={`rounded-2xl border px-4 py-3 text-center min-w-[120px] shrink-0 ${step.color}`}>
                    <p className="text-2xl mb-1">{step.icon}</p>
                    <p className="text-xs font-bold">{step.label}</p>
                    <p className="text-sm font-black mt-1">{step.value}</p>
                  </div>
                )
              )}
            </div>
          </div>

          {showProdForm && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Log production batch</h2>
              <p className="text-sm text-slate-500 mb-5">Enter metre readings and bottling output. Variance is calculated automatically.</p>
              <form onSubmit={submitProdForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {/* Section: Basic info */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-3">Batch info</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { label: "Batch number *", key: "batchNumber", placeholder: "e.g. BATCH-2026-001", type: "text" },
                      { label: "Operator", key: "operator", placeholder: "Staff name", type: "text" },
                      { label: "Notes", key: "notes", placeholder: "Optional notes", type: "text" },
                    ].map(({ label, key, placeholder, type }) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                        <input type={type} placeholder={placeholder} value={prodForm[key as keyof typeof prodForm]}
                          onChange={(e) => setProdForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                          required={key === "batchNumber"} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Metre readings */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-3">Metre readings</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Start metre (L)", key: "startMeter", placeholder: "e.g. 10500" },
                      { label: "End metre (L)", key: "endMeter", placeholder: "e.g. 11200" },
                      { label: "Raw water intake (L)", key: "rawWaterLitres", placeholder: "e.g. 1000" },
                      { label: "Treated water (L)", key: "treatedWaterLitres", placeholder: "Auto-calculated" },
                    ].map(({ label, key, placeholder }) => {
                      const isTreated = key === "treatedWaterLitres";
                      const autoTreated = (parseFloat(prodForm.endMeter) || 0) - (parseFloat(prodForm.startMeter) || 0);
                      const displayValue = isTreated ? (autoTreated > 0 ? autoTreated.toString() : "") : prodForm[key as keyof typeof prodForm];
                      
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                          <input type="number" min="0" step="0.01" placeholder={placeholder} 
                            value={displayValue}
                            readOnly={isTreated}
                            onChange={(e) => !isTreated && setProdForm((f) => ({ ...f, [key]: e.target.value }))}
                            className={`px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isTreated ? "bg-slate-100 cursor-not-allowed" : "bg-slate-50 focus:bg-white"} transition`} />
                        </div>
                      );
                    })}
                  </div>
                  {/* Live variance preview */}
                  {prodForm.startMeter && prodForm.endMeter && (
                    (() => {
                      const start = parseFloat(prodForm.startMeter) || 0;
                      const end = parseFloat(prodForm.endMeter) || 0;
                      const b20 = (parseInt(prodForm.bottled20L) || 0) * 20;
                      const b10 = (parseInt(prodForm.bottled10L) || 0) * 10;
                      const b5 = (parseInt(prodForm.bottled5L) || 0) * 5;
                      const b1 = (parseInt(prodForm.bottled1L) || 0) * 1;
                      const b500 = (parseInt(prodForm.bottled500ml) || 0) * 0.5;
                      const totalBottled = b20 + b10 + b5 + b1 + b500;
                      const actualUsed = end - start;
                      const variance = totalBottled - actualUsed;
                      return (
                        <div className={`mt-3 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap text-sm ${Math.abs(variance) < 1 ? "bg-emerald-50 border border-emerald-200" : variance < 0 ? "bg-rose-50 border border-rose-200" : "bg-amber-50 border border-amber-200"}`}>
                          <span className="font-semibold text-slate-700">Live variance preview:</span>
                          <span className="font-bold">Actual used: <span className="text-blue-700">{actualUsed.toFixed(1)} L</span></span>
                          <span className="font-bold">Bottled: <span className="text-emerald-700">{totalBottled.toFixed(1)} L</span></span>
                          <span className={`font-black ${Math.abs(variance) < 1 ? "text-emerald-700" : variance < 0 ? "text-rose-700" : "text-amber-700"}`}>
                            Variance: {variance >= 0 ? "+" : ""}{variance.toFixed(1)} L {Math.abs(variance) < 1 ? "✓ OK" : variance < 0 ? "⚠ Loss" : "⚠ Gain"}
                          </span>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Section: Bottling output */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-3">Bottling output — adds to inventory on completion</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      { label: "20L bottles", key: "bottled20L", placeholder: "e.g. 40", litres: 20 },
                      { label: "10L bottles", key: "bottled10L", placeholder: "e.g. 30", litres: 10 },
                      { label: "5L bottles", key: "bottled5L", placeholder: "e.g. 20", litres: 5 },
                      { label: "1L bottles", key: "bottled1L", placeholder: "e.g. 100", litres: 1 },
                      { label: "500ml bottles", key: "bottled500ml", placeholder: "e.g. 200", litres: 0.5 },
                    ].map(({ label, key, placeholder, litres }) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                        <input type="number" min="0" placeholder={placeholder} value={prodForm[key as keyof typeof prodForm]}
                          onChange={(e) => setProdForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition" />
                        {prodForm[key as keyof typeof prodForm] && (
                          <p className="text-xs text-slate-400">= {((parseFloat(prodForm[key as keyof typeof prodForm]) || 0) * litres).toFixed(1)} L</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Waste / loss (litres)</label>
                    <input type="number" min="0" step="0.1" placeholder="e.g. 50" value={prodForm.wasteLitres}
                      onChange={(e) => setProdForm((f) => ({ ...f, wasteLitres: e.target.value }))}
                      className="w-48 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition" />
                  </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                  <button type="submit" disabled={prodLoading} className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition">
                    {prodLoading ? "Saving..." : "Log batch"}
                  </button>
                  <button type="button" onClick={() => setShowProdForm(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                  {prodError && <p className="text-sm text-rose-600">{prodError}</p>}
                </div>
              </form>
            </div>
          )}

          {/* Batches table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Batch history</p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">Production records</h2>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                ✓ Completing a batch auto-updates inventory
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left">
                    {["Batch","Date","Operator","Start m³","End m³","Actual (L)","Bottled (L)","Variance","20L","10L","5L","1L","500ml","Waste","Eff.","Status","Action"].map((h) => (
                      <th key={h} className="px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((batch) => {
                    const actualUsed = (batch.endMeter ?? 0) - (batch.startMeter ?? 0);
                    const totalBottledL = batch.bottled20L * 20 + (batch.bottled10L ?? 0) * 10 + batch.bottled5L * 5 + batch.bottled1L + (batch.bottled500ml ?? 0) * 0.5;
                    const variance = batch.variance ?? (actualUsed > 0 ? totalBottledL - actualUsed : 0);
                    const eff = batch.rawWaterLitres > 0 ? Math.round(((batch.rawWaterLitres - batch.wasteLitres) / batch.rawWaterLitres) * 100) : 0;
                    const varOk = Math.abs(variance) < 1;
                    return (
                      <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 font-mono text-xs font-bold text-slate-900">{batch.batchNumber}</td>
                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-xs">{new Date(batch.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</td>
                        <td className="px-3 py-3 text-slate-700 text-xs">{batch.operator}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-600">{batch.startMeter?.toLocaleString() ?? "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-600">{batch.endMeter?.toLocaleString() ?? "—"}</td>
                        <td className="px-3 py-3 text-blue-600 font-semibold text-xs">{actualUsed > 0 ? actualUsed.toFixed(1) : "—"}</td>
                        <td className="px-3 py-3 text-cyan-600 font-semibold text-xs">{totalBottledL.toFixed(1)}</td>
                        <td className="px-3 py-3 text-xs">
                          {actualUsed > 0 ? (
                            <span className={`font-black ${varOk ? "text-emerald-600" : variance < 0 ? "text-rose-600" : "text-amber-600"}`}>
                              {variance >= 0 ? "+" : ""}{variance.toFixed(1)} L
                              {!varOk && <span className="ml-1">{variance < 0 ? "⚠" : "△"}</span>}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-900 text-xs">{batch.bottled20L}</td>
                        <td className="px-3 py-3 text-slate-600 text-xs">{batch.bottled10L ?? 0}</td>
                        <td className="px-3 py-3 text-slate-600 text-xs">{batch.bottled5L}</td>
                        <td className="px-3 py-3 text-slate-600 text-xs">{batch.bottled1L}</td>
                        <td className="px-3 py-3 text-slate-600 text-xs">{batch.bottled500ml ?? 0}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs">{batch.wasteLitres}</td>
                        <td className="px-3 py-3 text-xs">
                          <span className={`font-bold ${eff >= 90 ? "text-emerald-600" : eff >= 75 ? "text-amber-600" : "text-rose-600"}`}>{eff}%</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge[batch.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {batch.status === "In progress" && (
                            <button onClick={() => updateProductionBatch(batch.id, { status: "Quality check" })}
                              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-2.5 py-1.5 transition whitespace-nowrap">
                              QC check
                            </button>
                          )}
                          {batch.status === "Quality check" && (
                            <div className="flex gap-1">
                              <button
                                disabled={completingBatch === batch.id}
                                onClick={async () => {
                                  setCompletingBatch(batch.id);
                                  try { await completeProductionBatch(batch.id, batch); }
                                  finally { setCompletingBatch(null); }
                                }}
                                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 transition whitespace-nowrap"
                                title="Complete — deducts treated water, adds bottled stock">
                                {completingBatch === batch.id ? "…" : "✓ Complete"}
                              </button>
                              <button onClick={() => updateProductionBatch(batch.id, { status: "Rejected" })}
                                className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-2 py-1.5 transition">✗</button>
                            </div>
                          )}
                          {batch.status === "Completed" && (
                            <span className="text-xs text-emerald-600 font-semibold whitespace-nowrap">Inventory updated ✓</span>
                          )}
                          {batch.status === "Rejected" && <span className="text-xs text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {batches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <p className="text-4xl mb-3">🏭</p>
                <p className="font-medium text-sm">No production batches yet</p>
                <button onClick={() => setShowProdForm(true)} className="mt-3 text-blue-600 hover:text-blue-700 font-semibold text-sm">Log your first batch →</button>
              </div>
            )}
          </div>
        </>)}

        {/* Transfer Modal */}
        {transferModal.open && transferModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Transfer Stock</h2>
              <p className="text-sm text-slate-500 mb-6">
                Move <span className="font-bold text-slate-800">{transferModal.item.name}</span> from Main Store to Production Floor.
              </p>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Main Store</p>
                  <p className="text-lg font-black text-slate-800">{transferModal.item.stock}</p>
                </div>
                <div className="text-slate-400">→</div>
                <div className="flex-1 rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Prod. Floor</p>
                  <p className="text-lg font-black text-emerald-600">{transferModal.item.productionStock || 0}</p>
                </div>
              </div>

              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Quantity to transfer</label>
                  <input
                    type="number"
                    min="1"
                    max={transferModal.item.stock}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder={`Max: ${transferModal.item.stock}`}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 focus:bg-white transition"
                    autoFocus
                    required
                  />
                </div>
                
                {transferError && <p className="text-sm text-rose-600 font-medium">{transferError}</p>}
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={transferLoading}
                    className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold py-3 text-sm transition"
                  >
                    {transferLoading ? "Transferring..." : "Transfer stock"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTransferModal({ open: false, item: null }); setTransferAmount(""); setTransferError(""); }}
                    className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </SiteShell>
  );
}
