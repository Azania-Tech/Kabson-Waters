"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { setUserRole } from "@/lib/commerce";

export default function SetupPage() {
  const { user, loading } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState("");

  const claimOwner = async () => {
    if (!user) return;
    setClaiming(true);
    setError("");
    try {
      await setUserRole(user.uid, user.email ?? "", "owner", user.displayName ?? "");
      setClaimed(true);
      setTimeout(() => { window.location.href = "/admin"; }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to claim owner role. Please try again.");
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <svg className="animate-spin w-8 h-8 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 relative mb-4">
            <Image src="/logo/kabson-waters-logo.svg" alt="Kabson Waters" fill className="object-contain" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-400">Kabsonwater</p>
          <p className="text-slate-400 text-sm mt-1">System Setup</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">

          {claimed ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Owner role claimed!</h1>
              <p className="text-slate-400 text-sm">Redirecting to Admin panel...</p>
              <div className="mt-4 flex justify-center">
                <svg className="animate-spin w-5 h-5 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>

          ) : !user ? (
            <div className="text-center">
              <h1 className="text-xl font-bold text-white mb-3">Sign in first</h1>
              <p className="text-slate-400 text-sm mb-6">You need to be signed in to claim the owner role.</p>
              <a href="/login" className="inline-block rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold px-6 py-2.5 text-sm transition">
                Sign in
              </a>
            </div>

          ) : (
            <div>
              <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">Claim owner role</h1>
              <p className="text-slate-400 text-sm leading-6 mb-6">
                This will assign the <span className="text-amber-400 font-semibold">owner</span> role to your account.
                You can then use the Admin panel to assign roles to other users.
              </p>

              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Signed in as</p>
                <p className="text-white font-semibold text-sm">{user.displayName || user.email}</p>
                {user.displayName && <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>}
                <p className="text-slate-400 text-xs mt-1">
                  Will be assigned: <span className="text-amber-400 font-semibold">Owner</span>
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {[
                  { role: "Owner", color: "border-amber-400/30 bg-amber-500/10", label: "text-amber-400", desc: "Full access — billing, users, system config" },
                  { role: "Admin", color: "border-violet-400/30 bg-violet-500/10", label: "text-violet-400", desc: "Manage users, approve orders, all modules" },
                  { role: "Manager", color: "border-sky-400/30 bg-sky-500/10", label: "text-sky-400", desc: "Approve orders, manage inventory & customers" },
                  { role: "Cashier", color: "border-white/10 bg-white/5", label: "text-slate-300", desc: "POS sales only" },
                ].map((r) => (
                  <div key={r.role} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${r.color}`}>
                    <span className={`text-xs font-bold w-16 shrink-0 ${r.label}`}>{r.role}</span>
                    <span className="text-xs text-slate-400">{r.desc}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400 break-all">
                  {error}
                </div>
              )}

              <button
                onClick={claimOwner}
                disabled={claiming}
                className="w-full rounded-xl bg-violet-500 hover:bg-violet-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 text-sm transition"
              >
                {claiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Claiming...
                  </span>
                ) : "Claim owner role for this account"}
              </button>

              <p className="mt-4 text-xs text-slate-600 text-center">
                Visit this page with each account to assign roles, or use the Admin panel after claiming owner.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
