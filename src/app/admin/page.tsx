"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteShell from "@/components/site-shell";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import {
  subscribeToUsers,
  setUserRole,
  subscribeToOrders,
  updateOrderStatus,
  subscribeToSales,
  subscribeToInventory,
  subscribeToCustomers,
  subscribeToStores,
  subscribeToTransfers,
  createUserAccount,
  createStore,
  deleteTodaysSalesRecords,
  deleteAllRecordsExceptUsers,
  getStoreConfig,
  updateStoreConfig,
  type UserRecord,
  type CustomerOrderRecord,
  type StoreConfig,
  type Store,
  type InterStoreTransfer,
} from "@/lib/commerce";

const ROLES: UserRecord["role"][] = ["cashier", "manager", "admin", "owner"];

const roleStyles: Record<string, string> = {
  cashier: "bg-slate-100 text-slate-700 border-slate-200",
  manager: "bg-sky-50 text-sky-700 border-sky-200",
  admin: "bg-violet-50 text-violet-700 border-violet-200",
  owner: "bg-amber-50 text-amber-700 border-amber-200",
};

const orderStatusStyles: Record<string, string> = {
  "Pending approval": "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-sky-50 text-sky-700 border-sky-200",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Processing: "bg-violet-50 text-violet-700 border-violet-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

type Tab = "overview" | "orders" | "users" | "store";

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([]);
  const [sales, setSales] = useState<{ total: number }[]>([]);
  const [inventory, setInventory] = useState<{ stock: number; reorderPoint: number }[]>([]);
  const [customers, setCustomers] = useState<unknown[]>([]);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending">("pending");

  // Create-user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<UserRecord["role"]>("cashier");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Store config state
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [storeForm, setStoreForm] = useState({ storeName: "", city: "", phone: "", email: "", businessRegistration: "", taxPin: "", bankAccount: "", bankName: "" });
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeError, setStoreError] = useState("");

  // Multi-store state
  const [stores, setStores] = useState<Store[]>([]);
  const [transfers, setTransfers] = useState<InterStoreTransfer[]>([]);
  const [newStoreForm, setNewStoreForm] = useState({ name: "", location: "", type: "retail" as const });
  const [newStoreSaving, setNewStoreSaving] = useState(false);
  const [transferFilterStore, setTransferFilterStore] = useState<string | "all">("all");
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearTarget, setClearTarget] = useState<"today" | "all" | null>(null);
  const [clearPassword, setClearPassword] = useState("");
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState("");
  const [clearSuccess, setClearSuccess] = useState("");

  // Guard: redirect non-admins
  useEffect(() => {
    if (!loading && role !== "admin" && role !== "owner") {
      router.replace("/");
    }
  }, [loading, role, router]);

  useEffect(() => {
    const loadStoreConfig = async () => {
      const config = await getStoreConfig();
      if (config) {
        setStoreConfig(config);
        setStoreForm({
          storeName: config.storeName,
          city: config.city,
          phone: config.phone,
          email: config.email,
          businessRegistration: config.businessRegistration,
          taxPin: config.taxPin,
          bankAccount: config.bankAccount,
          bankName: config.bankName,
        });
      }
    };
    loadStoreConfig();
  }, []);

  useEffect(() => {
    if (role !== "admin" && role !== "owner") return;
    const u1 = subscribeToUsers(setUsers);
    const u2 = subscribeToOrders(setOrders);
    const u3 = subscribeToSales((s) => setSales(s.map((x) => ({ total: x.total }))));
    const u4 = subscribeToInventory((i) => setInventory(i.map((x) => ({ stock: x.stock, reorderPoint: x.reorderPoint }))));
    const u5 = subscribeToCustomers((c) => setCustomers(c));
    const u6 = subscribeToStores(setStores);
    const u7 = subscribeToTransfers(setTransfers);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, [role]);

  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
    const pendingOrders = orders.filter((o) => o.status === "Pending approval").length;
    const lowStock = inventory.filter((i) => i.stock <= i.reorderPoint).length;
    return { totalRevenue, pendingOrders, lowStock, totalCustomers: customers.length, totalUsers: users.length };
  }, [sales, orders, inventory, customers, users]);

  const filteredOrders = useMemo(
    () => orderFilter === "pending" ? orders.filter((o) => o.status === "Pending approval") : orders,
    [orders, orderFilter]
  );

  const handleRoleChange = async (uid: string, email: string, newRole: UserRecord["role"]) => {
    setUpdatingRole(uid);
    try {
      await setUserRole(uid, email, newRole);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId);
    try {
      await updateOrderStatus(orderId, status);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const openClearModal = (target: "today" | "all") => {
    setClearTarget(target);
    setClearError("");
    setClearPassword("");
    setShowClearModal(true);
  };

  const handleConfirmClear = async () => {
    setClearError("");
    if (!clearPassword.trim()) {
      setClearError("Enter your password to confirm.");
      return;
    }
    if (!clearTarget) {
      setClearError("Select a clear action.");
      return;
    }
    if (!user) {
      setClearError("You must be signed in to clear records.");
      return;
    }
    if (!user.email) {
      setClearError("Your account does not have an email address. Please sign in with an email/password account.");
      return;
    }
    if (!auth) {
      setClearError("Firebase auth is not initialized. Reload the page and try again.");
      return;
    }
    setClearLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, clearPassword);
      await reauthenticateWithCredential(user, credential);

      if (clearTarget === "today") {
        const deleted = await deleteTodaysSalesRecords();
        setClearSuccess(`Cleared ${deleted} sales records from today.`);
      } else {
        const deleted = await deleteAllRecordsExceptUsers();
        setClearSuccess(`Cleared ${deleted} records from all collections except users.`);
      }

      setShowClearModal(false);
      setClearPassword("");
      setClearTarget(null);
      setTimeout(() => setClearSuccess(""), 5000);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code?: string }).code;
        if (code === "auth/wrong-password") {
          setClearError("Incorrect password. Please try again.");
        } else if (code === "auth/requires-recent-login") {
          setClearError("Please sign out and sign in again before clearing records.");
        } else {
          setClearError(err instanceof Error ? err.message : "Failed to authenticate.");
        }
      } else {
        setClearError(err instanceof Error ? err.message : "Failed to authenticate.");
      }
    } finally {
      setClearLoading(false);
    }
  };

  const saveStoreConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.storeName.trim()) {
      setStoreError("Store name is required.");
      return;
    }
    setStoreSaving(true);
    setStoreError("");
    try {
      await updateStoreConfig(storeForm);
      setStoreConfig({ ...storeForm, createdAt: "", updatedAt: "" });
    } catch {
      setStoreError("Failed to save store configuration.");
    } finally {
      setStoreSaving(false);
    }
  };

  const handleCreateNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreForm.name.trim()) return;
    setNewStoreSaving(true);
    try {
      await createStore({ ...newStoreForm, isActive: true });
      setNewStoreForm({ name: "", location: "", type: "retail" });
    } finally {
      setNewStoreSaving(false);
    }
  };

  const openCreateModal = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("cashier");
    setCreateError(null);
    setCreateSuccess(false);
    setShowPassword(false);
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword || !createName) {
      setCreateError("Please fill in all fields.");
      return;
    }
    if (createPassword.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createUserAccount(createEmail.trim(), createPassword, createName.trim(), createRole);
      setCreateSuccess(true);
      setTimeout(() => setShowCreateModal(false), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user.";
      if (msg.includes("email-already-in-use")) {
        setCreateError("That email is already registered.");
      } else if (msg.includes("invalid-email")) {
        setCreateError("Please enter a valid email address.");
      } else {
        setCreateError(msg);
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading || (role !== "admin" && role !== "owner")) {
    return (
      <SiteShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-400 text-sm">Checking permissions...</p>
        </div>
      </SiteShell>
    );
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "orders", label: "Order approvals", badge: metrics.pendingOrders },
    { key: "users", label: "User roles", badge: metrics.totalUsers },
    { key: "store", label: "Store config" },
    { key: "stores", label: "Stores", badge: stores.length },
    { key: "transfers", label: "Transfers" },
  ];

  return (
    <SiteShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">

        {/* Header */}
        <div className="rounded-[28px] bg-slate-950 p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.2),transparent_60%)]" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300 mb-2">Administration</p>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="mt-2 text-slate-300 text-sm max-w-xl">
              Manage user roles, approve customer orders, and monitor system-wide activity.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-violet-500/20 border border-violet-400/30 px-3 py-1 text-xs font-semibold text-violet-200">
                Signed in as {role}
              </span>
              <span className="text-slate-400 text-xs">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total revenue", value: `KES ${metrics.totalRevenue.toLocaleString()}`, color: "text-emerald-600" },
            { label: "Pending orders", value: metrics.pendingOrders.toString(), color: metrics.pendingOrders > 0 ? "text-amber-600" : "text-slate-900" },
            { label: "Low stock items", value: metrics.lowStock.toString(), color: metrics.lowStock > 0 ? "text-rose-600" : "text-slate-900" },
            { label: "Total customers", value: metrics.totalCustomers.toString(), color: "text-sky-600" },
            { label: "System users", value: metrics.totalUsers.toString(), color: "text-violet-600" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
              <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="rounded-full bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent orders needing action */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 mb-1">Action required</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending order approvals</h2>
              {orders.filter((o) => o.status === "Pending approval").length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <p className="text-sm font-medium">All orders are up to date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.filter((o) => o.status === "Pending approval").slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{order.customer}</p>
                        <p className="text-xs text-slate-500">{order.type} · {order.volume}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleOrderStatus(order.id, "Approved")} disabled={updatingOrder === order.id}
                          className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                          Approve
                        </button>
                        <button onClick={() => handleOrderStatus(order.id, "Rejected")} disabled={updatingOrder === order.id}
                          className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {orders.filter((o) => o.status === "Pending approval").length > 5 && (
                    <button onClick={() => setTab("orders")} className="text-sm text-sky-600 hover:text-sky-700 font-semibold">
                      View all {orders.filter((o) => o.status === "Pending approval").length} pending →
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* User list preview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 mb-1">Team</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">System users</h2>
              {users.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No users registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {users.slice(0, 6).map((u) => (
                    <div key={u.uid} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                          {(u.displayName || u.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{u.displayName || <span className="italic text-slate-400">No username</span>}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{u.email}</p>
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleStyles[u.role] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                  {users.length > 6 && (
                    <button onClick={() => setTab("users")} className="text-sm text-sky-600 hover:text-sky-700 font-semibold pt-1">
                      View all {users.length} users →
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 mb-1">Secure action</p>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Clear today's sales</h2>
              <p className="text-sm text-slate-500 mb-5">Delete all sales records created today. This is protected by password verification.</p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => openClearModal("today")}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 text-sm font-semibold transition"
                >
                  Clear today's sales
                </button>
                <button
                  type="button"
                  onClick={() => openClearModal("all")}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 text-sm font-semibold transition"
                >
                  Clear all records except users
                </button>
              </div>
              {clearSuccess && (
                <p className="mt-4 text-sm text-emerald-600">{clearSuccess}</p>
              )}
            </div>
          </div>
        )}

        {/* ORDER APPROVALS TAB */}
        {tab === "orders" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {(["pending", "all"] as const).map((f) => (
                <button key={f} onClick={() => setOrderFilter(f)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition capitalize ${orderFilter === f ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {f === "pending" ? `Pending (${metrics.pendingOrders})` : `All orders (${orders.length})`}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left">
                      {["Order","Customer","Service","Volume","Due","Status","Actions"].map((h) => (
                        <th key={h} className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-900">{order.id}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{order.customer}</td>
                        <td className="px-5 py-4 text-slate-600">{order.type}</td>
                        <td className="px-5 py-4 text-slate-600">{order.volume}</td>
                        <td className="px-5 py-4 text-slate-500">{order.due}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${orderStatusStyles[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {order.status === "Pending approval" ? (
                            <div className="flex gap-2">
                              <button onClick={() => handleOrderStatus(order.id, "Approved")} disabled={updatingOrder === order.id}
                                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                                {updatingOrder === order.id ? "..." : "Approve"}
                              </button>
                              <button onClick={() => handleOrderStatus(order.id, "Rejected")} disabled={updatingOrder === order.id}
                                className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                                {updatingOrder === order.id ? "..." : "Reject"}
                              </button>
                            </div>
                          ) : order.status === "Approved" ? (
                            <div className="flex gap-2">
                              <button onClick={() => handleOrderStatus(order.id, "Scheduled")} disabled={updatingOrder === order.id}
                                className="rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                                Schedule
                              </button>
                            </div>
                          ) : order.status === "Scheduled" ? (
                            <button onClick={() => handleOrderStatus(order.id, "Delivered")} disabled={updatingOrder === order.id}
                              className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50">
                              Mark delivered
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <p className="text-sm font-medium">No orders to show</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* USER ROLES TAB */}
        {tab === "users" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Access control</p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">User roles</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Cashier — POS only · Manager — POS + orders + inventory · Admin — all features · Owner — full access
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-semibold shadow-sm transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create user
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left">
                    {["User & email","Current role","Change role","Since"].map((h) => (
                      <th key={h} className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                            {(u.displayName || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {u.displayName || <span className="italic text-slate-400 font-normal">No username</span>}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleStyles[u.role] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {/* Owners can change anyone; admins can change cashier/manager only */}
                        {(role === "owner" || (role === "admin" && u.role !== "owner" && u.role !== "admin")) && u.uid !== user?.uid ? (
                          <select
                            value={u.role}
                            disabled={updatingRole === u.uid}
                            onChange={(e) => handleRoleChange(u.uid, u.email, e.target.value as UserRecord["role"])}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition disabled:opacity-50"
                          >
                            {ROLES.filter((r) => role === "owner" || r !== "owner").map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400">{u.uid === user?.uid ? "You" : "Protected"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <p className="text-sm font-medium">No users yet — they appear here after first login.</p>
              </div>
            )}
          </div>
        )}

        {/* STORE CONFIG TAB */}
        {tab === "store" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">System</p>
              <h2 className="mt-0.5 text-lg font-semibold text-slate-900">Store Configuration</h2>
              <p className="text-xs text-slate-500 mt-1">Business details used in reports and receipts</p>
            </div>
            <form onSubmit={saveStoreConfig} className="px-6 py-4 space-y-4">
              {[
                { label: "Store name *", key: "storeName", type: "text" },
                { label: "City", key: "city", type: "text" },
                { label: "Phone", key: "phone", type: "tel" },
                { label: "Email", key: "email", type: "email" },
                { label: "Business registration", key: "businessRegistration", type: "text" },
                { label: "Tax PIN", key: "taxPin", type: "text" },
                { label: "Bank account", key: "bankAccount", type: "text" },
                { label: "Bank name", key: "bankName", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                  <input
                    type={type}
                    placeholder={`e.g. ${label === "Store name" ? "Kabson Waters" : ""}`}
                    value={storeForm[key as keyof typeof storeForm]}
                    onChange={(e) => setStoreForm(f => ({ ...f, [key]: e.target.value }))}
                    required={key === "storeName"}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                  />
                </div>
              ))}
              {storeError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                  {storeError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={storeSaving}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition"
                >
                  {storeSaving ? "Saving..." : "Save configuration"}
                </button>
                {storeConfig && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Saved
                  </p>
                )}
              </div>
            </form>
          </div>
        )}

      </div>

      {/* ── CREATE USER MODAL ── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in">
            {/* Modal header */}
            <div className="relative bg-slate-950 px-8 pt-8 pb-6 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.25),transparent_60%)]" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300 mb-1">Admin action</p>
                  <h2 className="text-xl font-bold text-white">Create new user</h2>
                  <p className="mt-1 text-slate-400 text-xs">A Firebase account will be created immediately.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-1 rounded-full w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreateUser} className="px-8 py-6 flex flex-col gap-5">

              {/* Success banner */}
              {createSuccess && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <p className="text-sm font-semibold text-emerald-700">User created successfully!</p>
                </div>
              )}

              {/* Error banner */}
              {createError && (
                <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-500 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-rose-700">{createError}</p>
                </div>
              )}

              {/* Full name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Jane Wanjiru"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email address</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.filter((r) => role === "owner" || r !== "owner").map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCreateRole(r)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        createRole === r
                          ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-200"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="capitalize">{r}</span>
                      {createRole === r && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || createSuccess}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Creating…
                    </>
                  ) : createSuccess ? (
                    "Done!"
                  ) : (
                    "Create user"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowClearModal(false); }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in">
            <div className="px-8 pt-8 pb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500 mb-1">Secure action</p>
                  <h2 className="text-xl font-bold text-slate-900">
                    {clearTarget === "all" ? "Clear all business records" : "Clear today's sales"}
                  </h2>
                  <p className="mt-1 text-slate-500 text-sm">
                    {clearTarget === "all"
                      ? "Enter your password to confirm and delete every business record except user profiles."
                      : "Enter your password to confirm and delete today's sales records."}
                  </p>
                </div>
                <button
                  onClick={() => setShowClearModal(false)}
                  className="rounded-full w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-8 pb-8">
              {clearError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 mb-4">
                  {clearError}
                </div>
              )}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Password</label>
                <input
                  type="password"
                  value={clearPassword}
                  onChange={(e) => setClearPassword(e.target.value)}
                  placeholder="Enter your admin password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
                />
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  disabled={clearLoading}
                  className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-3 text-sm font-semibold transition"
                >
                  {clearLoading
                    ? "Clearing..."
                    : clearTarget === "all"
                      ? "Confirm clear all records"
                      : "Confirm clear sales"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </SiteShell>
  );
}
