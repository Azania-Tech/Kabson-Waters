"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import {
  subscribeToSales,
  subscribeToInventory,
  type RetailSale,
  type InventoryItem,
} from "@/lib/commerce";

export default function AnalyticsPage() {
  const [sales, setSales] = useState<RetailSale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const unsub1 = subscribeToSales(setSales);
    const unsub2 = subscribeToInventory(setInventory);
    return () => { unsub1(); unsub2(); };
  }, []);

  const today = useMemo(() => new Date().toDateString(), []);

  const metrics = useMemo(() => {
    const todaySales = sales.filter((s) => new Date(s.createdAt).toDateString() === today);
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const avgTransaction = sales.length > 0 ? totalRevenue / sales.length : 0;
    const inventoryValue = inventory.reduce((sum, i) => sum + i.price * i.stock, 0);

    const topProducts = inventory
      .map((item) => ({
        ...item,
        soldQuantity: sales.reduce((sum, sale) => {
          const found = sale.items.find((i) => i.itemId === item.id);
          return sum + (found?.quantity ?? 0);
        }, 0),
        revenue: sales.reduce((sum, sale) => {
          const found = sale.items.find((i) => i.itemId === item.id);
          return sum + (found ? found.quantity * found.price : 0);
        }, 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentMethods = sales.reduce(
      (acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] ?? 0) + sale.total;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalRevenue,
      todayRevenue,
      totalSales: sales.length,
      todaySales: todaySales.length,
      avgTransaction,
      inventoryValue,
      topProducts,
      paymentMethods,
    };
  }, [sales, inventory, today]);

  const chartData = useMemo(() => {
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days[d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" })] = 0;
    }
    sales.forEach((sale) => {
      const key = new Date(sale.createdAt).toLocaleDateString("en-KE", { weekday: "short", day: "numeric" });
      if (key in last7Days) last7Days[key] += sale.total;
    });
    return Object.entries(last7Days).map(([date, revenue]) => ({ date, revenue }));
  }, [sales]);

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  const paymentColors: Record<string, string> = {
    Cash: "bg-sky-500",
    Card: "bg-violet-500",
    "Mobile Money": "bg-emerald-500",
  };

  return (
    <SiteShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600 mb-1">Business intelligence</p>
            <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
            <p className="text-slate-500 mt-1 text-sm">Real-time sales metrics and operational insights.</p>
          </div>
          <Link
            href="/retail"
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New sale
          </Link>
        </div>

        {/* Key metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Today's revenue", value: `KES ${metrics.todayRevenue.toLocaleString()}`, sub: `${metrics.todaySales} transactions`, color: "text-emerald-600" },
            { label: "Total revenue", value: `KES ${metrics.totalRevenue.toLocaleString()}`, sub: `${metrics.totalSales} all-time sales`, color: "text-sky-600" },
            { label: "Avg. transaction", value: `KES ${Math.round(metrics.avgTransaction).toLocaleString()}`, sub: "Per completed sale", color: "text-blue-600" },
            { label: "Inventory value", value: `KES ${metrics.inventoryValue.toLocaleString()}`, sub: `${inventory.length} products`, color: "text-violet-600" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
              <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-slate-400 mt-1">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Revenue chart + payment methods */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Bar chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Revenue trend</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Last 7 days</h2>
            </div>
            <div className="space-y-3">
              {chartData.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-slate-500 shrink-0 text-right">{day.date}</span>
                  <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-sky-500 rounded-lg transition-all duration-500"
                      style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                    />
                    {day.revenue > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-700">
                        KES {day.revenue.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment methods */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Breakdown</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Payment methods</h2>
            </div>
            {Object.keys(metrics.paymentMethods).length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No sales recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(metrics.paymentMethods)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, amount]) => {
                    const pct = metrics.totalRevenue > 0 ? Math.round((amount / metrics.totalRevenue) * 100) : 0;
                    return (
                      <div key={method}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-700">{method}</span>
                          <span className="text-sm font-semibold text-slate-900">{pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${paymentColors[method] ?? "bg-slate-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">KES {amount.toLocaleString()}</p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Top products + recent transactions */}
        <div className="grid gap-6 lg:grid-cols-[0.5fr_1fr]">
          {/* Top products */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Best sellers</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Top 5 products</h2>
            </div>
            {metrics.topProducts.filter((p) => p.soldQuantity > 0).length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No sales data yet.</p>
            ) : (
              <div className="space-y-3">
                {metrics.topProducts.map((product, idx) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.soldQuantity} units</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 shrink-0">
                      KES {product.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent transactions */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Activity</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Recent transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date & time</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Amount</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Items</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Payment</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.slice(0, 10).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-slate-500">
                        {new Date(sale.createdAt).toLocaleString("en-KE", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-3 font-semibold text-emerald-600">
                        KES {sale.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{sale.items.length}</td>
                      <td className="px-6 py-3 text-slate-600">{sale.paymentMethod}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sales.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <p className="text-sm font-medium">No transactions yet</p>
                <Link href="/retail" className="mt-2 text-sky-600 hover:text-sky-700 font-semibold text-sm">
                  Make your first sale →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
