"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeToSales, subscribeToOrders,
  subscribeToInventory, subscribeToCustomers,
  type RetailSale,
} from "@/lib/commerce";

const QUICK = [
  { href: "/retail",     label: "New Sale",     desc: "Open POS terminal",        bg: "#1d4ed8", fg: "#fff",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg> },
  { href: "/customer",   label: "New Order",    desc: "Place customer order",      bg: "#0e7490", fg: "#fff",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> },
  { href: "/inventory",  label: "Inventory",    desc: "Check stock levels",        bg: "#065f46", fg: "#fff",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4" /></svg> },
  { href: "/customers",  label: "Customers",    desc: "Manage accounts",           bg: "#6d28d9", fg: "#fff",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" /></svg> },
  { href: "/analytics",  label: "Analytics",    desc: "Sales & insights",          bg: "#7c2d12", fg: "#fff",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
  { href: "/accounting", label: "Finance",      desc: "Revenue & expenses",        bg: "#92400e", fg: "#fff",    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

const SERVICES = [
  { icon: "💧", title: "Retail & refill",     desc: "Bottles, tanks, and scheduled refills" },
  { icon: "🚚", title: "Distribution",        desc: "Wholesale and hospitality routes" },
  { icon: "🏭", title: "Production",          desc: "Raw water to finished product tracking" },
  { icon: "📊", title: "Financial control",   desc: "Revenue, VAT, expenses, and reporting" },
];

export default function Home() {
  const { user, role, displayName } = useAuth();
  const [revenue, setRevenue]   = useState(0);
  const [pending, setPending]   = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [custCount, setCust]    = useState(0);
  const [sales, setSales]       = useState<RetailSale[]>([]);

  useEffect(() => {
    const u1 = subscribeToSales(s  => { setRevenue(s.reduce((a,x)=>a+x.total,0)); setSales(s.slice(0,6)); });
    const u2 = subscribeToOrders(o => setPending(o.filter(x=>x.status==="Pending approval").length));
    const u3 = subscribeToInventory(i => setLowStock(i.filter(x=>x.stock<=x.reorderPoint).length));
    const u4 = subscribeToCustomers(c => setCust(c.length));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter(s=>new Date(s.createdAt).toDateString()===today).reduce((a,s)=>a+s.total,0);
  }, [sales]);

  const greeting = () => {
    const h = new Date().getHours();
    return h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  };

  const kpis = [
    { label: "Total revenue",  value: `KES ${revenue.toLocaleString()}`,      sub: "All-time sales",        accent: "#10b981", alert: false },
    { label: "Today's sales",  value: `KES ${todayRevenue.toLocaleString()}`, sub: new Date().toLocaleDateString("en-KE",{weekday:"short",day:"numeric",month:"short"}), accent: "#2474e8", alert: false },
    { label: "Pending orders", value: pending.toString(),                     sub: pending>0?"Awaiting approval":"All clear", accent: pending>0?"#f59e0b":"#10b981", alert: pending>0 },
    { label: "Low stock",      value: lowStock.toString(),                    sub: lowStock>0?"Items to reorder":"Stock healthy",  accent: lowStock>0?"#ef4444":"#10b981", alert: lowStock>0 },
    { label: "Customers",      value: custCount.toString(),                   sub: "Active accounts",       accent: "#8b5cf6", alert: false },
  ];

  return (
    <SiteShell>
      <div className="page-body page-stack">

        {/* ── Top banner ── */}
        <div className="rounded-3xl overflow-hidden mb-8" style={{
          background: "linear-gradient(135deg, #071e26 0%, #0c3847 40%, #0e5f77 70%, #0891b2 100%)",
          boxShadow: "0 8px 32px rgba(11,31,74,0.35)",
        }}>
          {/* Subtle wave pattern */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none overflow-hidden rounded-3xl">
            <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
              <path d="M0,160C240,110,480,210,720,160C960,110,1200,210,1440,160L1440,320L0,320Z" fill="white"/>
            </svg>
          </div>

          <div className="relative z-10 px-8 py-7 flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 relative shrink-0">
                  <Image src="/logo/kabson-waters-logo.svg" alt="" fill className="object-contain brightness-0 invert" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#61b2f8]">Kabson Waters</p>
                  <p className="text-white/50 text-[11px]">Management System</p>
                </div>
              </div>

              {user ? (
                <div>
                  <p className="text-white/60 text-sm mb-1">{greeting()},</p>
                  <h1 className="text-2xl font-black text-white leading-tight">
                    {displayName ?? user.email?.split("@")[0]}
                  </h1>
                  <p className="text-white/45 text-sm mt-1 capitalize">{role} · {new Date().toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-black text-white">Pure water.</h1>
                  <p className="text-[#61b2f8] font-bold">Delivered with precision.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-5">
                <Link href="/retail" className="btn btn-pill text-sm" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                  Start a sale
                </Link>
                <Link href="/shop" className="btn btn-pill text-sm" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35" /></svg>
                  Open shop
                </Link>
                {(role==="admin"||role==="owner") && (
                  <Link href="/admin" className="btn btn-pill text-sm" style={{ background: "rgba(139,92,246,0.25)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                    Admin panel
                  </Link>
                )}
              </div>
            </div>

            {/* Right — service pills */}
            <div className="hidden lg:grid grid-cols-2 gap-2.5 w-72 shrink-0">
              {SERVICES.map(s => (
                <div key={s.title} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span className="text-xl">{s.icon}</span>
                  <p className="text-white font-semibold text-sm mt-1.5 leading-tight">{s.title}</p>
                  <p className="text-white/45 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className={`metric-grid metric-grid-${kpis.length} mb-8`}>
          {kpis.map(k => (
            <div key={k.label} className="stat-card fade-in" style={{ borderTop: `3px solid ${k.accent}` }}>
              <p className="label">{k.label}</p>
              <p className="text-2xl font-black mt-2 num" style={{ color: k.accent }}>{k.value}</p>
              <p className="text-xs mt-1" style={{ color: k.alert ? k.accent : "var(--text-muted)" }}>
                {k.alert && "⚠ "}{k.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* Left col */}
          <div className="space-y-6">

            {/* Quick actions */}
            <div>
              <p className="section-label mb-3">Quick actions</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK.map(q => (
                  <Link key={q.href} href={q.href}
                    className="card-lift flex items-center gap-3 px-4 py-3.5 rounded-2xl group"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: q.bg, color: q.fg }}>
                      {q.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{q.label}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{q.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent transactions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Activity</p>
                <Link href="/analytics" className="text-xs font-semibold" style={{ color: "var(--kw-600)" }}>View all →</Link>
              </div>
              <div className="table-wrap">
                {sales.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon" style={{ fontSize: 24 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                    </div>
                    <p className="font-semibold text-sm">No sales yet</p>
                    <Link href="/retail" className="text-xs font-semibold mt-2" style={{ color: "var(--kw-600)" }}>Make your first sale →</Link>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Items</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map(s => (
                        <tr key={s.id}>
                          <td style={{ color: "var(--text-muted)" }}>
                            {new Date(s.createdAt).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}
                            <span className="block text-xs">{new Date(s.createdAt).toLocaleDateString("en-KE",{day:"numeric",month:"short"})}</span>
                          </td>
                          <td className="font-black num" style={{ color: "#10b981" }}>KES {s.total.toLocaleString()}</td>
                          <td><span className="badge badge-blue">{s.paymentMethod}</span></td>
                          <td style={{ color: "var(--text-secondary)" }}>{s.items.length} item{s.items.length!==1?"s":""}</td>
                          <td><span className="badge badge-green">{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-5">

            {/* Alerts */}
            {(pending > 0 || lowStock > 0) && (
              <div>
                <p className="section-label mb-3">Alerts</p>
                <div className="space-y-2">
                  {pending > 0 && (
                    <Link href="/customer" className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:brightness-95" style={{ background: "#fef3c7", border: "1px solid #fde68a", textDecoration: "none" }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#f59e0b" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "#92400e" }}>{pending} pending order{pending!==1?"s":""}</p>
                        <p className="text-xs" style={{ color: "#b45309" }}>Awaiting approval</p>
                      </div>
                    </Link>
                  )}
                  {lowStock > 0 && (
                    <Link href="/inventory" className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:brightness-95" style={{ background: "#fee2e2", border: "1px solid #fecaca", textDecoration: "none" }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#ef4444" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4" /></svg>
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "#991b1b" }}>{lowStock} item{lowStock!==1?"s":""} low on stock</p>
                        <p className="text-xs" style={{ color: "#b91c1c" }}>Reorder needed</p>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* System overview */}
            <div>
              <p className="section-label mb-3">Platform</p>
              <div className="card p-4 space-y-1">
                {[
                  { label: "POS Retail",     href: "/retail",     desc: "Process in-store sales" },
                  { label: "Inventory",      href: "/inventory",  desc: "Stock & production" },
                  { label: "Orders",         href: "/customer",   desc: "Customer order tracking" },
                  { label: "Suppliers",      href: "/suppliers",  desc: "Procurement & POs" },
                  { label: "Reports",        href: "/reports",    desc: "Daily, Z-report, period" },
                  { label: "Stores",         href: "/stores",     desc: "Main & production store" },
                ].map(item => (
                  <Link key={item.href} href={item.href}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl transition hover:bg-slate-50 group"
                    style={{ textDecoration: "none" }}>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{item.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition group-hover:translate-x-0.5" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </SiteShell>
  );
}
