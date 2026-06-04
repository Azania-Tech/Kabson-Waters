"use client";

import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import {
  createAccountingTransactionRecord,
  subscribeToAccountingTransactions,
  type AccountingTransactionRecord,
} from "@/lib/commerce";

const VAT_RATE = 16; // Kenya standard VAT %

const EXPENSE_CATEGORIES = ["Operations", "Salaries", "Utilities", "Maintenance", "Logistics", "Tax", "Other"];
const REVENUE_CATEGORIES = ["Retail Sales", "Wholesale", "Hospitality", "Refill Service", "Other"];

const starterTransactions: AccountingTransactionRecord[] = [
  { id: "txn-1", date: "2026-05-12", account: "Retail sales", amount: "KES 86,500", status: "Settled", type: "Revenue", category: "Retail Sales", taxRate: 16, note: "Retail customer payments", createdAt: new Date().toISOString() },
  { id: "txn-2", date: "2026-05-13", account: "Hotel distribution", amount: "KES 122,300", status: "Paid", type: "Revenue", category: "Hospitality", taxRate: 16, note: "Hospitality wholesale delivery", createdAt: new Date().toISOString() },
  { id: "txn-3", date: "2026-05-14", account: "Refill service", amount: "KES 42,900", status: "Pending", type: "Revenue", category: "Refill Service", taxRate: 16, note: "Outstanding refill invoice", createdAt: new Date().toISOString() },
  { id: "txn-4", date: "2026-05-15", account: "Supplier payment", amount: "KES 64,200", status: "Approved", type: "Expense", category: "Operations", taxRate: 0, note: "Treatment chemical payment", createdAt: new Date().toISOString() },
  { id: "txn-5", date: "2026-05-16", account: "Bar & restaurant orders", amount: "KES 98,100", status: "Settled", type: "Revenue", category: "Hospitality", taxRate: 16, note: "Hospitality service settlement", createdAt: new Date().toISOString() },
  { id: "txn-6", date: "2026-05-17", account: "Staff salaries", amount: "KES 45,000", status: "Paid", type: "Expense", category: "Salaries", taxRate: 0, note: "Monthly payroll", createdAt: new Date().toISOString() },
  { id: "txn-7", date: "2026-05-18", account: "Electricity & water", amount: "KES 8,400", status: "Paid", type: "Expense", category: "Utilities", taxRate: 0, note: "Monthly utility bills", createdAt: new Date().toISOString() },
  { id: "txn-8", date: "2026-05-19", account: "VAT remittance", amount: "KES 22,300", status: "Pending", type: "Expense", category: "Tax", taxRate: 0, note: "KRA VAT filing May", createdAt: new Date().toISOString() },
];

