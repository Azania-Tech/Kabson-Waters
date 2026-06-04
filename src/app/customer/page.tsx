"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import { useAuth } from "@/context/AuthContext";
import {
  createOrderRecord,
  subscribeToOrders,
  updateOrderStatus,
  type CustomerOrderRecord,
} from "@/lib/commerce";

const starterOrders: CustomerOrderRecord[] = [
  { id: "ORD-2048", customer: "GreenLeaf Hotel", type: "Bulk refill", volume: "1,500L", status: "Scheduled", due: "Today", createdAt: new Date().toISOString() },
  { id: "ORD-2051", customer: "Maji House Restaurant", type: "Retail pack", volume: "24 x 20L", status: "Processing", due: "Tomorrow", createdAt: new Date().toISOString() },
  { id: "ORD-2054", customer: "AquaPoint Retailers", type: "Wholesale", volume: "180 x 5L", status: "Delivered", due: "Completed", createdAt: new Date().toISOString() },
];

const serviceOptions = [
  { label: "Retail purchase", value: "Retail purchase" },
  { label: "Refill booking", value: "Refill booking" },
  { label: "Outlet distribution", value: "Outlet distribution" },
];

const statusStyles: Record<string, string> = {
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  Processing: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-blue-50 text-blue-700 border-blue-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  "Pending approval": "bg-slate-100 text-slate-600 border-slate-200",
};

export default function CustomerPortalPage() {
  const { role } = useAuth();
  const canApprove = role === "manager" || role === "admin" || role === "owner";
  const [orders, setOrders] = useState<CustomerOrderRecord[]>(starterOrders);
  const [form, setForm] = useState({ customer: "", type: "Retail purchase", volume: "", due: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((next) => {
      setOrders(next.length > 0 ? next : starterOrders);
    });
    return () => unsubscribe();
  }, []);

  const totals = useMemo(() => ({
    active: orders.filter((o) => o.status !== "Delivered").length,
    delivered: orders.filter((o) => o.status === "Delivered").length,
  }), [orders]);

  const submitOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createOrderRecord({
        customer: form.customer.trim() || "New customer",
        type: form.type,
        volume: form.volume.trim() || "Custom volume",
        status: "Pending approval",
        due: form.due || "To be confirmed",
      });
      setForm({ customer: "", type: "Retail purchase", volume: "", due: "" });
      setShowForm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Could not save the order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId);
    try {
      await updateOrderStatus(orderId, status);
    } finally {
      setUpdatingOrder(null);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">

        {/* Header */}
        <div className="rounded-[28px] bg-slate-950 p-8 text-white shadow-[0_25px_70px_rgba(15,23,42,0.2)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.15),transparent_60%)]" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 mb-2">Customer portal</p>
            <h1 className="text-3xl font-bold sm:text-4xl max-w-2xl">
              Manage retail orders, refill runs, and delivery visibility.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Request water packs, schedule refills, track invoices, and monitor service performance for homes, retailers, hotels, bars, and restaurants.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setShowForm((v) => !v)}
                className="rounded-full bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300 transition"
              >
                {showForm ? "Close form" : "Place new order"}
              </button>
              <Link
                href="/accounting"
                className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Review billing
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active requests", value: totals.active.toString(), color: "text-sky-600" },
            { label: "Completed deliveries", value: totals.delivered.toString(), color: "text-emerald-600" },
            { label: "Total orders", value: orders.length.toString(), color: "text-slate-900" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
              <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Order submitted successfully. It will appear in the tracker below.
          </div>
        )}

        {/* New order form */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">New order request</h2>
            <form onSubmit={submitOrder} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer / outlet name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunrise Hotel"
                  value={form.customer}
                  onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Service type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                >
                  {serviceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Volume / package</label>
                <input
                  type="text"
                  placeholder="e.g. 30 x 20L or 500L refill"
                  value={form.volume}
                  onChange={(e) => setForm((f) => ({ ...f, volume: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Preferred delivery date</label>
                <input
                  type="date"
                  value={form.due}
                  onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition"
                >
                  {loading ? "Saving..." : "Submit order"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Cancel
                </button>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Services grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Refill scheduling", "Automated reminders for repeat buyers and bulk outlets"],
            ["Approved pricing", "Segmented pricing for retail, hotels, and wholesalers"],
            ["Credit visibility", "Outstanding balances and invoice due reminders"],
            ["Distribution routes", "Route planning for trucks, local vendors, and refill vans"],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
            </div>
          ))}
        </div>

        {/* Orders table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Activity</p>
              <h2 className="mt-0.5 text-lg font-semibold text-slate-900">Order & refill history</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {orders.length} records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left">
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Order</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Customer</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Service</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Volume</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Due</th>
                  {canApprove && <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-900">{order.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{order.customer}</td>
                    <td className="px-6 py-4 text-slate-600">{order.type}</td>
                    <td className="px-6 py-4 text-slate-600">{order.volume}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{order.due}</td>
                    {canApprove && (
                      <td className="px-6 py-4">
                        {order.status === "Pending approval" ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleOrderStatus(order.id, "Approved")} disabled={updatingOrder === order.id}
                              className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                              {updatingOrder === order.id ? "..." : "Approve"}
                            </button>
                            <button onClick={() => handleOrderStatus(order.id, "Rejected")} disabled={updatingOrder === order.id}
                              className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                              {updatingOrder === order.id ? "..." : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
