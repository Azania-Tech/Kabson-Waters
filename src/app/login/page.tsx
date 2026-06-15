"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setUserRole } from "@/lib/commerce";

const friendly = (msg: string) => {
  if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) return "Invalid email or password.";
  if (msg.includes("email-already-in-use")) return "An account with this email already exists.";
  if (msg.includes("weak-password")) return "Password must be at least 6 characters.";
  if (msg.includes("invalid-email")) return "Please enter a valid email address.";
  return msg;
};

const ROLES = [
  { value: "cashier", label: "Cashier", desc: "POS & sales",      color: "#94a3b8" },
  { value: "manager", label: "Manager", desc: "Orders & ops",     color: "#38bdf8" },
  { value: "admin",   label: "Admin",   desc: "All features",     color: "#a78bfa" },
  { value: "owner",   label: "Owner",   desc: "Full access",      color: "#fbbf24" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<typeof ROLES[number]["value"]>("cashier");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (isSignUp) {
        if (!username.trim()) { setError("Username is required."); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username.trim() });
        await setUserRole(cred.user.uid, email, role, username.trim());
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err: unknown) {
      setError(friendly(err instanceof Error ? err.message : "Authentication failed"));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "rgb(8 12 22)" }}>

      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(37,99,235,0.18) 0%, transparent 70%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 80% 80%, rgba(6,182,212,0.10) 0%, transparent 70%)" }} />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 relative">
            <Image src="/logo/kabson-waters-logo.svg" alt="KW" fill className="object-contain brightness-0 invert opacity-90" priority />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400 leading-none">Kabson Waters</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Management System</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/8 text-blue-400 text-[11px] font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Operational Platform — v3.0
          </div>
          <h1 className="text-5xl font-black text-white leading-[1.05] tracking-[-0.03em]">
            Water solutions<br />
            <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.25)" }}>engineered</span>{" "}
            <span className="text-blue-400">to scale.</span>
          </h1>
          <p className="text-slate-500 text-base leading-7 max-w-sm">
            From raw water production to last-mile delivery — manage your entire water business in one intelligent platform.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { v: "1,240+", l: "Orders processed" },
              { v: "28",     l: "Active routes" },
              { v: "96",     l: "Hospitality clients" },
              { v: "4 zones",l: "Daily dispatch" },
            ].map(s => (
              <div key={s.l} className="rounded-2xl px-4 py-3.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xl font-black text-white num">{s.v}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-slate-700">© {new Date().getFullYear()} Kabson Waters Ltd. All rights reserved.</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative" style={{ background: "rgb(12 17 32)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.06), transparent)" }} />

        <div className="relative z-10 w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-7 h-7 relative">
              <Image src="/logo/kabson-waters-logo.svg" alt="KW" fill className="object-contain brightness-0 invert opacity-90" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">Kabson Waters</p>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-black text-white tracking-[-0.02em]">
              {isSignUp ? "Create account" : "Sign in"}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isSignUp ? "Set up your Kabson Waters workspace account." : "Access your management dashboard."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 text-sm select-none">@</span>
                  <input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
                    placeholder="yourname" maxLength={32} required
                    className="w-full pl-8 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onFocus={e => { e.currentTarget.style.border = "1px solid rgba(37,99,235,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
                    onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1.5">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => setRole(r.value)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition"
                      style={{
                        background: role === r.value ? `${r.color}14` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${role === r.value ? `${r.color}50` : "rgba(255,255,255,0.07)"}`,
                      }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color, boxShadow: role === r.value ? `0 0 8px ${r.color}88` : "none" }} />
                      <div>
                        <p className="text-[12px] font-bold text-white">{r.label}</p>
                        <p className="text-[10px] text-slate-600">{r.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoComplete="email"
                className="w-full px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                onFocus={e => { e.currentTarget.style.border = "1px solid rgba(37,99,235,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
                onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="w-full px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-slate-600 outline-none transition rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={e => { e.currentTarget.style.border = "1px solid rgba(37,99,235,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
                  onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition">
                  {showPw
                    ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm text-rose-400"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", boxShadow: "0 2px 12px rgba(37,99,235,0.35)" }}>
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center text-[13px] text-slate-600">
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <button onClick={() => { setIsSignUp(v => !v); setError(""); setUsername(""); setRole("cashier"); }}
              className="text-blue-400 hover:text-blue-300 font-semibold transition">
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </div>

          <div className="mt-6 px-4 py-3 rounded-xl text-[11px] text-slate-600" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-bold text-slate-500 mb-1.5">Demo credentials</p>
            <p>Email: <span className="font-mono text-slate-400">demo@kabsonwater.com</span></p>
            <p>Password: <span className="font-mono text-slate-400">Demo123!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