const parseAmount = (amount: string) => {
  const n = Number(amount.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const statusStyles: Record<string, string> = {
  Settled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Paid: "bg-sky-50 text-sky-700 border-sky-200",
  Approved: "bg-blue-50 text-blue-700 border-blue-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
};

const typeStyles: Record<string, string> = {
  Revenue: "bg-emerald-50 text-emerald-700",
  Expense: "bg-rose-50 text-rose-700",
};

type Tab = "overview" | "expenses" | "tax" | "ledger";

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<AccountingTransactionRecord[]>(starterTransactions);
  const [tab, setTab] = useState<Tab>("overview");
  const [form, setForm] = useState({ date: "", account: "", amount: "", status: "Pending", type: "Revenue", category: "Retail Sales", taxRate: "16", note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<"All" | "Revenue" | "Expense">("All");

  useEffect(() => {
    const unsubscribe = subscribeToAccountingTransactions((next) =>
      setTransactions(next.length > 0 ? next : starterTransactions)
    );
    return () => unsubscribe();
  }, []);

  const metrics = useMemo(() => {
    const vals = transactions.map((t) => ({ ...t, num: parseAmount(t.amount) }));
    const revenue = vals.filter((t) => t.type === "Revenue");
    const expenses = vals.filter((t) => t.type === "Expense");
    const totalRevenue = revenue.reduce((s, t) => s + t.num, 0);
    const totalExpenses = expenses.reduce((s, t) => s + t.num, 0);
    const outstanding = vals.filter((t) => t.status === "Pending").reduce((s, t) => s + t.num, 0);
    const settled = vals.filter((t) => ["Paid", "Settled", "Approved"].includes(t.status)).reduce((s, t) => s + t.num, 0);
    // Tax: sum of VAT collected on revenue entries
    const vatCollected = revenue.reduce((s, t) => s + t.num * ((t.taxRate ?? 0) / 100), 0);
    const vatPayable = vals.filter((t) => t.category === "Tax").reduce((s, t) => s + t.num, 0);
    // Expense breakdown by category
    const expenseByCategory: Record<string, number> = {};
    expenses.forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + t.num;
    });
    // Revenue breakdown by category
    const revenueByCategory: Record<string, number> = {};
    revenue.forEach((t) => {
      revenueByCategory[t.category] = (revenueByCategory[t.category] ?? 0) + t.num;
    });
    return { totalRevenue, totalExpenses, outstanding, settled, net: totalRevenue - totalExpenses, vatCollected, vatPayable, expenseByCategory, revenueByCategory };
  }, [transactions]);

  const filteredTransactions = useMemo(
    () => filterType === "All" ? transactions : transactions.filter((t) => t.type === filterType),
    [transactions, filterType]
  );

  const expenseTransactions = useMemo(() => transactions.filter((t) => t.type === "Expense"), [transactions]);
  const taxTransactions = useMemo(() => transactions.filter((t) => t.category === "Tax" || (t.taxRate ?? 0) > 0), [transactions]);

  const submitTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (!form.account.trim()) { setError("Account name is required."); return; }
    setLoading(true);
    setError("");
    try {
      await createAccountingTransactionRecord({
        date: form.date || new Date().toISOString().slice(0, 10),
        account: form.account.trim(),
        amount: `KES ${Number(form.amount).toLocaleString()}`,
        status: form.status,
        type: form.type,
        category: form.category,
        taxRate: parseFloat(form.taxRate) || 0,
        note: form.note.trim() || "Manual entry",
      });
      setForm({ date: "", account: "", amount: "", status: "Pending", type: "Revenue", category: "Retail Sales", taxRate: "16", note: "" });
      setShowForm(false);
    } catch {
      setError("Unable to save the entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "expenses", label: "Expenses" },
    { key: "tax", label: "Tax & VAT" },
    { key: "ledger", label: "Ledger" },
  ];

  return (
    <SiteShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600 mb-1">Finance</p>
            <h1 className="text-3xl font-bold text-slate-900">Accounting</h1>
            <p className="text-slate-500 mt-1 text-sm">Revenue, expenses, tax obligations, and full ledger.</p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setError(""); }}
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add entry
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total revenue", value: `KES ${metrics.totalRevenue.toLocaleString()}`, color: "text-emerald-600" },
            { label: "Total expenses", value: `KES ${metrics.totalExpenses.toLocaleString()}`, color: "text-rose-600" },
            { label: "Net position", value: `KES ${metrics.net.toLocaleString()}`, color: metrics.net >= 0 ? "text-emerald-600" : "text-rose-600" },
            { label: "Outstanding", value: `KES ${metrics.outstanding.toLocaleString()}`, color: "text-amber-600" },
            { label: "VAT collected", value: `KES ${Math.round(metrics.vatCollected).toLocaleString()}`, color: "text-violet-600" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
              <p className={`mt-2 text-xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Add entry form */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">New ledger entry</h2>
            <form onSubmit={submitTransaction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Date", key: "date", type: "date", placeholder: "" },
                { label: "Account *", key: "account", type: "text", placeholder: "e.g. Retail sales" },
                { label: "Amount (KES) *", key: "amount", type: "number", placeholder: "e.g. 50000" },
                { label: "Note", key: "note", type: "text", placeholder: "Optional description" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                    required={key === "account" || key === "amount"} min={key === "amount" ? "0" : undefined} />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</label>
                <select value={form.type} onChange={(e) => { const t = e.target.value; setForm((f) => ({ ...f, type: t, category: t === "Revenue" ? "Retail Sales" : "Operations", taxRate: t === "Revenue" ? "16" : "0" })); }}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition">
                  <option>Revenue</option><option>Expense</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition">
                  {(form.type === "Revenue" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition">
                  <option>Pending</option><option>Approved</option><option>Paid</option><option>Settled</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">VAT rate (%)</label>
                <input type="number" min="0" max="100" placeholder="e.g. 16" value={form.taxRate}
                  onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                <button type="submit" disabled={loading} className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition">
                  {loading ? "Saving..." : "Save entry"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue by category */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 mb-1">Revenue streams</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">By category</h2>
              <div className="space-y-3">
                {Object.entries(metrics.revenueByCategory).sort(([,a],[,b]) => b - a).map(([cat, amt]) => {
                  const pct = metrics.totalRevenue > 0 ? Math.round((amt / metrics.totalRevenue) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">{cat}</span>
                        <span className="text-slate-500">{pct}% · KES {amt.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(metrics.revenueByCategory).length === 0 && <p className="text-sm text-slate-400">No revenue entries yet.</p>}
              </div>
            </div>
            {/* Expense by category */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 mb-1">Expense breakdown</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">By category</h2>
              <div className="space-y-3">
                {Object.entries(metrics.expenseByCategory).sort(([,a],[,b]) => b - a).map(([cat, amt]) => {
                  const pct = metrics.totalExpenses > 0 ? Math.round((amt / metrics.totalExpenses) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">{cat}</span>
                        <span className="text-slate-500">{pct}% · KES {amt.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(metrics.expenseByCategory).length === 0 && <p className="text-sm text-slate-400">No expense entries yet.</p>}
              </div>
            </div>
            {/* P&L summary */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 mb-1">Profit & Loss</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Summary</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Gross revenue", value: metrics.totalRevenue, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Total expenses", value: metrics.totalExpenses, color: "text-rose-600", bg: "bg-rose-50" },
                  { label: "Net profit", value: metrics.net, color: metrics.net >= 0 ? "text-emerald-600" : "text-rose-600", bg: metrics.net >= 0 ? "bg-emerald-50" : "bg-rose-50" },
                ].map((row) => (
                  <div key={row.label} className={`rounded-2xl ${row.bg} p-5`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
                    <p className={`mt-2 text-2xl font-bold ${row.color}`}>KES {row.value.toLocaleString()}</p>
                    {row.label === "Net profit" && (
                      <p className="text-xs text-slate-500 mt-1">
                        Margin: {metrics.totalRevenue > 0 ? Math.round((metrics.net / metrics.totalRevenue) * 100) : 0}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {tab === "expenses" && (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EXPENSE_CATEGORIES.filter((c) => metrics.expenseByCategory[c]).map((cat) => (
                <div key={cat} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</p>
                  <p className="mt-2 text-xl font-bold text-rose-600">KES {(metrics.expenseByCategory[cat] ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {metrics.totalExpenses > 0 ? Math.round(((metrics.expenseByCategory[cat] ?? 0) / metrics.totalExpenses) * 100) : 0}% of total
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Expense ledger</p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">All expense entries</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left">
                      {["Date","Account","Category","Amount","Status","Note"].map((h) => (
                        <th key={h} className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenseTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{txn.date}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{txn.account}</td>
                        <td className="px-6 py-4"><span className="rounded-full bg-rose-50 text-rose-700 px-2.5 py-0.5 text-xs font-semibold">{txn.category}</span></td>
                        <td className="px-6 py-4 font-semibold text-rose-600">−{txn.amount}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[txn.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>{txn.status}</span></td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{txn.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {expenseTransactions.length === 0 && <p className="text-center text-slate-400 py-12 text-sm">No expense entries yet.</p>}
            </div>
          </div>
        )}

        {/* TAX TAB */}
        {tab === "tax" && (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "VAT collected (output)", value: `KES ${Math.round(metrics.vatCollected).toLocaleString()}`, sub: `At ${VAT_RATE}% on taxable revenue`, color: "text-violet-600" },
                { label: "VAT remitted", value: `KES ${metrics.vatPayable.toLocaleString()}`, sub: "Tax expense entries", color: "text-rose-600" },
                { label: "VAT balance due", value: `KES ${Math.max(0, Math.round(metrics.vatCollected) - metrics.vatPayable).toLocaleString()}`, sub: "Estimated liability", color: "text-amber-600" },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{m.sub}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 mb-1">VAT breakdown</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Tax per revenue entry</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left">
                      {["Date","Account","Category","Gross amount","VAT rate","VAT amount","Net (excl. VAT)"].map((h) => (
                        <th key={h} className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {taxTransactions.filter((t) => t.type === "Revenue").map((txn) => {
                      const gross = parseAmount(txn.amount);
                      const rate = txn.taxRate ?? 0;
                      const vat = Math.round(gross * (rate / 100));
                      const net = gross - vat;
                      return (
                        <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-500">{txn.date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{txn.account}</td>
                          <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-semibold">{txn.category}</span></td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{txn.amount}</td>
                          <td className="px-4 py-3 text-slate-600">{rate}%</td>
                          <td className="px-4 py-3 font-semibold text-violet-600">KES {vat.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-600">KES {net.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {taxTransactions.filter((t) => t.type === "Revenue").length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No taxable revenue entries yet.</p>}
            </div>
          </div>
        )}

        {/* LEDGER TAB */}
        {tab === "ledger" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Full ledger</p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">All transactions</h2>
              </div>
              <div className="flex items-center gap-2">
                {(["All", "Revenue", "Expense"] as const).map((f) => (
                  <button key={f} onClick={() => setFilterType(f)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${filterType === f ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {f}
                  </button>
                ))}
                <span className="text-sm text-slate-400 ml-2">{filteredTransactions.length} entries</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left">
                    {["Date","Account","Category","Type","Amount","VAT","Status","Note"].map((h) => (
                      <th key={h} className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((txn) => {
                    const gross = parseAmount(txn.amount);
                    const vat = Math.round(gross * ((txn.taxRate ?? 0) / 100));
                    return (
                      <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{txn.date}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900">{txn.account}</td>
                        <td className="px-5 py-3"><span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-semibold">{txn.category}</span></td>
                        <td className="px-5 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeStyles[txn.type] ?? "bg-slate-100 text-slate-700"}`}>{txn.type}</span></td>
                        <td className={`px-5 py-3 font-semibold ${txn.type === "Revenue" ? "text-emerald-600" : "text-rose-600"}`}>
                          {txn.type === "Expense" ? "−" : "+"}{txn.amount}
                        </td>
                        <td className="px-5 py-3 text-violet-600 font-semibold">{vat > 0 ? `KES ${vat.toLocaleString()}` : "—"}</td>
                        <td className="px-5 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[txn.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>{txn.status}</span></td>
                        <td className="px-5 py-3 text-slate-500 max-w-[180px] truncate">{txn.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredTransactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <p className="font-medium text-sm">No entries found</p>
                <button onClick={() => setShowForm(true)} className="mt-3 text-sky-600 hover:text-sky-700 font-semibold text-sm">Add your first entry →</button>
              </div>
            )}
          </div>
        )}

      </div>
    </SiteShell>
  );
}
