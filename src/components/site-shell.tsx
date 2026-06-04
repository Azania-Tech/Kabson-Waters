"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "./LogoutButton";

const navigation = [
  { href: "/", label: "Home", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )},
  { href: "/retail", label: "POS", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )},
  { href: "/inventory", label: "Inventory", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )},
  { href: "/customers", label: "Customers", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )},
  { href: "/customer", label: "Orders", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )},
  { href: "/analytics", label: "Analytics", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )},
  { href: "/reports", label: "Reports", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )},
  { href: "/suppliers", label: "Suppliers", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )},
  { href: "/accounting", label: "Accounting", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
];

const roleLabels: Record<string, string> = { cashier: "Cashier", manager: "Manager", admin: "Admin", owner: "Owner" };
const roleDotStyles: Record<string, string> = {
  cashier: "bg-slate-400",
  manager: "bg-sky-500",
  admin: "bg-violet-500",
  owner: "bg-amber-500",
};

const SIDEBAR_KEY = "kw_sidebar_collapsed";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const { user, loading, role, displayName } = useAuth();
  const pathname = usePathname();
  const canAccessAdmin = role === "admin" || role === "owner";

  // Persist collapsed state
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem(SIDEBAR_KEY, !v ? "1" : "0");
      return !v;
    });
  };

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const allNav = [
    ...navigation,
    ...(canAccessAdmin ? [{ href: "/admin", label: "Admin", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    )}] : []),
  ];

  const sidebarWidth = collapsed ? "w-[68px]" : "w-56";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={`${sidebarWidth} hidden lg:flex flex-col bg-slate-950 text-white shrink-0 transition-all duration-200 overflow-hidden`}>

        {/* Logo + collapse toggle */}
        <div className={`flex items-center h-16 shrink-0 border-b border-white/10 ${collapsed ? "justify-center px-0" : "px-4 gap-3"}`}>
          {!collapsed && (
            <div className="w-8 h-8 relative shrink-0">
              <Image src="/logo/kabson-waters-logo.svg" alt="Kabson Waters" fill className="object-contain brightness-0 invert" priority />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400 leading-none truncate">Kabson Waters</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Water Solutions</p>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 relative">
              <Image src="/logo/kabson-waters-logo.svg" alt="" fill className="object-contain brightness-0 invert opacity-80" />
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {allNav.map((item) => {
            const active = pathname === item.href;
            const isAdmin = item.href === "/admin";
            return (
              <Link key={item.href} href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all group relative ${
                  active
                    ? isAdmin
                      ? "bg-violet-600/20 text-violet-300"
                      : "bg-blue-600/20 text-sky-300"
                    : isAdmin
                      ? "text-violet-400 hover:bg-violet-600/10 hover:text-violet-300"
                      : "text-slate-400 hover:bg-white/8 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`}>
                {/* Active indicator */}
                {active && (
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full ${isAdmin ? "bg-violet-400" : "bg-sky-400"}`} />
                )}
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="text-sm font-semibold truncate">{item.label}</span>
                )}
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-2 rounded-lg bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User area */}
        {!collapsed ? (
          <div className="border-t border-white/10 p-3 space-y-2">
            {!loading && user && (
              <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-black text-white">
                    {(displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${roleDotStyles[role ?? "cashier"]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{displayName ?? user.email}</p>
                  <p className="text-[10px] text-slate-500 truncate">{roleLabels[role ?? "cashier"]}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <LogoutButton />
              <button onClick={toggleCollapsed} title="Collapse sidebar"
                className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-white/10 p-2 flex flex-col items-center gap-2">
            {!loading && user && (
              <div className="relative" title={displayName ?? user.email ?? ""}>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-black text-white">
                  {(displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${roleDotStyles[role ?? "cashier"]}`} />
              </div>
            )}
            {/* Expand button */}
            <button onClick={toggleCollapsed} title="Expand sidebar"
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
      </aside>

      {/* ── MOBILE OVERLAY ─────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-950 text-white flex flex-col z-50" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 h-16 px-4 border-b border-white/10">
              <div className="w-8 h-8 relative shrink-0">
                <Image src="/logo/kabson-waters-logo.svg" alt="" fill className="object-contain brightness-0 invert" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-400 leading-none">Kabson Waters</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Water Solutions</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {allNav.map((item) => {
                const active = pathname === item.href;
                const isAdmin = item.href === "/admin";
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                      active
                        ? isAdmin ? "bg-violet-600/20 text-violet-300" : "bg-blue-600/20 text-sky-300"
                        : isAdmin ? "text-violet-400 hover:bg-violet-600/10" : "text-slate-400 hover:bg-white/8 hover:text-white"
                    }`}>
                    {item.icon}
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-3">
              {!loading && user && (
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-black text-white shrink-0">
                    {(displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{displayName ?? user.email}</p>
                    <p className="text-[10px] text-slate-500">{roleLabels[role ?? "cashier"]}</p>
                  </div>
                </div>
              )}
              <LogoutButton />
            </div>
          </aside>
        </div>
      )}

      {/* ── MAIN AREA ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-slate-950 text-white shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="w-6 h-6 relative shrink-0">
            <Image src="/logo/kabson-waters-logo.svg" alt="" fill className="object-contain brightness-0 invert" />
          </div>
          <p className="text-sm font-black uppercase tracking-wider text-sky-400">Kabson Waters</p>
          {!loading && !user && (
            <Link href="/login" className="ml-auto rounded-xl bg-blue-600 text-white text-xs font-bold px-4 py-2 hover:bg-blue-700 transition">
              Sign In
            </Link>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.06),transparent_50%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]">
          {children}
        </main>

        {/* Footer */}
        <footer className="hidden lg:block border-t border-slate-200 bg-white/90 shrink-0">
          <div className="px-6 py-3 flex items-center justify-between text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Kabson Waters. All rights reserved.</p>
            <p>Pure · Reliable · Delivered</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
