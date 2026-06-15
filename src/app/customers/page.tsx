"use client";

import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import { KwIcon } from "@/components/ui/icons";
import { MetricCard, MetricGrid, PageHeader, PageLayout } from "@/components/ui/page-layout";
import {
  subscribeToCustomers,
  createCustomerProfile,
  updateCustomerProfile,
  deleteCustomerProfile,
  updateCustomerLoyalty,
  settleCustomerCredit,
  type CustomerProfile,
} from "@/lib/commerce";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", creditLimit: "" });
  const [settleAmount, setSettleAmount] = useState("");
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", creditLimit: "" });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCustomers((list) => setCustomers(list));
    return () => unsubscribe();
  }, []);

  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm) ||
          c.email.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [customers, searchTerm]
  );

  const totalRevenue = useMemo(
    () => customers.reduce((sum, c) => sum + c.totalPurchases, 0),
    [customers]
  );

  const totalLoyalty = useMemo(
    () => customers.reduce((sum, c) => sum + c.loyaltyPoints, 0),
    [customers]
  );

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Customer name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createCustomerProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || "-",
        email: form.email.trim() || "-",
        totalPurchases: 0,
        loyaltyPoints: 0,
        creditLimit: parseFloat(form.creditLimit) || 0,
        creditBalance: 0,
        lastPurchase: new Date().toISOString(),
      });
      setForm({ name: "", phone: "", email: "", creditLimit: "" });
      setShowForm(false);
    } catch {
      setError("Failed to create customer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (points: number) => {
    if (points >= 500) return { label: "Gold", classes: "bg-amber-50 text-amber-700 border-amber-200" };
    if (points >= 200) return { label: "Silver", classes: "bg-slate-100 text-slate-700 border-slate-200" };
    return { label: "Member", classes: "bg-sky-50 text-sky-700 border-sky-200" };
  };

  const handleSettleCredit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) { setSettleError("Enter valid amount"); return; }
    if (amt > (selectedCustomer.creditBalance || 0)) { setSettleError("Amount exceeds credit balance"); return; }
    setSettling(true); setSettleError("");
    try {
      await settleCustomerCredit(selectedCustomer.id, amt);
      setSettleAmount("");
      setSelectedCustomer({ ...selectedCustomer, creditBalance: (selectedCustomer.creditBalance || 0) - amt });
    } catch {
      setSettleError("Failed to settle credit");
    } finally {
      setSettling(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!editForm.name.trim()) {
      setError("Customer name is required.");
      return;
    }
    setLoading(true);
    try {
      await updateCustomerProfile(selectedCustomer.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        creditLimit: parseFloat(editForm.creditLimit) || 0,
      });
      setSelectedCustomer({
        ...selectedCustomer,
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        creditLimit: parseFloat(editForm.creditLimit) || 0,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to update customer");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    if (!confirm(`Are you sure you want to delete ${selectedCustomer.name}? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteCustomerProfile(selectedCustomer.id);
      setSelectedCustomer(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!confirm("Are you sure you want to delete ALL existing customers and import the new list? This cannot be undone.")) return;
    setIsBulkImporting(true);
    try {
      // 1. Delete existing
      for (const c of customers) {
        await deleteCustomerProfile(c.id);
      }
      
      // 2. Import new list
      const CUSTOMER_LIST = [
        "Muigai Annex", "TRAQO KISASA", "Wakaba's place", "Red Eagle's", "Sarvid Hotel", "Tobriana Hotel",
        "Babylon Classic", "Club unit", "Klub Makuti", "Almasi Resort", "Kimende Annex", "KQ Hotel",
        "Honeybee Hotel", "Midway Resort", "Sweet water", "The Spot", "Kibii police Station",
        "Kabson Waters", "Potters Inn Club", "Hotpot Annex", "Tayanas", "HillQera", "2 IN 1 Restaurant",
        "Kiambu Road", "Acacia bar &lounge", "Rwathia bar& lounge", "EL Carlos", "Neco counselling",
        "Digital Media", "Utopia Resort", "Bristar School", "Precious Blood School"
      ];
      
      const uniqueCustomers = Array.from(new Set(CUSTOMER_LIST));
      for (const name of uniqueCustomers) {
        await createCustomerProfile({
          name: name,
          phone: "-",
          email: "-",
          totalPurchases: 0,
          loyaltyPoints: 0,
          creditLimit: 0,
          creditBalance: 0,
          lastPurchase: new Date().toISOString(),
        });
      }
      alert("Bulk import successful!");
    } catch (err) {
      console.error(err);
      alert("Error during bulk import.");
    } finally {
      setIsBulkImporting(false);
    }
  };

  const openCustomerDetails = (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsEditing(false);
    setSettleAmount("");
    setSettleError("");
    setError("");
    setEditForm({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      creditLimit: (customer.creditLimit || 0).toString(),
    });
  };

  return (
    <SiteShell>
      <PageLayout>
        <PageHeader
          eyebrow="Customer management"
          title="Customers"
          subtitle="Manage profiles, loyalty points, and purchase history."
          tone="sky"
          actions={
            <>
              <button type="button" onClick={handleBulkImport} disabled={isBulkImporting} className="btn btn-secondary btn-sm text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100">
                {isBulkImporting ? "Importing..." : "Bulk Import"}
              </button>
              <button type="button" onClick={() => { setShowForm((v) => !v); setError(""); }} className="btn btn-primary btn-sm">
                <KwIcon name="plus" size={16} /> Add customer
              </button>
            </>
          }
        />

        <MetricGrid cols={4}>
          <MetricCard label="Total customers" value={customers.length.toString()} tone="sky" icon="users" />
          <MetricCard label="Total revenue" value={`KES ${totalRevenue.toLocaleString()}`} tone="emerald" icon="coins" />
          <MetricCard
            label="Avg. customer value"
            value={`KES ${customers.length > 0 ? Math.round(totalRevenue / customers.length).toLocaleString() : "0"}`}
            tone="blue"
            icon="chart"
          />
          <MetricCard label="Total loyalty points" value={totalLoyalty.toLocaleString()} tone="amber" icon="users" />
        </MetricGrid>

        {/* Add customer form (collapsible) */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">New customer</h2>
            <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full name *</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Wanjiku"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  placeholder="e.g. jane@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Credit Limit (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 50000"
                  value={form.creditLimit}
                  onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide invisible">Action</label>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  {loading ? "Saving..." : "Save customer"}
                </button>
              </div>
              {error && (
                <p className="sm:col-span-2 lg:col-span-5 text-sm text-rose-600">{error}</p>
              )}
            </form>
          </div>
        )}

        {/* Search + Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
              />
            </div>
            <span className="text-sm text-slate-500 shrink-0">
              {filteredCustomers.length} of {customers.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left">
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Customer</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Contact</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Total spent</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Credit</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Loyalty</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Last purchase</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => {
                  const badge = statusBadge(customer.loyaltyPoints);
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => openCustomerDetails(customer)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{customer.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700">{customer.phone}</p>
                        <p className="text-slate-400 text-xs">{customer.email}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-600">
                        KES {customer.totalPurchases.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-semibold text-sm">
                          {customer.creditBalance ? `KES ${customer.creditBalance.toLocaleString()}` : "-"}
                        </div>
                        {customer.creditLimit ? (
                          <div className="text-slate-500 text-xs">Limit: KES {customer.creditLimit.toLocaleString()}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 font-semibold text-sky-600">
                        {customer.loyaltyPoints} pts
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(customer.lastPurchase).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomerDetails(customer);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
                        >
                          <KwIcon name="eye" size={16} className="text-slate-600" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="font-medium">
                {searchTerm ? "No customers match your search" : "No customers yet"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-sky-600 hover:text-sky-700 font-semibold text-sm"
                >
                  Add your first customer ÔåÆ
                </button>
              )}
            </div>
          )}
        </div>

      {/* Customer detail modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => { setSelectedCustomer(null); setIsEditing(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4 mb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-3xl bg-sky-100 flex items-center justify-center text-sky-700 font-black text-xl">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xl">{selectedCustomer.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      <KwIcon name="search" size={14} className="text-slate-500" />
                      {selectedCustomer.phone}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      <KwIcon name="mail" size={14} className="text-slate-500" />
                      {selectedCustomer.email}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
                    title="Edit Customer"
                  >
                    <KwIcon name="edit" size={16} className="text-slate-600" />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => { setSelectedCustomer(null); setIsEditing(false); }}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total spent</p>
                <p className="mt-2 text-lg font-black text-emerald-600">KES {selectedCustomer.totalPurchases.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Loyalty points</p>
                <p className="mt-2 text-lg font-black text-sky-600">{selectedCustomer.loyaltyPoints} pts</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Credit balance</p>
                <p className="mt-2 text-lg font-black text-rose-600">KES {(selectedCustomer.creditBalance || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Limit: KES {(selectedCustomer.creditLimit || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {isEditing ? (
              <form onSubmit={handleEditSubmit} className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Credit Limit (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.creditLimit}
                    onChange={(e) => setEditForm(f => ({ ...f, creditLimit: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold py-2 rounded-xl text-sm transition"
                  >
                    {loading ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2 rounded-xl text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
              <div className="space-y-3 text-sm">
              {[
                { label: "Phone", value: selectedCustomer.phone },
                { label: "Email", value: selectedCustomer.email },
                {
                  label: "Total spent",
                  value: `KES ${selectedCustomer.totalPurchases.toLocaleString()}`,
                  highlight: "text-emerald-600 font-semibold",
                },
                {
                  label: "Loyalty points",
                  value: `${selectedCustomer.loyaltyPoints} pts`,
                  highlight: "text-sky-600 font-semibold",
                },
                {
                  label: "Last purchase",
                  value: new Date(selectedCustomer.lastPurchase).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                },
                {
                  label: "Member since",
                  value: new Date(selectedCustomer.createdAt).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-slate-500">{row.label}</span>
                  <span className={row.highlight ?? "text-slate-900"}>{row.value}</span>
                </div>
              ))}
            </div>

            {(selectedCustomer.creditBalance || 0) > 0 && (
              <form onSubmit={handleSettleCredit} className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Settle Credit (Balance: KES {selectedCustomer.creditBalance?.toLocaleString()})</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={selectedCustomer.creditBalance}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="Amount to settle"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={settling}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
                  >
                    {settling ? "..." : "Settle"}
                  </button>
                </div>
                {settleError && <p className="text-xs text-rose-600 mt-2">{settleError}</p>}
              </form>
            )}
              </>
            )}

            {!isEditing && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full rounded-xl border border-rose-200 text-rose-600 font-semibold py-2.5 text-sm hover:bg-rose-50 disabled:opacity-50 transition"
                >
                  {isDeleting ? "Deleting..." : "Delete Customer"}
                </button>
                <button
                  onClick={() => { setSelectedCustomer(null); setIsEditing(false); }}
                  className="w-full rounded-xl bg-slate-950 text-white font-semibold py-2.5 text-sm hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </PageLayout>
    </SiteShell>
  );
}
