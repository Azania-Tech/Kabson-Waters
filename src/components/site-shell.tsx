"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "./LogoutButton";

// ── Icons ─────────────────────────────────────────────────────
const Icon = {
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  POS: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>,
  Inventory: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
  Customers: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  Orders: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>,
  Analytics: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  Reports: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  Suppliers: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>,
  Accounting: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Shop: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>,
  Stores: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15l.75 7.5H3.75L4.5 3zm0 0A2.25 2.25 0 002.25 5.25v.75c0 1.243 1.007 2.25 2.25 2.25s2.25-1.007 2.25-2.25V6h3v-.75C9.75 4.007 10.757 3 12 3s2.25 1.007 2.25 2.25V6h3v-.75c0-1.243 1.007-2.25 2.25-2.25s2.25 1.007 2.25 2.25v.75c0 1.243-1.007 2.25-2.25 2.25S19.5 7.243 19.5 6" /></svg>,
  Admin: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  Chevrons: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>,
  ChevronsR: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>,
  Menu: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
};

const navigation = [
  { href: "/",           label: "Home",        I: Icon.Home },
  { href: "/retail",     label: "POS",         I: Icon.POS },
  { href: "/inventory",  label: "Inventory",   I: Icon.Inventory },
  { href: "/customers",  label: "Customers",   I: Icon.Customers },
  { href: "/customer",   label: "Orders",      I: Icon.Orders },
  { href: "/analytics",  label: "Analytics",   I: Icon.Analytics },
  { href: "/reports",    label: "Reports",     I: Icon.Reports },
  { href: "/suppliers",  label: "Suppliers",   I: Icon.Suppliers },
  { href: "/accounting", label: "Accounting",  I: Icon.Accounting },
  { href: "/shop",       label: "Shop",        I: Icon.Shop },
  { href: "/stores",     label: "Stores",      I: Icon.Stores },
];

const roleLabels: Record<string, string> = { cashier: "Cashier", manager: "Manager", admin: "Admin", owner: "Owner" };
const roleColors: Record<string, string> = {
  cashier: "#94a3b8",
  manager: "#38bdf8",
  admin:   "#a78bfa",
  owner:   "#fbbf24",
};

const SIDEBAR_KEY = "kw_sidebar_v2";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const { user, loading, role, displayName } = useAuth();
  const pathname = usePathname();
  const canAdmin = role === "admin" || role === "owner";

    const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggle = () => setCollapsed(v => {
    localStorage.setItem(SIDEBAR_KEY, !v ? "1" : "0");
    return !v;
  });

  const allNav = [
    ...navigation,
    ...(canAdmin ? [{ href: "/admin", label: "Admin", I: Icon.Admin }] : []),
  ];

  const NavItem = ({ href, label, I }: { href: string; label: string; I: React.FC }) => {
    const active = pathname === href;
    const isAdmin = href === "/admin";
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`nav-link group ${active ? "active" : ""} ${isAdmin ? "!text-violet-400 hover:!text-violet-300" : ""} ${collapsed ? "!justify-center" : ""}`}
        style={isAdmin && active ? { background: "rgba(139,92,246,0.15)", color: "#c4b5fd" } : {}}
      >
        <span className="shrink-0 flex items-center justify-center"><I /></span>
        {!collapsed && <span className="truncate">{label}</span>}
        {collapsed && (
          <span className="tooltip" style={{ left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" }}>
            {label}
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Logo */}
      <div className={`flex items-center h-[60px] shrink-0 px-3 border-b border-white/[0.06] ${collapsed && !isMobile ? "justify-center" : "gap-3"}`}>
        <div className="w-8 h-8 relative shrink-0">
          <Image src="/logo/kabson-waters-logo.svg" alt="" fill className="object-contain brightness-0 invert opacity-90" priority />
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#61b2f8] leading-none">Kabson Waters</p>
            <p className="text-[10px] text-white/30 mt-0.5">Water Solutions</p>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition">
            <Icon.X />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {allNav.map(item => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-white/[0.06] p-2">
        {!loading && user && (
          <div className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 mb-1 ${collapsed && !isMobile ? "justify-center" : ""}`}>
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#1d58d8] flex items-center justify-center text-[13px] font-black text-white">
                {(displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0b1120]"
                style={{ background: roleColors[role ?? "cashier"] }}
              />
            </div>
            {(!collapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/90 truncate">{displayName ?? user.email}</p>
                <p className="text-[10px] text-white/35 truncate">{roleLabels[role ?? "cashier"]}</p>
              </div>
            )}
          </div>
        )}
        <div className={`flex items-center gap-1 ${collapsed && !isMobile ? "justify-center flex-col" : ""}`}>
          <div className="flex-1"><LogoutButton isIconOnly={collapsed && !isMobile} /></div>
          {!isMobile && (
            <button onClick={toggle} title={collapsed ? "Expand" : "Collapse"}
              className="p-2 rounded-xl text-white/35 hover:text-white hover:bg-white/8 transition shrink-0">
              {collapsed ? <Icon.ChevronsR /> : <Icon.Chevrons />}
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 overflow-hidden`}
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-60 flex flex-col z-10"
            style={{ background: "var(--sidebar-bg)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 shrink-0"
          style={{ height: 56, background: "var(--sidebar-bg)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-white/40 hover:text-white transition">
            <Icon.Menu />
          </button>
          <div className="w-6 h-6 relative">
            <Image src="/logo/kabson-waters-logo.svg" alt="" fill className="object-contain brightness-0 invert" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#61b2f8]">Kabson Waters</span>
          {!loading && !user && (
            <Link href="/login" className="ml-auto btn btn-primary btn-sm">Sign In</Link>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto page-canvas">
          {children}
        </main>

        <footer className="hidden lg:flex items-center justify-between px-7 shrink-0 text-[11px]"
          style={{ height: 36, background: "var(--bg-card)", borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
          <span>© {new Date().getFullYear()} Kabson Waters</span>
          <span>Pure · Reliable · Delivered</span>
        </footer>
      </div>
    </div>
  );
}
