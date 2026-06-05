"use client";

import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import {
  subscribeToSales, subscribeToInventory, subscribeToCustomers,
  subscribeToAccountingTransactions,
  type RetailSale, type InventoryItem, type CustomerProfile,
  type AccountingTransactionRecord,
} from "@/lib/commerce";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => `KES ${n.toLocaleString()}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const parseAmt = (s: string) => Number(s.replace(/[^0-9.-]+/g, "")) || 0;

type ReportType = "daily" | "item-sales" | "inventory" | "z-report" | "period" | "payment";

// ─── print helper ────────────────────────────────────────────────────────────
function printSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>Kabson Waters Report</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
      th { background: #f0f0f0; font-weight: bold; }
      h1 { font-size: 18px; } h2 { font-size: 14px; color: #444; }
      .stat { display: inline-block; margin: 8px 16px 8px 0; }
      .stat-val { font-size: 20px; font-weight: bold; }
      @media print { button { display: none; } }
    </style>
    </head><body>${el.innerHTML}</body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

export default function ReportsPage() {
  const [sales, setSales] = useState<RetailSale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [transactions, setTransactions] = useState<AccountingTransactionRecord[]>([]);
  const [activeReport, setActiveReport] = useState<ReportType>("daily");
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()));
  const [periodFrom, setPeriodFrom] = useState(isoDate(new Date(Date.now() - 7 * 86400000)));
  const [periodTo, setPeriodTo] = useState(isoDate(new Date()));

  useEffect(() => {
    const u1 = subscribeToSales(setSales);
    const u2 = subscribeToInventory(setInventory);
    const u3 = subscribeToCustomers(setCustomers);
    const u4 = subscribeToAccountingTransactions(setTransactions);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // ── Daily sales ───────────────────────────────────────────────────────────
  const dailySales = useMemo(() =>
    sales.filter((s) => s.createdAt.startsWith(selectedDate)),
    [sales, selectedDate]);

  const dailyMetrics = useMemo(() => {
    const revenue = dailySales.reduce((s, x) => s + x.total, 0);
    const byMethod = dailySales.reduce((acc, s) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] ?? 0) + s.total;
      return acc;
    }, {} as Record<string, number>);
    const vat = Math.round(revenue * 0.16 / 1.16);
    return { revenue, count: dailySales.length, avg: dailySales.length ? Math.round(revenue / dailySales.length) : 0, vat, net: revenue - vat, byMethod };
  }, [dailySales]);

  // ── Item sales ────────────────────────────────────────────────────────────
  const itemSalesData = useMemo(() => {
    const periodSales = sales.filter((s) => s.createdAt >= periodFrom && s.createdAt <= periodTo + "T23:59:59");
    const map: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {};
    periodSales.forEach((sale) => {
      sale.items.forEach((si) => {
        const inv = inventory.find((i) => i.id === si.itemId);
        const name = inv?.name ?? si.itemId;
        const sku = inv?.sku ?? "—";
        if (!map[si.itemId]) map[si.itemId] = { name, sku, qty: 0, revenue: 0 };
        map[si.itemId].qty += si.quantity;
        map[si.itemId].revenue += si.quantity * si.price;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales, inventory, periodFrom, periodTo]);

  const itemSalesPeriodRevenue = useMemo(() => itemSalesData.reduce((s, x) => s + x.revenue, 0), [itemSalesData]);
  const itemSalesPeriodQty = useMemo(() => itemSalesData.reduce((s, x) => s + x.qty, 0), [itemSalesData]);

  // ── Inventory report ──────────────────────────────────────────────────────
  const invMetrics = useMemo(() => {
    const totalValue = inventory.reduce((s, i) => s + i.price * i.stock, 0);
    const lowStock = inventory.filter((i) => i.stock <= i.reorderPoint);
    const outOfStock = inventory.filter((i) => i.stock === 0);
    const categories = [...new Set(inventory.map((i) => i.category))];
    const byCat = categories.map((cat) => {
      const items = inventory.filter((i) => i.category === cat);
      return { cat, count: items.length, value: items.reduce((s, i) => s + i.price * i.stock, 0) };
    }).sort((a, b) => b.value - a.value);
    return { totalValue, lowStock, outOfStock, totalSkus: inventory.length, byCat };
  }, [inventory]);

  // ── Z-Report (end of day) ─────────────────────────────────────────────────
  const zSales = useMemo(() =>
    sales.filter((s) => s.createdAt.startsWith(selectedDate)),
    [sales, selectedDate]);

  const zMetrics = useMemo(() => {
    const gross = zSales.reduce((s, x) => s + x.total, 0);
    const vat = Math.round(gross * 0.16 / 1.16);
    const net = gross - vat;
    const expenses = transactions
      .filter((t) => t.type === "Expense" && t.createdAt.startsWith(selectedDate))
      .reduce((s, t) => s + parseAmt(t.amount), 0);
    const profit = net - expenses;
    const byMethod = zSales.reduce((acc, s) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] ?? 0) + s.total;
      return acc;
    }, {} as Record<string, number>);
    // item breakdown
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    zSales.forEach((sale) => {
      sale.items.forEach((si) => {
        const inv = inventory.find((i) => i.id === si.itemId);
        const name = inv?.name ?? si.itemId;
        if (!itemMap[si.itemId]) itemMap[si.itemId] = { name, qty: 0, revenue: 0 };
        itemMap[si.itemId].qty += si.quantity;
        itemMap[si.itemId].revenue += si.quantity * si.price;
      });
    });
    const items = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
    return { gross, vat, net, expenses, profit, count: zSales.length, byMethod, items };
  }, [zSales, inventory, transactions, selectedDate]);

  // ── Period report ─────────────────────────────────────────────────────────
  const periodSalesList = useMemo(() =>
    sales.filter((s) => s.createdAt >= periodFrom && s.createdAt <= periodTo + "T23:59:59"),
    [sales, periodFrom, periodTo]);

  const periodMetrics = useMemo(() => {
    const revenue = periodSalesList.reduce((s, x) => s + x.total, 0);
    const vat = Math.round(revenue * 0.16 / 1.16);
    // group by day
    const byDay: Record<string, number> = {};
    periodSalesList.forEach((s) => {
      const day = s.createdAt.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + s.total;
    });
    const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
    const maxDay = days.reduce((m, [, v]) => Math.max(m, v), 1);
    const expenses = transactions
      .filter((t) => t.type === "Expense" && t.createdAt >= periodFrom && t.createdAt <= periodTo + "T23:59:59")
      .reduce((s, t) => s + parseAmt(t.amount), 0);
    return { revenue, vat, net: revenue - vat, count: periodSalesList.length, days, maxDay, expenses, profit: revenue - expenses };
  }, [periodSalesList, transactions, periodFrom, periodTo]);

  // ── Payment method report ─────────────────────────────────────────────────
  const paymentData = useMemo(() => {
    const periodSales = sales.filter((s) => s.createdAt >= periodFrom && s.createdAt <= periodTo + "T23:59:59");
    const total = periodSales.reduce((s, x) => s + x.total, 0);
    const byMethod: Record<string, { count: number; revenue: number }> = {};
    periodSales.forEach((s) => {
      if (!byMethod[s.paymentMethod]) byMethod[s.paymentMethod] = { count: 0, revenue: 0 };
      byMethod[s.paymentMethod].count++;
      byMethod[s.paymentMethod].revenue += s.total;
    });
    return { total, byMethod: Object.entries(byMethod).sort(([, a], [, b]) => b.revenue - a.revenue) };
  }, [sales, periodFrom, periodTo]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const reports: { key: ReportType; label: string; icon: string; desc: string }[] = [
    { key: "daily", label: "Daily Sales", icon: "📅", desc: "All transactions for a selected date" },
    { key: "z-report", label: "Z-Report", icon: "🔒", desc: "End-of-day closure report" },
    { key: "item-sales", label: "Item Sales", icon: "📦", desc: "Sales breakdown per product" },
    { key: "inventory", label: "Inventory", icon: "🗃️", desc: "Stock levels, values & alerts" },
    { key: "period", label: "Period Report", icon: "📈", desc: "Revenue & expenses over a date range" },
    { key: "payment", label: "Payment Methods", icon: "💳", desc: "Revenue split by payment type" },
  ];

  const inputCls = "px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition";

  return (
    <SiteShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600 mb-1">Business reports</p>
            <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
            <p className="text-slate-500 mt-1 text-sm">Generate, view, and print operational reports.</p>
          </div>
        </div>

        {/* Report selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {reports.map((r) => (
            <button key={r.key} onClick={() => setActiveReport(r.key)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 text-center transition ${
                activeReport === r.key
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
              }`}>
              <span className="text-2xl">{r.icon}</span>
              <p className={`text-sm font-bold ${activeReport === r.key ? "text-blue-700" : "text-slate-900"}`}>{r.label}</p>
              <p className="text-xs text-slate-400 hidden sm:block leading-tight">{r.desc}</p>
            </button>
          ))}
        </div>

        {/* Date pickers */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          {(activeReport === "daily" || activeReport === "z-report") ? (
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={inputCls} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">From</label>
                <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">To</label>
                <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className={inputCls} />
              </div>
            </>
          )}
          <button
            onClick={() => printSection("report-content")}
            className="ml-auto flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            Print / Export
          </button>
        </div>

        {/* ── Report content ── */}
        <div id="report-content">

          {/* ── DAILY SALES REPORT ── */}
          {activeReport === "daily" && (
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-black text-blue-900 text-lg">Daily Sales Report</p>
                  <p className="text-blue-600 text-sm">{fmtDate(selectedDate + "T00:00:00")}</p>
                </div>
                <div className="flex gap-6 flex-wrap">
                  {[
                    { label: "Gross revenue", value: fmt(dailyMetrics.revenue) },
                    { label: "VAT (16%)", value: fmt(dailyMetrics.vat) },
                    { label: "Net revenue", value: fmt(dailyMetrics.net) },
                    { label: "Transactions", value: dailyMetrics.count.toString() },
                    { label: "Avg. sale", value: fmt(dailyMetrics.avg) },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">{s.label}</p>
                      <p className="text-xl font-black text-blue-900">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment method breakdown */}
              <div className="grid gap-4 sm:grid-cols-3">
                {Object.entries(dailyMetrics.byMethod).map(([method, amount]) => (
                  <div key={method} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{method}</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{fmt(amount)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {dailyMetrics.revenue > 0 ? Math.round((amount / dailyMetrics.revenue) * 100) : 0}% of daily revenue
                    </p>
                  </div>
                ))}
              </div>

              {/* Transaction list */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">All transactions — {fmtDate(selectedDate + "T00:00:00")}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left">
                        {["#","Time","Items","Payment","Gross","VAT","Net"].map((h) => (
                          <th key={h} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailySales.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">No sales on this date</td></tr>
                      ) : dailySales.map((sale, idx) => {
                        const vat = Math.round(sale.total * 0.16 / 1.16);
                        return (
                          <tr key={sale.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-400 text-xs">{idx + 1}</td>
                            <td className="px-5 py-3 text-slate-600">{fmtTime(sale.createdAt)}</td>
                            <td className="px-5 py-3 text-slate-700">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</td>
                            <td className="px-5 py-3 text-slate-700">{sale.paymentMethod}</td>
                            <td className="px-5 py-3 font-bold text-slate-900">{fmt(sale.total)}</td>
                            <td className="px-5 py-3 text-violet-600">{fmt(vat)}</td>
                            <td className="px-5 py-3 font-bold text-emerald-600">{fmt(sale.total - vat)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {dailySales.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={4} className="px-5 py-3 font-black text-slate-900 text-sm">TOTALS</td>
                          <td className="px-5 py-3 font-black text-slate-900">{fmt(dailyMetrics.revenue)}</td>
                          <td className="px-5 py-3 font-black text-violet-600">{fmt(dailyMetrics.vat)}</td>
                          <td className="px-5 py-3 font-black text-emerald-600">{fmt(dailyMetrics.net)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Z-REPORT ── */}
          {activeReport === "z-report" && (
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border-2 border-slate-900 bg-slate-950 text-white px-6 py-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">Z-Report — End of Day Closure</p>
                    <p className="text-2xl font-black mt-1">KABSON WATERS</p>
                    <p className="text-slate-400 text-sm">Date: {fmtDate(selectedDate + "T00:00:00")} · Generated: {new Date().toLocaleTimeString("en-KE")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total transactions</p>
                    <p className="text-4xl font-black text-sky-400">{zMetrics.count}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Gross sales", value: fmt(zMetrics.gross), color: "text-white" },
                    { label: "VAT collected", value: fmt(zMetrics.vat), color: "text-violet-300" },
                    { label: "Net revenue", value: fmt(zMetrics.net), color: "text-blue-300" },
                    { label: "Expenses", value: fmt(zMetrics.expenses), color: "text-rose-400" },
                    { label: "Est. Profit", value: fmt(zMetrics.profit), color: zMetrics.profit >= 0 ? "text-emerald-400" : "text-rose-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/10 border border-white/10 p-4">
                      <p className="text-xs text-slate-400 font-semibold">{s.label}</p>
                      <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {/* Payment summary */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="font-black text-slate-900 mb-4">Payment method summary</h2>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 text-left">
                      <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Method</th>
                      <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Txns</th>
                      <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Amount</th>
                      <th className="pb-2 font-bold text-slate-600 text-xs uppercase">%</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(zMetrics.byMethod).map(([method, amount]) => (
                        <tr key={method}>
                          <td className="py-2.5 font-semibold text-slate-900">{method}</td>
                          <td className="py-2.5 text-slate-600">{zSales.filter((s) => s.paymentMethod === method).length}</td>
                          <td className="py-2.5 font-bold text-slate-900">{fmt(amount)}</td>
                          <td className="py-2.5 text-slate-500">{zMetrics.gross > 0 ? Math.round((amount / zMetrics.gross) * 100) : 0}%</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-200 font-black">
                        <td className="pt-2">TOTAL</td>
                        <td className="pt-2">{zMetrics.count}</td>
                        <td className="pt-2 text-emerald-600">{fmt(zMetrics.gross)}</td>
                        <td className="pt-2">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Item breakdown */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="font-black text-slate-900 mb-4">Items sold today</h2>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 text-left">
                      <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Item</th>
                      <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Qty</th>
                      <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Revenue</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {zMetrics.items.map((item) => (
                        <tr key={item.name}>
                          <td className="py-2.5 font-semibold text-slate-900 truncate max-w-[160px]">{item.name}</td>
                          <td className="py-2.5 text-slate-600">{item.qty}</td>
                          <td className="py-2.5 font-bold text-emerald-600">{fmt(item.revenue)}</td>
                        </tr>
                      ))}
                      {zMetrics.items.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400 text-sm">No items sold</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expenses breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-black text-slate-900 mb-4">Expenses today</h2>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 text-left">
                    <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Description</th>
                    <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Category</th>
                    <th className="pb-2 font-bold text-slate-600 text-xs uppercase">Amount</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.filter((t) => t.type === "Expense" && t.createdAt.startsWith(selectedDate)).map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-2.5 font-semibold text-slate-900 truncate max-w-[200px]">{exp.note}</td>
                        <td className="py-2.5 text-slate-600">{exp.category}</td>
                        <td className="py-2.5 font-bold text-rose-600">{fmt(parseAmt(exp.amount))}</td>
                      </tr>
                    ))}
                    {transactions.filter((t) => t.type === "Expense" && t.createdAt.startsWith(selectedDate)).length === 0 && (
                      <tr><td colSpan={3} className="py-6 text-center text-slate-400 text-sm">No expenses recorded today</td></tr>
                    )}
                    {transactions.filter((t) => t.type === "Expense" && t.createdAt.startsWith(selectedDate)).length > 0 && (
                      <tr className="border-t-2 border-slate-200 font-black">
                        <td className="pt-2" colSpan={2}>TOTAL EXPENSES</td>
                        <td className="pt-2 text-rose-600">{fmt(zMetrics.expenses)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border-2 border-dashed border-slate-300 px-5 py-3 text-center text-xs text-slate-500 font-semibold tracking-wide">
                *** END OF Z-REPORT — KABSON WATERS — {fmtDate(selectedDate + "T00:00:00")} ***
              </div>
            </div>
          )}

          {/* ── ITEM SALES REPORT ── */}
          {activeReport === "item-sales" && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Products sold", value: itemSalesData.length.toString(), color: "text-blue-600" },
                  { label: "Total units", value: itemSalesPeriodQty.toLocaleString(), color: "text-slate-900" },
                  { label: "Total revenue", value: fmt(itemSalesPeriodRevenue), color: "text-emerald-600" },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{m.label}</p>
                    <p className={`text-2xl font-black mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Item sales breakdown</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtDate(periodFrom + "T00:00:00")} — {fmtDate(periodTo + "T00:00:00")}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left">
                        {["Rank","Product","SKU","Units sold","Revenue","% of total","Avg. price"].map((h) => (
                          <th key={h} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemSalesData.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">No sales in this period</td></tr>
                      ) : itemSalesData.map((item, idx) => (
                        <tr key={item.name} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-200 text-slate-700" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-bold text-slate-900">{item.name}</td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.sku}</td>
                          <td className="px-5 py-3 font-bold text-slate-900">{item.qty.toLocaleString()}</td>
                          <td className="px-5 py-3 font-bold text-emerald-600">{fmt(item.revenue)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-[80px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${itemSalesPeriodRevenue > 0 ? (item.revenue / itemSalesPeriodRevenue) * 100 : 0}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">
                                {itemSalesPeriodRevenue > 0 ? Math.round((item.revenue / itemSalesPeriodRevenue) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-600">{fmt(item.qty > 0 ? Math.round(item.revenue / item.qty) : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {itemSalesData.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={3} className="px-5 py-3 font-black text-slate-900 text-sm">TOTALS</td>
                          <td className="px-5 py-3 font-black text-slate-900">{itemSalesPeriodQty.toLocaleString()}</td>
                          <td className="px-5 py-3 font-black text-emerald-600">{fmt(itemSalesPeriodRevenue)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY REPORT ── */}
          {activeReport === "inventory" && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total SKUs", value: invMetrics.totalSkus.toString(), color: "text-blue-600" },
                  { label: "Inventory value", value: fmt(invMetrics.totalValue), color: "text-emerald-600" },
                  { label: "Low stock items", value: invMetrics.lowStock.length.toString(), color: invMetrics.lowStock.length > 0 ? "text-amber-600" : "text-emerald-600" },
                  { label: "Out of stock", value: invMetrics.outOfStock.length.toString(), color: invMetrics.outOfStock.length > 0 ? "text-rose-600" : "text-emerald-600" },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{m.label}</p>
                    <p className={`text-2xl font-black mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900 mb-4">Value by category</h2>
                <div className="space-y-3">
                  {invMetrics.byCat.map((c) => (
                    <div key={c.cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">{c.cat} <span className="text-slate-400 font-normal">({c.count} items)</span></span>
                        <span className="font-bold text-slate-900">{fmt(c.value)}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${invMetrics.totalValue > 0 ? (c.value / invMetrics.totalValue) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full inventory table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Complete stock list</h2>
                  <p className="text-xs text-slate-400 mt-0.5">As of {new Date().toLocaleString("en-KE")}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left">
                        {["Product","SKU","Category","Price","Stock","Reorder at","Status","Value"].map((h) => (
                          <th key={h} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventory.map((item) => {
                        const isLow = item.stock <= item.reorderPoint;
                        const isOut = item.stock === 0;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-bold text-slate-900">{item.name}</td>
                            <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.sku}</td>
                            <td className="px-5 py-3 text-slate-600">{item.category}</td>
                            <td className="px-5 py-3 font-semibold text-slate-900">KES {item.price.toLocaleString()}</td>
                            <td className={`px-5 py-3 font-black ${isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>{item.stock}</td>
                            <td className="px-5 py-3 text-slate-500">{item.reorderPoint}</td>
                            <td className="px-5 py-3">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isOut ? "bg-rose-50 text-rose-700" : isLow ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                                {isOut ? "Out of stock" : isLow ? "Low stock" : "In stock"}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-bold text-slate-900">KES {(item.stock * item.price).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={7} className="px-5 py-3 font-black text-slate-900 text-sm">TOTAL INVENTORY VALUE</td>
                        <td className="px-5 py-3 font-black text-emerald-600">{fmt(invMetrics.totalValue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PERIOD REPORT ── */}
          {activeReport === "period" && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Gross revenue", value: fmt(periodMetrics.revenue), color: "text-emerald-600" },
                  { label: "VAT collected", value: fmt(periodMetrics.vat), color: "text-violet-600" },
                  { label: "Net revenue", value: fmt(periodMetrics.net), color: "text-blue-600" },
                  { label: "Transactions", value: periodMetrics.count.toString(), color: "text-slate-900" },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{m.label}</p>
                    <p className={`text-2xl font-black mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Daily bar chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900 mb-4">Revenue by day</h2>
                {periodMetrics.days.length === 0 ? (
                  <p className="text-sm text-slate-400">No sales in this period.</p>
                ) : (
                  <div className="space-y-2.5">
                    {periodMetrics.days.map(([day, rev]) => (
                      <div key={day} className="flex items-center gap-3">
                        <span className="w-24 text-xs text-slate-500 shrink-0 text-right">{fmtDate(day + "T00:00:00")}</span>
                        <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                          <div className="h-full bg-blue-500 rounded-lg transition-all" style={{ width: `${(rev / periodMetrics.maxDay) * 100}%` }} />
                          {rev > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-700">{fmt(rev)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* P&L summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900 mb-4">Profit & Loss summary</h2>
                <div className="space-y-3">
                  {[
                    { label: "Gross revenue", value: periodMetrics.revenue, color: "text-emerald-600", sign: "+" },
                    { label: "VAT (16%)", value: periodMetrics.vat, color: "text-violet-600", sign: "−" },
                    { label: "Net revenue", value: periodMetrics.net, color: "text-blue-600", sign: "" },
                    { label: "Recorded expenses", value: periodMetrics.expenses, color: "text-rose-600", sign: "−" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                      <span className="text-sm font-semibold text-slate-700">{row.label}</span>
                      <span className={`font-black text-base ${row.color}`}>{row.sign} {fmt(row.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200">
                    <span className="font-black text-slate-900">Estimated profit</span>
                    <span className={`font-black text-xl ${periodMetrics.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(periodMetrics.profit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PAYMENT METHOD REPORT ── */}
          {activeReport === "payment" && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total revenue</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(paymentData.total)}</p>
                  <p className="text-xs text-slate-400 mt-1">{fmtDate(periodFrom + "T00:00:00")} — {fmtDate(periodTo + "T00:00:00")}</p>
                </div>
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="font-bold text-slate-900 mb-4">Revenue by payment method</h2>
                  <div className="space-y-4">
                    {paymentData.byMethod.map(([method, data]) => {
                      const pct = paymentData.total > 0 ? Math.round((data.revenue / paymentData.total) * 100) : 0;
                      const colors: Record<string, string> = { Cash: "bg-sky-500", Card: "bg-violet-500", "Mobile Money": "bg-emerald-500" };
                      return (
                        <div key={method}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-bold text-slate-900">{method} <span className="text-slate-400 font-normal">({data.count} txns)</span></span>
                            <span className="font-black text-slate-900">{fmt(data.revenue)} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${colors[method] ?? "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {paymentData.byMethod.length === 0 && <p className="text-sm text-slate-400">No sales in this period.</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Payment method detail</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left">
                        {["Method","Transactions","Revenue","Avg. transaction","% of total"].map((h) => (
                          <th key={h} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentData.byMethod.map(([method, data]) => (
                        <tr key={method} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-bold text-slate-900">{method}</td>
                          <td className="px-5 py-3 text-slate-700">{data.count}</td>
                          <td className="px-5 py-3 font-bold text-emerald-600">{fmt(data.revenue)}</td>
                          <td className="px-5 py-3 text-slate-600">{fmt(data.count > 0 ? Math.round(data.revenue / data.count) : 0)}</td>
                          <td className="px-5 py-3 font-semibold text-slate-700">
                            {paymentData.total > 0 ? Math.round((data.revenue / paymentData.total) * 100) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-5 py-3 font-black text-slate-900">TOTAL</td>
                        <td className="px-5 py-3 font-black text-slate-900">
                          {paymentData.byMethod.reduce((s, [, d]) => s + d.count, 0)}
                        </td>
                        <td className="px-5 py-3 font-black text-emerald-600">{fmt(paymentData.total)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </SiteShell>
  );
}
