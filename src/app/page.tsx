"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import { useAuth } from "@/context/AuthContext";
import { subscribeToSales, subscribeToOrders, subscribeToInventory, subscribeToCustomers } from "@/lib/commerce";

const catalog = [
  { id: "bottle-20l", name: "20L Premium Bottle", category: "Retail", price: 320, unit: "per bottle", badge: "Best seller", gradient: "from-blue-600 to-cyan-500" },
  { id: "refill-500l", name: "500L Refill Tank", category: "Refill", price: 1800, unit: "per refill", badge: "High demand", gradient: "from-blue-700 to-blue-500" },
  { id: "distributor-kit", name: "Distributor Kit", category: "Wholesale", price: 7600, unit: "per kit", badge: "Wholesale", gradient: "from-indigo-600 to-blue-500" },
  { id: "treatment-chem", name: "Treatment Chemicals", category: "Operations", price: 1450, unit: "per pack", badge: "Ops", gradient: "from-teal-600 to-cyan-500" },
];

const quickLinks = [
  { href: "/retail", label: "POS Sale", icon: "🛒", desc: "Process a sale", bg: "bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300" },
  { href: "/customer", label: "New Order", icon: "📋", desc: "Place order", bg: "bg-cyan-50 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300" },
  { href: "/inventory", label: "Inventory", icon: "📦", desc: "Stock levels", bg: "bg-sky-50 border-sky-200 hover:bg-sky-100 hover:border-sky-300" },
  { href: "/analytics", label: "Analytics", icon: "📊", desc: "Sales insights", bg: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300" },
  { href: "/customers", label: "Customers", icon: "👥", desc: "Manage accounts", bg: "bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300" },
  { href: "/accounting", label: "Finance", icon: "💰", desc: "Revenue & costs", bg: "bg-teal-50 border-teal-200 hover:bg-teal-100 hover:border-teal-300" },
];

export default function Home() {
  const { user, role, displayName } = useAuth();
  const [cart, setCart] = useState<Record<string, number>>({ "bottle-20l": 2, "refill-500l": 1 });
  const [liveRevenue, setLiveRevenue] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);

  useEffect(() => {
    const u1 = subscribeToSales((s) => setLiveRevenue(s.reduce((sum, x) => sum + x.total, 0)));
    const u2 = subscribeToOrders((o) => setPendingOrders(o.filter((x) => x.status === "Pending approval").length));
    const u3 = subscribeToInventory((i) => setLowStock(i.filter((x) => x.stock <= x.reorderPoint).length));
    const u4 = subscribeToCustomers((c) => setCustomerCount(c.length));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const lineItems = useMemo(() =>
    catalog.map((p) => ({ ...p, quantity: cart[p.id] ?? 0 })).filter((p) => p.quantity > 0), [cart]);
  const subtotal = useMemo(() => lineItems.reduce((s, i) => s + i.price * i.quantity, 0), [lineItems]);

  const adjust = (id: string, delta: number) => {
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta);
      if (next === 0) { const { [id]: _, ...rest } = c; return rest; }
      return { ...c, [id]: next };
    });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SiteShell>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003d8f] via-[#0057c8] to-[#0099e6] text-white">
        {/* Water wave SVG background */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 1440 560" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
            <path d="M0,280 C240,200 480,360 720,280 C960,200 1200,360 1440,280 L1440,560 L0,560 Z" fill="white"/>
            <path d="M0,350 C240,270 480,430 720,350 C960,270 1200,430 1440,350 L1440,560 L0,560 Z" fill="white" opacity="0.5"/>
          </svg>
        </div>
        {/* Radial glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-cyan-400/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-300/10 blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
          <div className="flex flex-col lg:flex-row lg:items-center gap-12">
            {/* Left — branding + CTA */}
            <div className="flex-1">
              {/* Logo */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 relative drop-shadow-lg">
                  <Image src="/logo/kabson-waters-logo.svg" alt="Kabson Waters" fill className="object-contain brightness-0 invert" priority />
                </div>
                <div>
                  <p className="text-2xl font-black tracking-wide text-white leading-none">KABSON WATERS</p>
                  <p className="text-cyan-200 text-sm mt-0.5">Pure · Reliable · Delivered</p>
                </div>
              </div>

              {user && (
                <p className="inline-flex items-center gap-2 text-cyan-200 text-sm font-medium mb-4 bg-white/10 rounded-full px-4 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {greeting()}, {displayName ?? user.email?.split("@")[0]}
                </p>
              )}

              <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                Water solutions<br />
                <span className="text-cyan-300">built for growth.</span>
              </h1>
              <p className="mt-5 text-blue-100 text-lg leading-8 max-w-xl">
                From production to delivery — manage retail sales, bulk refills, hospitality distribution, and full financial operations in one platform.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/retail" className="rounded-full bg-white text-blue-700 font-bold px-7 py-3.5 text-sm hover:bg-cyan-50 transition shadow-lg shadow-blue-900/20">
                  Start a sale
                </Link>
                <Link href="/customer" className="rounded-full border-2 border-white/40 text-white font-semibold px-7 py-3.5 text-sm hover:bg-white/10 transition">
                  Place an order
                </Link>
                {(role === "admin" || role === "owner") && (
                  <Link href="/admin" className="rounded-full border-2 border-cyan-300/40 bg-cyan-400/10 text-cyan-200 font-semibold px-7 py-3.5 text-sm hover:bg-cyan-400/20 transition">
                    Admin panel
                  </Link>
                )}
              </div>

              {/* Live stats strip */}
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Revenue", value: `KES ${liveRevenue.toLocaleString()}`, color: "text-emerald-300" },
                  { label: "Pending orders", value: pendingOrders.toString(), color: pendingOrders > 0 ? "text-amber-300" : "text-white" },
                  { label: "Low stock", value: lowStock.toString(), color: lowStock > 0 ? "text-rose-300" : "text-white" },
                  { label: "Customers", value: customerCount.toString(), color: "text-cyan-300" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-blue-200 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — quote builder */}
            <div className="w-full lg:w-96 shrink-0">
              <div className="rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md p-6 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300 mb-1">Quick quote</p>
                <h2 className="text-xl font-bold text-white mb-4">Build an order</h2>

                <div className="space-y-2 mb-4">
                  {catalog.map((p) => {
                    const qty = cart[p.id] ?? 0;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/10 border border-white/10 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                          <p className="text-xs text-blue-200">KES {p.price.toLocaleString()} {p.unit}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {qty > 0 && <span className="text-xs font-bold text-cyan-300">KES {(p.price * qty).toLocaleString()}</span>}
                          <div className="flex items-center gap-1">
                            <button onClick={() => adjust(p.id, -1)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-sm flex items-center justify-center transition">−</button>
                            <span className="w-5 text-center text-sm font-bold text-white">{qty}</span>
                            <button onClick={() => adjust(p.id, 1)} className="w-7 h-7 rounded-full bg-cyan-400 hover:bg-cyan-300 text-blue-900 font-bold text-sm flex items-center justify-center transition">+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-white/10 border border-white/10 p-3 space-y-1.5 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200">Subtotal</span>
                    <span className="font-bold text-white">KES {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-blue-300">
                    <span>VAT 16%</span>
                    <span>KES {Math.round(subtotal * 0.16).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-white/10 pt-1.5">
                    <span className="font-semibold text-white">Total</span>
                    <span className="font-black text-cyan-300">KES {Math.round(subtotal * 1.16).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link href="/customer" className="rounded-xl bg-white text-blue-700 font-bold py-2.5 text-sm text-center hover:bg-cyan-50 transition">
                    Send to customer portal
                  </Link>
                  <Link href="/retail" className="rounded-xl border border-white/25 text-white font-semibold py-2.5 text-sm text-center hover:bg-white/10 transition">
                    Process at POS
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="relative h-16 overflow-hidden">
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
            <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" fill="#f8fbff"/>
          </svg>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">

        {/* Quick actions */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-3">Quick actions</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${link.bg}`}>
                <span className="text-2xl">{link.icon}</span>
                <p className="text-sm font-bold text-slate-800">{link.label}</p>
                <p className="text-xs text-slate-500 hidden sm:block">{link.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Product catalog */}
        <section id="shop">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Product catalog</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Retail & bulk products</h2>
            </div>
            <Link href="/inventory" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">Full inventory →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.map((product) => {
              const qty = cart[product.id] ?? 0;
              return (
                <div key={product.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <div className={`bg-gradient-to-br ${product.gradient} p-5 flex items-center justify-between`}>
                    <div className="w-10 h-10 relative opacity-90">
                      <Image src="/logo/kabson-waters-logo.svg" alt="" fill className="object-contain brightness-0 invert" />
                    </div>
                    <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">{product.badge}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-500">{product.category}</p>
                    <p className="font-bold text-slate-900 mt-0.5">{product.name}</p>
                    <p className="text-xl font-black text-slate-900 mt-2">
                      KES {product.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">{product.unit}</span>
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      {qty > 0 ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => adjust(product.id, -1)} className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:border-blue-300 transition">−</button>
                          <span className="w-6 text-center font-black text-slate-900">{qty}</span>
                          <button onClick={() => adjust(product.id, 1)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold hover:bg-blue-700 transition">+</button>
                        </div>
                      ) : (
                        <button onClick={() => adjust(product.id, 1)} className="rounded-xl bg-blue-600 text-white text-xs font-bold px-4 py-2 hover:bg-blue-700 transition">
                          Add to quote
                        </button>
                      )}
                      {qty > 0 && <span className="text-sm font-bold text-blue-600">KES {(product.price * qty).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Services */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-3">What we do</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🏠", title: "Retail selling", desc: "Household and small business orders with transparent pricing and fast delivery.", color: "border-blue-100 bg-blue-50" },
              { icon: "🔄", title: "Refill subscriptions", desc: "Repeat refill plans for bottled water, storage tanks, and high-volume outlets.", color: "border-cyan-100 bg-cyan-50" },
              { icon: "🚚", title: "Distribution", desc: "Branch-ready stock management for retail partners and regional distributors.", color: "border-sky-100 bg-sky-50" },
              { icon: "🏨", title: "Hospitality", desc: "Priority service for hotels, bars, and restaurants with scheduled replenishment.", color: "border-indigo-100 bg-indigo-50" },
            ].map((s) => (
              <div key={s.title} className={`rounded-2xl border p-5 hover:shadow-md transition ${s.color}`}>
                <span className="text-3xl">{s.icon}</span>
                <p className="mt-3 font-black text-slate-900">{s.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </SiteShell>
  );
}
