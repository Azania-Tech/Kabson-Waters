"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import SiteShell from "@/components/site-shell";
import { useAuth } from "@/context/AuthContext";
import {
  createOrderRecord,
  subscribeToOrders,
  updateOrderStatus,
  settleOrderPayment,
  createProductionBatch,
  subscribeToCustomers,
  type CustomerProfile,
  type CustomerOrderRecord,
} from "@/lib/commerce";

const starterOrders: CustomerOrderRecord[] = [
  { id: "ORD-2048", customer: "GreenLeaf Hotel",       type: "Bulk refill",    volume: "1,500L",   amount: 27000, paidAmount: 0,     status: "Scheduled",       due: "Today",      createdAt: new Date().toISOString() },
  { id: "ORD-2051", customer: "Maji House Restaurant", type: "Retail pack",    volume: "24 x 20L", amount: 6000,  paidAmount: 0,     status: "Processing",      due: "Tomorrow",   createdAt: new Date().toISOString() },
  { id: "ORD-2054", customer: "AquaPoint Retailers",   type: "Wholesale",      volume: "180 x 5L", amount: 12600, paidAmount: 12600, status: "Delivered",       due: "Completed",  createdAt: new Date().toISOString() },
];

const SERVICE_OPTIONS = [
  { label: "Retail purchase",       value: "Retail purchase" },
  { label: "Refill booking",        value: "Refill booking" },
  { label: "Outlet distribution",   value: "Outlet distribution" },
  { label: "1L Pack (KES 600/pack)", value: "1L Pack" },
];

const STATUS_STYLE: Record<string, string> = {
  Delivered:         "badge badge-green",
  Settled:           "badge badge-green",
  Scheduled:         "badge badge-blue",
  Processing:        "badge badge-amber",
  Approved:          "badge badge-blue",
  Rejected:          "badge badge-red",
  "Pending approval": "badge badge-slate",
};

