"use client";

import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import {
  createPurchaseOrderRecord,
  createSupplierRecord,
  subscribeToPurchaseOrders,
  subscribeToSuppliers,
  receivePurchaseOrder,
  approvePurchaseOrder,
  type PurchaseOrderRecord,
  type SupplierRecord,
} from "@/lib/commerce";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const initialSuppliers: SupplierRecord[] = [
  { id: "supplier-1", name: "BlueCore Chemicals", category: "Treatment chemicals", contact: "+254 700 011 221", nextDelivery: "May 25", status: "On track", createdAt: new Date().toISOString() },
  { id: "supplier-2", name: "PureFlow Bottles", category: "Packaging", contact: "+254 712 001 445", nextDelivery: "May 27", status: "Pending approval", createdAt: new Date().toISOString() },
  { id: "supplier-3", name: "RouteMaster Logistics", category: "Distribution", contact: "+254 733 987 102", nextDelivery: "May 28", status: "Confirmed", createdAt: new Date().toISOString() },
];

const initialOrders: PurchaseOrderRecord[] = [
  { id: "PO-1101", supplier: "BlueCore Chemicals", item: "Chlorine tablets", quantity: "500 kg", payment: "Paid", status: "Received", createdAt: new Date().toISOString() },
  { id: "PO-1104", supplier: "PureFlow Bottles", item: "20L bottle caps", quantity: "4,000 pcs", payment: "Pending", status: "Pending", createdAt: new Date().toISOString() },
  { id: "PO-1107", supplier: "RouteMaster Logistics", item: "Last-mile delivery", quantity: "18 routes", payment: "Scheduled", status: "Pending", createdAt: new Date().toISOString() },
];

const statusStyles: Record<string, string> = {
  "On track": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Confirmed": "bg-sky-50 text-sky-700 border-sky-200",
  "Pending approval": "bg-amber-50 text-amber-700 border-amber-200",
};

