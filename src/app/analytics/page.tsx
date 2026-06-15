"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import { KwIcon } from "@/components/ui/icons";
import { MetricCard, MetricGrid, PageHeader, PageLayout, Panel } from "@/components/ui/page-layout";
import {
  subscribeToSales,
  subscribeToInventory,
  type RetailSale,
  type InventoryItem,
} from "@/lib/commerce";
import { shouldSkipInventory } from "@/lib/pricing";

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

    let refillRevenue = 0;
    let refillCount = 0;
    sales.forEach((sale) => {
      sale.items.forEach((line) => {
        if (line.saleKind === "refill") {
          refillRevenue += line.quantity * line.price;
          refillCount += line.quantity;
        }
      });
    });

    const topProducts = inventory
      .map((item) => ({
        ...item,
        soldQuantity: sales.reduce((sum, sale) => {
          return sum + sale.items
            .filter((i) => i.itemId === item.id && !shouldSkipInventory(i.saleKind ?? "retail"))
            .reduce((s, i) => s + i.quantity, 0);
        }, 0),
        revenue: sales.reduce((sum, sale) => {
          return sum + sale.items
            .filter((i) => i.itemId === item.id)
            .reduce((s, i) => s + i.quantity * i.price, 0);
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
      refillRevenue,
      refillCount,
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
      <PageLayout>
        <PageHeader
          eyebrow="Business intelligence"
          title="Analytics"
          subtitle="Real-time sales metrics and operational insights."
          tone="sky"
          actions={
            <Link href="/retail" className="btn btn-primary btn-sm">
              <KwIcon name="plus" size={16} /> New sale
            </Link>
          }
        />

        <MetricGrid cols={4}>
          <MetricCard label="Today's revenue" value={`KES ${metrics.todayRevenue.toLocaleString()}`} sub={`${metrics.todaySales} transactions`} tone="emerald" icon="coins" />
          <MetricCard label="Total revenue" value={`KES ${metrics.totalRevenue.toLocaleString()}`} sub={`${metrics.totalSales} all-time sales`} tone="sky" icon="chart" />
          <MetricCard label="Refill revenue" value={`KES ${metrics.refillRevenue.toLocaleString()}`} sub={`${metrics.refillCount} refills sold`} tone="violet" icon="droplet" />
          <MetricCard label="Inventory value" value={`KES ${metrics.inventoryValue.toLocaleString()}`} sub={`${inventory.length} products`} tone="indigo" icon="package" />
        </MetricGrid>

        {/* Revenue chart + payment methods */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Bar chart */}
          <Panel eyebrow="Revenue trend" title="Last 7 days">
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
          </Panel>

          <Panel eyebrow="Breakdown" title="Payment methods">
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
          </Panel>
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
      </PageLayout>
    </SiteShell>
  );
}
