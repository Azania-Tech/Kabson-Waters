"use client";

import Link from "next/link";
import { useState } from "react";
import ShopNavbar from "@/components/layout/Navbar";
import { useCart } from "@/context/CartContext";
import { createOrderRecord, createRetailSale } from "@/lib/commerce";
import { saleKindLabel, shouldSkipInventory } from "@/lib/pricing";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "details" | "success">("cart");
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = getTotalPrice();
  const vat = Math.round(subtotal * 0.16);
  const total = subtotal + vat;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const itemsSummary = cart.map(i => `${i.quantity}× ${i.name} (${saleKindLabel(i.saleKind)})`).join(", ");
      await createOrderRecord({
        customer: form.name.trim(),
        type: "Online order",
        volume: itemsSummary,
        status: "Pending approval",
        due: "To be confirmed",
      });
      await createRetailSale({
        items: cart.map((i) => ({
          itemId: i.id,
          itemName: i.name,
          quantity: i.quantity,
          price: i.unitPrice,
          saleKind: i.saleKind,
          skipInventory: shouldSkipInventory(i.saleKind),
        })),
        total,
        paymentMethod: "Online",
        status: "Pending",
      });
      clearCart();
      setCheckoutStep("success");
    } catch {
      setError("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkoutStep === "success") {
    return (
      <>
        <ShopNavbar />
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Order placed!</h2>
          <p className="text-slate-500 mb-2">Thank you, {form.name}. Your order has been received.</p>
          <p className="text-slate-400 text-sm mb-8">Our team will confirm your order and arrange delivery to {form.address || "your location"}.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/shop/products" className="btn btn-primary btn-lg btn-pill">Continue shopping</Link>
            <Link href="/shop" className="btn btn-secondary btn-lg btn-pill">Back to shop</Link>
          </div>
        </div>
      </>
    );
  }

  if (cart.length === 0 && checkoutStep === "cart") {
    return (
      <>
        <ShopNavbar />
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-6">Add some products to get started.</p>
            <Link href="/shop/products" className="btn btn-primary btn-pill">Browse products</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ShopNavbar />
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Progress steps */}
        <div className="flex items-center gap-3 mb-8">
          {["Cart", "Your details", "Confirmation"].map((step, i) => {
            const stepKey = ["cart", "details", "success"][i];
            const active = checkoutStep === stepKey;
            const done = (checkoutStep === "details" && i === 0) || (checkoutStep === "success" && i < 2);
            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${active ? "text-blue-700 font-bold" : done ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${active ? "bg-blue-700 text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className="text-sm hidden sm:block">{step}</span>
                </div>
                {i < 2 && <div className={`h-px w-8 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left — cart or form */}
          <div className="lg:col-span-2">
            {checkoutStep === "cart" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="page-title">Shopping Cart</h1>
                  <button onClick={clearCart} className="btn btn-ghost btn-sm text-rose-500 hover:text-rose-700">Clear all</button>
                </div>
                {cart.map((item) => (
                  <div key={item.lineId} className="card p-4 flex gap-4 items-start">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                        <path d="M12 2C8.5 7 5 10.5 5 14a7 7 0 0014 0c0-3.5-3.5-7-7-12z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {item.size} · {saleKindLabel(item.saleKind)} · KES {item.unitPrice.toLocaleString()} each
                          </p>
                        </div>
                        <p className="font-black text-slate-900 shrink-0 text-sm">KES {(item.unitPrice * item.quantity).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
                          <button onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center font-bold transition hover:bg-slate-100 text-slate-600">−</button>
                          <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center font-bold transition hover:bg-slate-100 text-slate-600">+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.lineId)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold transition">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4">
                  <button onClick={() => setCheckoutStep("details")} className="btn btn-primary btn-lg w-full">
                    Continue to details →
                  </button>
                </div>
              </div>
            ) : (
              <div className="card p-6">
                <h2 className="text-xl font-black text-slate-900 mb-6">Delivery details</h2>
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="field">
                      <label className="label">Full name *</label>
                      <input className="input" placeholder="Jane Wanjiku" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="field">
                      <label className="label">Phone *</label>
                      <input className="input" placeholder="0712 345 678" type="tel" value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Delivery address</label>
                    <input className="input" placeholder="e.g. Westlands, Nairobi" value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="label">Special instructions</label>
                    <textarea className="input" rows={3} placeholder="Any delivery notes..."
                      value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  {error && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setCheckoutStep("cart")} className="btn btn-secondary">← Back</button>
                    <button type="submit" disabled={loading} className="btn btn-primary btn-lg flex-1">
                      {loading ? "Placing order..." : `Place order · KES ${total.toLocaleString()}`}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right — order summary */}
          <div className="lg:col-span-1">
            <div className="card p-5 sticky top-5">
              <h3 className="font-black text-slate-900 mb-4">Order summary</h3>
              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div key={item.lineId} className="flex justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>{item.name} ({saleKindLabel(item.saleKind)}) ×{item.quantity}</span>
                    <span className="font-semibold">KES {(item.unitPrice * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                  <span className="font-semibold">KES {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-secondary)" }}>VAT (16%)</span>
                  <span className="font-semibold">KES {vat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-secondary)" }}>Delivery</span>
                  <span className="font-semibold text-emerald-600">Free</span>
                </div>
                <div className="flex justify-between text-base font-black pt-2 border-t" style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}>
                  <span>Total</span>
                  <span style={{ color: "var(--kw-700)" }}>KES {total.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
                Delivery within Nairobi &amp; surroundings
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