const paymentStyles: Record<string, string> = {
  Paid: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Scheduled: "bg-sky-50 text-sky-700",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(initialSuppliers);
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"suppliers" | "orders">("suppliers");
  const [supplierForm, setSupplierForm] = useState({ name: "", category: "", contact: "", nextDelivery: "" });
  const [poForm, setPoForm] = useState({ supplier: "", item: "", quantity: "", payment: "Pending" });
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [poLoading, setPoLoading] = useState(false);
  const [supplierError, setSupplierError] = useState("");
  const [poError, setPoError] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPoForm, setShowPoForm] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeToSuppliers((next) => setSuppliers(next.length > 0 ? next : initialSuppliers));
    const unsub2 = subscribeToPurchaseOrders((next) => setOrders(next.length > 0 ? next : initialOrders));
    return () => { unsub1(); unsub2(); };
  }, []);

  const pendingApprovals = useMemo(
    () => suppliers.filter((s) => s.status === "Pending approval").length,
    [suppliers]
  );

  const pendingPayments = useMemo(
    () => orders.filter((o) => o.payment === "Pending").length,
    [orders]
  );

  const addSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) { setSupplierError("Supplier name is required."); return; }
    setSupplierLoading(true);
    setSupplierError("");
    try {
      await createSupplierRecord({
        name: supplierForm.name.trim(),
        category: supplierForm.category.trim() || "General",
        contact: supplierForm.contact.trim() || "—",
        nextDelivery: supplierForm.nextDelivery || "TBC",
        status: "Pending approval",
      });
      setSupplierForm({ name: "", category: "", contact: "", nextDelivery: "" });
      setShowSupplierForm(false);
    } catch {
      setSupplierError("Unable to save supplier. Please try again.");
    } finally {
      setSupplierLoading(false);
    }
  };

  const addPurchaseOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!poForm.item.trim()) { setPoError("Item description is required."); return; }
    setPoLoading(true);
    setPoError("");
    try {
      await createPurchaseOrderRecord({
        supplier: poForm.supplier || suppliers[0]?.name || "Unknown",
        item: poForm.item.trim(),
        quantity: poForm.quantity.trim() || "TBD",
        payment: poForm.payment,
      });
      setPoForm({ supplier: "", item: "", quantity: "", payment: "Pending" });
      setShowPoForm(false);
    } catch {
      setPoError("Unable to save purchase order. Please try again.");
    } finally {
      setPoLoading(false);
    }
  };

  const downloadPO = (order: PurchaseOrderRecord) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Purchase Order: ${order.id}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 32);
    doc.text(`Supplier: ${order.supplier}`, 14, 40);
    doc.text(`Payment Status: ${order.payment}`, 14, 48);

    autoTable(doc, {
      startY: 60,
      head: [["Item", "Quantity"]],
      body: [
        [order.item, order.quantity]
      ],
      theme: "striped",
      headStyles: { fillColor: [14, 165, 233] },
    });

    doc.save(`PO_${order.id}.pdf`);
  };

  return (
    <SiteShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600 mb-1">Procurement</p>
            <h1 className="text-3xl font-bold text-slate-900">Suppliers</h1>
            <p className="text-slate-500 mt-1 text-sm">Manage supplier contracts, delivery schedules, and purchase orders.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowSupplierForm((v) => !v); setShowPoForm(false); setSupplierError(""); }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add supplier
            </button>
            <button
              onClick={() => { setShowPoForm((v) => !v); setShowSupplierForm(false); setPoError(""); }}
              className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New PO
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Suppliers on contract", value: suppliers.length.toString(), color: "text-sky-600" },
            { label: "Pending approvals", value: pendingApprovals.toString(), color: pendingApprovals > 0 ? "text-amber-600" : "text-emerald-600" },
            { label: "Purchase orders", value: orders.length.toString(), color: "text-blue-600" },
            { label: "Pending payments", value: pendingPayments.toString(), color: pendingPayments > 0 ? "text-rose-600" : "text-emerald-600" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
              <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Add supplier form */}
        {showSupplierForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">New supplier</h2>
            <form onSubmit={addSupplier} className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Supplier name *", key: "name", placeholder: "e.g. BlueCore Chemicals", type: "text" },
                { label: "Category", key: "category", placeholder: "e.g. Treatment chemicals", type: "text" },
                { label: "Contact", key: "contact", placeholder: "Phone or email", type: "text" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={supplierForm[key as keyof typeof supplierForm]}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                    required={key === "name"}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Next delivery</label>
                <input
                  type="date"
                  value={supplierForm.nextDelivery}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, nextDelivery: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button type="submit" disabled={supplierLoading} className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition">
                  {supplierLoading ? "Saving..." : "Save supplier"}
                </button>
                <button type="button" onClick={() => setShowSupplierForm(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                {supplierError && <p className="text-sm text-rose-600">{supplierError}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Add PO form */}
        {showPoForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">New purchase order</h2>
            <form onSubmit={addPurchaseOrder} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Supplier</label>
                <select
                  value={poForm.supplier}
                  onChange={(e) => setPoForm((f) => ({ ...f, supplier: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                >
                  {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Item *</label>
                <input
                  type="text"
                  placeholder="e.g. Carbon filters"
                  value={poForm.item}
                  onChange={(e) => setPoForm((f) => ({ ...f, item: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Quantity</label>
                <input
                  type="text"
                  placeholder="e.g. 500 pcs"
                  value={poForm.quantity}
                  onChange={(e) => setPoForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Payment status</label>
                <select
                  value={poForm.payment}
                  onChange={(e) => setPoForm((f) => ({ ...f, payment: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                >
                  <option>Pending</option>
                  <option>Scheduled</option>
                  <option>Paid</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button type="submit" disabled={poLoading} className="rounded-xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition">
                  {poLoading ? "Saving..." : "Submit PO"}
                </button>
                <button type="button" onClick={() => setShowPoForm(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                {poError && <p className="text-sm text-rose-600">{poError}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
          {(["suppliers", "orders"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition capitalize ${
                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "suppliers" ? `Suppliers (${suppliers.length})` : `Purchase Orders (${orders.length})`}
            </button>
          ))}
        </div>

        {/* Suppliers list */}
        {activeTab === "suppliers" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm shrink-0">
                    {supplier.name.charAt(0)}
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[supplier.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                    {supplier.status}
                  </span>
                </div>
                <p className="font-semibold text-slate-900">{supplier.name}</p>
                <p className="text-xs text-sky-600 font-semibold mt-0.5">{supplier.category}</p>
                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {supplier.contact}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                    </svg>
                    Next delivery: {supplier.nextDelivery}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Purchase orders table */}
        {activeTab === "orders" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">PO #</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Supplier</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Item</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Quantity</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Payment</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-900">{order.id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{order.supplier}</td>
                      <td className="px-6 py-4 text-slate-600">{order.item}</td>
                      <td className="px-6 py-4 text-slate-600">{order.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStyles[order.payment] ?? "bg-slate-100 text-slate-700"}`}>
                          {order.payment}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${order.status === "Received" ? "bg-emerald-50 text-emerald-700" : order.status === "Approved" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                          {order.status || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-3">
                        {(!order.status || order.status === "Pending") && (
                          <button onClick={() => approvePurchaseOrder(order.id)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Approve
                          </button>
                        )}
                        {order.status === "Approved" && (
                          <button onClick={() => receivePurchaseOrder(order.id, order.item, order.quantity)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold flex items-center gap-1 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Receive
                          </button>
                        )}
                        <button onClick={() => downloadPO(order)} className="text-sky-600 hover:text-sky-800 text-xs font-semibold flex items-center gap-1 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
