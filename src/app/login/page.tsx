"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setUserRole } from "@/lib/commerce";

function friendlyError(message: string): string {
  if (message.includes("user-not-found") || message.includes("wrong-password") || message.includes("invalid-credential"))
    return "Invalid email or password. Please try again.";
  if (message.includes("email-already-in-use"))
    return "An account with this email already exists.";
  if (message.includes("weak-password"))
    return "Password must be at least 6 characters.";
  if (message.includes("invalid-email"))
    return "Please enter a valid email address.";
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"cashier" | "manager" | "admin" | "owner">("cashier");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        if (!username.trim()) { setError("Please enter a username."); setLoading(false); return; }
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Set display name immediately after account creation
        await updateProfile(credential.user, { displayName: username.trim() });
        // Seed user record in Firestore with username as displayName
        await setUserRole(credential.user.uid, email, selectedRole, username.trim());
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : "Authentication failed"));
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => { setIsSignUp((v) => !v); setError(""); setUsername(""); setSelectedRole("cashier"); };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.15),transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 relative">
            <Image src="/logo/kabson-waters-logo.svg" alt="Kabson Waters" fill className="object-contain" priority />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">Kabsonwater</p>
            <p className="text-sm font-semibold text-white">Water Solutions</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Water retail, refill,<br />and hospitality<br />in one platform.
          </h2>
          <p className="text-slate-400 text-base leading-7 max-w-sm">
            Manage orders, inventory, customer accounts, and financial reporting from a single dashboard.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { value: "1,240+", label: "Retail orders" },
              { value: "28", label: "Active routes" },
              { value: "96", label: "Hospitality clients" },
              { value: "4 zones", label: "Daily dispatch" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-slate-600">© {new Date().getFullYear()} Kabsonwater. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 relative">
            <Image src="/logo/kabson-waters-logo.svg" alt="Kabson Waters" fill className="object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">Kabsonwater</p>
            <p className="text-sm font-semibold text-slate-900">Water Solutions</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              {isSignUp ? "Set up your Kabsonwater account to get started." : "Sign in to your Kabsonwater dashboard."}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <form onSubmit={handleAuth} className="space-y-5">

              {/* Username — sign up only */}
              {isSignUp && (
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none">@</span>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                      placeholder="yourname"
                      autoComplete="username"
                      required={isSignUp}
                      maxLength={32}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">This is how you'll appear across the platform.</p>
                </div>
              )}

              {/* Role selector — sign up only */}
              {isSignUp && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Account role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "cashier", label: "Cashier", desc: "POS sales only", color: "peer-checked:border-slate-400 peer-checked:bg-slate-50" },
                      { value: "manager", label: "Manager", desc: "Orders & inventory", color: "peer-checked:border-sky-400 peer-checked:bg-sky-50" },
                      { value: "admin", label: "Admin", desc: "All features", color: "peer-checked:border-violet-400 peer-checked:bg-violet-50" },
                      { value: "owner", label: "Owner", desc: "Full access", color: "peer-checked:border-amber-400 peer-checked:bg-amber-50" },
                    ] as const).map((r) => (
                      <label key={r.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value={r.value}
                          checked={selectedRole === r.value}
                          onChange={() => setSelectedRole(r.value)}
                          className="sr-only peer"
                        />
                        <div className={`rounded-xl border-2 border-slate-200 px-3 py-2.5 transition ${r.color} ${selectedRole === r.value ? r.color.replace("peer-checked:", "") : ""}`}>
                          <p className="text-sm font-semibold text-slate-900">{r.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    className="w-full px-4 py-2.5 pr-12 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition bg-slate-50 focus:bg-white"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition text-sm">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {isSignUp ? "Creating account..." : "Signing in..."}
                  </span>
                ) : isSignUp ? "Create account" : "Sign in"}
              </button>
            </form>

            {/* Toggle sign in / sign up */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={toggle} className="text-sky-600 hover:text-sky-700 font-semibold transition">
                {isSignUp ? "Sign in" : "Create one"}
              </button>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700 mb-2">Demo credentials</p>
            <div className="space-y-1">
              <p>Email: <span className="font-mono text-slate-900">demo@kabsonwater.com</span></p>
              <p>Password: <span className="font-mono text-slate-900">Demo123!</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