// ── Invoice print helper ──────────────────────────────────────
function printInvoice(order: CustomerOrderRecord) {
  const balance = (order.amount ?? 0) - (order.paidAmount ?? 0);
  const html = `
    <html><head><title>Invoice ${order.id}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; color: #000; margin: 32px; }
      h1 { font-size: 22px; margin: 0; } h2 { font-size: 16px; color: #444; margin: 4px 0 0; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
      .logo { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #0891b2; }
      .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #666; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background: #f0fdff; padding: 9px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; text-align: left; border-bottom: 2px solid #0891b2; }
      td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
      .total-row td { font-weight: 700; background: #f0fdff; font-size: 15px; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; }
      .green { background: #d1fae5; color: #065f46; }
      .amber { background: #fef3c7; color: #92400e; }
      .footer { margin-top: 40px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      @media print { button { display: none; } }
    </style></head><body>
    <div class="header">
      <div>
        <div class="logo">KABSON WATERS</div>
        <div style="color:#0891b2;font-size:11px;margin-top:2px;">Pure · Reliable · Delivered</div>
      </div>
      <div style="text-align:right">
        <div class="label">Invoice</div>
        <h1 style="font-size:18px">${order.id}</h1>
        <div style="color:#666;font-size:11px;margin-top:4px">${new Date(order.createdAt).toLocaleDateString("en-KE",{day:"numeric",month:"long",year:"numeric"})}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div>
        <div class="label">Bill to</div>
        <div style="font-size:15px;font-weight:700;margin-top:4px">${order.customer}</div>
      </div>
      <div>
        <div class="label">Delivery date</div>
        <div style="margin-top:4px">${order.due}</div>
        <div class="label" style="margin-top:8px">Status</div>
        <span class="badge ${["Delivered","Settled"].includes(order.status) ? "green" : "amber"}">${order.status}</span>
      </div>
    </div>

    <table>
      <thead><tr><th>Description</th><th>Volume</th><th>Service type</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>${order.type}</td>
          <td>${order.volume}</td>
          <td>${order.type}</td>
          <td style="text-align:right">${order.amount != null ? "KES " + order.amount.toLocaleString() : "—"}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr><td colspan="3" style="text-align:right;font-weight:700">Total</td><td style="text-align:right;font-weight:700">${order.amount != null ? "KES " + order.amount.toLocaleString() : "—"}</td></tr>
        <tr><td colspan="3" style="text-align:right">Amount paid</td><td style="text-align:right">KES ${(order.paidAmount ?? 0).toLocaleString()}</td></tr>
        <tr class="total-row"><td colspan="3" style="text-align:right">Balance due</td><td style="text-align:right;color:${balance > 0 ? "#dc2626" : "#059669"}">${balance > 0 ? "KES " + balance.toLocaleString() : "PAID"}</td></tr>
      </tfoot>
    </table>

    ${order.notes ? `<div style="margin-top:20px;font-size:12px;color:#555"><strong>Notes:</strong> ${order.notes}</div>` : ""}

    <div class="footer">Thank you for your business · Kabson Waters · kabson-water.web.app</div>
    </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export default function CustomerPortalPage() {
  const { role } = useAuth();
  const canApprove = role === "manager" || role === "admin" || role === "owner";

  const [orders, setOrders] = useState<CustomerOrderRecord[]>(starterOrders);
  const [form, setForm] = useState({ customer: "", type: "Retail purchase", volume: "", amount: "", notes: "", due: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  // Invoice modal
  const [invoiceOrder, setInvoiceOrder] = useState<CustomerOrderRecord | null>(null);

  // Settle debt modal
  const [settleOrder, setSettleOrder] = useState<CustomerOrderRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState("");

  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    const term = customerSearch.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(term));
  }, [customers, customerSearch]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch customers
  useEffect(() => {
    const unsub = subscribeToCustomers(setCustomers);
    return () => unsub();
  }, []);

  // Auto-price 1L packs
  useEffect(() => {
    if (form.type === "1L Pack" && form.volume) {
      const qty = parseInt(form.volume.replace(/[^0-9]/g, "")) || 0;
      if (qty > 0) setForm(f => ({ ...f, amount: (qty * 600).toString() }));
    }
  }, [form.type, form.volume]);

  useEffect(() => {
    const unsub = subscribeToOrders(next => setOrders(next.length > 0 ? next : starterOrders));
    return () => unsub();
  }, []);

  const totals = useMemo(() => ({
    active:    orders.filter(o => !["Delivered","Settled","Rejected"].includes(o.status)).length,
    delivered: orders.filter(o => ["Delivered","Settled"].includes(o.status)).length,
    outstanding: orders.reduce((s, o) => s + Math.max(0, (o.amount ?? 0) - (o.paidAmount ?? 0)), 0),
  }), [orders]);

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await createOrderRecord({
        customerId: selectedCustomerId || undefined,
        customer: form.customer.trim() || "New customer",
        type: form.type,
        volume: form.volume.trim() || "Custom volume",
        amount: parseFloat(form.amount) || undefined,
        notes: form.notes.trim() || undefined,
        status: "Pending approval",
        due: form.due || "To be confirmed",
      });
      setForm({ customer: "", type: "Retail purchase", volume: "", amount: "", notes: "", due: "" });
      setCustomerSearch("");
      setSelectedCustomerId(null);
      setShowForm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setError("Could not save the order. Please try again."); }
    finally { setLoading(false); }
  };

  const handleOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId);
    try { await updateOrderStatus(orderId, status); }
    finally { setUpdatingOrder(null); }
  };

  const handleSendToProduction = async (order: CustomerOrderRecord) => {
    setUpdatingOrder(order.id);
    try {
      await createProductionBatch({
        batchNumber: `PRD-${order.id}`,
        rawWaterLitres: 0,
        wasteLitres: 0,
        startMeter: 0,
        endMeter: 0,
        expectedEndMeter: 0,
        variance: 0,
        status: "In progress",
        operator: "System",
        notes: `Customer Order: ${order.type} - ${order.volume}`,
        customerName: order.customer,
      });
      await updateOrderStatus(order.id, "Processing");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to send order to production.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleOrder) return;
    const amt = parseFloat(settleAmount);
    const balance = (settleOrder.amount ?? 0) - (settleOrder.paidAmount ?? 0);
    if (isNaN(amt) || amt <= 0) { setSettleError("Enter a valid amount."); return; }
    if (amt > balance) { setSettleError(`Amount exceeds balance of KES ${balance.toLocaleString()}.`); return; }
    setSettleLoading(true); setSettleError("");
    try {
      await settleOrderPayment(settleOrder.id, amt, settleOrder.paidAmount ?? 0);
      setSettleOrder(null); setSettleAmount("");
    } catch { setSettleError("Failed to record payment. Try again."); }
    finally { setSettleLoading(false); }
  };

  const inputCls = "input";

  return (
    <SiteShell>
      <div className="page-body page-stack">

        {/* Header */}
        <div className="rounded-3xl overflow-hidden relative" style={{
          background: "linear-gradient(135deg, #071e26 0%, #0c3847 40%, #0e5f77 70%, #0891b2 100%)",
          boxShadow: "0 8px 32px rgba(7,30,38,0.35)",
        }}>
          <div className="absolute inset-0 opacity-[0.06]">
            <svg viewBox="0 0 1440 300" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
              <path d="M0,150C240,100,480,200,720,150C960,100,1200,200,1440,150L1440,300L0,300Z" fill="white"/>
            </svg>
          </div>
          <div className="relative z-10 px-8 py-8 flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <p className="section-label text-cyan-300 mb-2">Customer portal</p>
              <h1 className="text-2xl font-black text-white">Orders & Delivery Tracking</h1>
              <p className="text-white/50 text-sm mt-1 max-w-xl">
                Place orders, track deliveries, view invoices, and settle outstanding balances.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <button onClick={() => setShowForm(v => !v)}
                  className="btn btn-pill" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
                  {showForm ? "Cancel" : "+ Place new order"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:w-80 shrink-0">
              {[
                { label: "Active orders",   value: totals.active.toString(),                     color: "#22d3ee" },
                { label: "Delivered",       value: totals.delivered.toString(),                  color: "#34d399" },
                { label: "Outstanding",     value: `KES ${totals.outstanding.toLocaleString()}`, color: totals.outstanding > 0 ? "#fbbf24" : "#34d399" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl px-3 py-3" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-white/45 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Success */}
        {success && (
          <div className="alert-banner alert-emerald">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Order submitted. It will appear below once processed.
          </div>
        )}

        {/* New order form */}
        {showForm && (
          <div className="panel">
            <div className="panel-head pb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div>
                <p className="section-label">New order</p>
                <h2 className="panel-title mt-0.5">Place an order request</h2>
              </div>
            </div>
            <div className="panel-body">
              <form onSubmit={submitOrder} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="field relative" ref={dropdownRef}>
                  <label className="label">Customer / outlet name</label>
                  <div className="relative">
                    <input className={inputCls} placeholder="Type to search or enter name…" value={customerSearch}
                      onChange={e => {
                        setCustomerSearch(e.target.value);
                        setForm(f => ({ ...f, customer: e.target.value }));
                        setSelectedCustomerId(null);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                    {selectedCustomerId && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 badge badge-violet text-[10px] font-bold">
                        Selected
                      </span>
                    )}
                  </div>
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl border bg-white p-1.5 shadow-xl" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)", backdropFilter: "blur(8px)" }}>
                      {filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-slate-50 transition font-medium flex items-center justify-between"
                          style={{ color: "var(--text-primary)" }}
                          onClick={() => {
                            setCustomerSearch(c.name);
                            setForm(f => ({ ...f, customer: c.name }));
                            setSelectedCustomerId(c.id);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <span>{c.name}</span>
                          {c.phone && <span className="text-xs text-slate-400 font-mono">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label className="label">Service type</label>
                  <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {SERVICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">
                    Volume / quantity
                    {form.type === "1L Pack" && <span className="ml-1 text-cyan-600 font-normal normal-case">(packs · KES 600 each)</span>}
                  </label>
                  <input className={inputCls}
                    placeholder={form.type === "1L Pack" ? "e.g. 20 packs" : "e.g. 30 x 20L"}
                    value={form.volume}
                    onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Amount (KES)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>KES</span>
                    <input className={`${inputCls} pl-11`} type="number" min="0" placeholder="e.g. 12000"
                      value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  {form.type === "1L Pack" && form.amount && (
                    <p className="text-xs text-cyan-600 mt-1 font-semibold">
                      {parseInt(form.volume) || 0} packs × KES 600 = KES {((parseInt(form.volume) || 0) * 600).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label className="label">Preferred delivery date</label>
                  <input className={inputCls} type="date" value={form.due}
                    onChange={e => setForm(f => ({ ...f, due: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Notes (optional)</label>
                  <input className={inputCls} placeholder="Special instructions…" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? "Saving…" : "Submit order"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                  {error && <p className="text-sm text-rose-600">{error}</p>}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Orders table */}
        <div className="table-wrap">
          <div className="px-5 py-4 border-b flex items-center justify-between gap-4 flex-wrap" style={{ borderColor: "var(--border-subtle)" }}>
            <div>
              <p className="section-label">Activity</p>
              <h2 className="panel-title mt-0.5">Order & delivery history</h2>
            </div>
            <span className="badge badge-slate">{orders.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Volume</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const balance = (order.amount ?? 0) - (order.paidAmount ?? 0);
                  return (
                    <tr key={order.id}>
                      <td className="font-mono text-xs font-bold" style={{ color: "var(--text-primary)" }}>{order.id}</td>
                      <td className="font-semibold">{order.customer}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{order.type}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{order.volume}</td>
                      <td className="font-semibold num">
                        {order.amount != null ? `KES ${order.amount.toLocaleString()}` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td className="font-bold num" style={{ color: balance > 0 ? "#dc2626" : "#059669" }}>
                        {order.amount != null ? (balance > 0 ? `KES ${balance.toLocaleString()}` : "Paid") : "—"}
                      </td>
                      <td><span className={STATUS_STYLE[order.status] ?? "badge badge-slate"}>{order.status}</span></td>
                      <td style={{ color: "var(--text-muted)" }}>{order.due}</td>
                      <td>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Invoice */}
                          <button onClick={() => setInvoiceOrder(order)}
                            className="btn btn-secondary btn-sm flex items-center gap-1" title="View / print invoice">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            Invoice
                          </button>

                          {/* Settle debt — show if there's an outstanding balance */}
                          {order.amount != null && balance > 0 && canApprove && (
                            <button onClick={() => { setSettleOrder(order); setSettleAmount(""); setSettleError(""); }}
                              className="btn btn-success btn-sm flex items-center gap-1" title="Settle payment">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" /></svg>
                              Settle
                            </button>
                          )}

                          {/* Approve/reject/send to production for managers+ */}
                          {canApprove && (order.status === "Pending approval" || order.status === "Scheduled") && (
                            <>
                              <button onClick={() => handleSendToProduction(order)} disabled={updatingOrder === order.id}
                                className="btn btn-sm btn-primary disabled:opacity-50 flex items-center gap-1" title="Send to Production">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                {updatingOrder === order.id ? "…" : "To Prod"}
                              </button>
                              <button onClick={() => handleOrderStatus(order.id, "Approved")} disabled={updatingOrder === order.id}
                                className="btn btn-sm btn-secondary disabled:opacity-50">
                                {updatingOrder === order.id ? "…" : "Approve"}
                              </button>
                              <button onClick={() => handleOrderStatus(order.id, "Rejected")} disabled={updatingOrder === order.id}
                                className="btn btn-sm btn-danger disabled:opacity-50">
                                {updatingOrder === order.id ? "…" : "Reject"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="font-semibold text-sm">No orders yet</p>
              <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm mt-3">Place first order</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Invoice modal ─────────────────────────────────────── */}
      {invoiceOrder && (
        <div className="modal-backdrop" onClick={() => setInvoiceOrder(null)}>
          <div className="modal max-w-lg w-full" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="section-label mb-1">Invoice</p>
                <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{invoiceOrder.id}</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {new Date(invoiceOrder.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setInvoiceOrder(null)} className="btn btn-ghost btn-icon rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Bill to */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-card-2)", border: "1px solid var(--border-subtle)" }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="label">Bill to</p>
                  <p className="font-bold text-base">{invoiceOrder.customer}</p>
                </div>
                <div>
                  <p className="label">Status</p>
                  <span className={STATUS_STYLE[invoiceOrder.status] ?? "badge badge-slate"}>{invoiceOrder.status}</span>
                  <p className="label mt-2">Due</p>
                  <p className="font-semibold text-sm">{invoiceOrder.due}</p>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid var(--border-subtle)" }}>
              <table className="w-full text-sm">
                <thead style={{ background: "#f0fdff" }}>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Description</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Volume</th>
                    <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <td className="px-4 py-3 font-semibold">{invoiceOrder.type}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{invoiceOrder.volume}</td>
                    <td className="px-4 py-3 text-right font-bold num">
                      {invoiceOrder.amount != null ? `KES ${invoiceOrder.amount.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  {(() => {
                    const balance = (invoiceOrder.amount ?? 0) - (invoiceOrder.paidAmount ?? 0);
                    return (
                      <>
                        <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
                          <td colSpan={2} className="px-4 py-2 text-right font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>Amount paid</td>
                          <td className="px-4 py-2 text-right font-semibold num text-emerald-600">KES {(invoiceOrder.paidAmount ?? 0).toLocaleString()}</td>
                        </tr>
                        <tr style={{ background: "#f0fdff" }}>
                          <td colSpan={2} className="px-4 py-3 text-right font-black">Balance due</td>
                          <td className={`px-4 py-3 text-right font-black text-lg num ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {balance > 0 ? `KES ${balance.toLocaleString()}` : "PAID ✓"}
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tfoot>
              </table>
            </div>

            {invoiceOrder.notes && (
              <p className="text-sm mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
                <strong>Notes:</strong> {invoiceOrder.notes}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => printInvoice(invoiceOrder)} className="btn btn-primary flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" /></svg>
                Print invoice
              </button>
              <button onClick={() => setInvoiceOrder(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settle payment modal ──────────────────────────────── */}
      {settleOrder && (
        <div className="modal-backdrop" onClick={() => setSettleOrder(null)}>
          <div className="modal max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="section-label mb-1">Settle payment</p>
                <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{settleOrder.customer}</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{settleOrder.id} · {settleOrder.type}</p>
              </div>
              <button onClick={() => setSettleOrder(null)} className="btn btn-ghost btn-icon rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Balance summary */}
            <div className="rounded-2xl p-4 mb-5 grid grid-cols-3 gap-3" style={{ background: "var(--bg-card-2)", border: "1px solid var(--border-subtle)" }}>
              {[
                { label: "Invoice total", value: `KES ${(settleOrder.amount ?? 0).toLocaleString()}`, color: "var(--text-primary)" },
                { label: "Paid so far",   value: `KES ${(settleOrder.paidAmount ?? 0).toLocaleString()}`, color: "#10b981" },
                { label: "Balance due",   value: `KES ${((settleOrder.amount ?? 0) - (settleOrder.paidAmount ?? 0)).toLocaleString()}`, color: "#dc2626" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                  <p className="font-black num" style={{ color: s.color, fontSize: "1rem" }}>{s.value}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSettle} className="space-y-4">
              <div className="field">
                <label className="label">Amount to settle (KES)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>KES</span>
                  <input className="input pl-11" type="number" min="1"
                    max={(settleOrder.amount ?? 0) - (settleOrder.paidAmount ?? 0)}
                    placeholder={`Max KES ${((settleOrder.amount ?? 0) - (settleOrder.paidAmount ?? 0)).toLocaleString()}`}
                    value={settleAmount} onChange={e => setSettleAmount(e.target.value)} autoFocus required />
                </div>
                {/* Quick-fill buttons */}
                <div className="flex gap-2 mt-2">
                  {[0.25, 0.5, 1].map(pct => {
                    const bal = (settleOrder.amount ?? 0) - (settleOrder.paidAmount ?? 0);
                    const amt = Math.round(bal * pct);
                    return (
                      <button key={pct} type="button" onClick={() => setSettleAmount(amt.toString())}
                        className="btn btn-ghost btn-sm text-xs">
                        {pct === 1 ? "Full" : `${pct * 100}%`} (KES {amt.toLocaleString()})
                      </button>
                    );
                  })}
                </div>
              </div>

              {settleError && <div className="alert-banner alert-rose text-sm">{settleError}</div>}

              <div className="flex gap-3">
                <button type="submit" disabled={settleLoading} className="btn btn-success flex-1">
                  {settleLoading ? "Recording…" : "Record payment"}
                </button>
                <button type="button" onClick={() => setSettleOrder(null)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </SiteShell>
  );
}
