"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import {
  subscribeToInventory, createRetailSale, updateInventoryStock,
  subscribeToCustomers, updateCustomerCredit, type InventoryItem, type CustomerProfile,
} from "@/lib/commerce";

const PAYMENT_METHODS = [
  { id: "Cash", label: "Cash", icon: "💵" },
  { id: "Card", label: "Card", icon: "💳" },
  { id: "Mobile Money", label: "M-Pesa", icon: "📱" },
  { id: "Credit", label: "Credit", icon: "🏦" },
];

export default function RetailPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [shiftStatus, setShiftStatus] = useState<"Closed" | "Open">("Closed");
  const [includeTax, setIncludeTax] = useState(false);

  useEffect(() => {
    const u1 = subscribeToInventory(setInventory);
    const u2 = subscribeToCustomers(setCustomers);
    return () => { u1(); u2(); };
  }, []);

  const categories = useMemo(() => ["All", ...new Set(inventory.map((i) => i.category))], [inventory]);

  const filteredProducts = useMemo(() =>
    inventory.filter((item) =>
      (selectedCategory === "All" || item.category === selectedCategory) &&
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [inventory, searchTerm, selectedCategory]);

  const filteredCustomers = useMemo(() =>
    customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch]);

  const cartItems = useMemo(() =>
    Object.entries(cart).map(([itemId, quantity]) => {
      const item = inventory.find((i) => i.id === itemId);
      return item ? { ...item, quantity } : null;
    }).filter(Boolean) as (InventoryItem & { quantity: number })[],
    [cart, inventory]);

  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.price * i.quantity, 0), [cartItems]);
  const vat = includeTax ? Math.round(subtotal * 0.16) : 0;
  const total = subtotal + vat;
  const change = amountTendered ? Math.max(0, parseFloat(amountTendered) - total) : 0;

  const lowStockItems = useMemo(() => inventory.filter((i) => i.stock <= i.reorderPoint), [inventory]);

  const addToCart = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const addMultipleToCart = (id: string, qty: number) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + qty }));
  const removeOne = (id: string) => setCart((c) => {
    const next = (c[id] ?? 0) - 1;
    if (next <= 0) { const { [id]: _, ...rest } = c; return rest; }
    return { ...c, [id]: next };
  });
  const clearCart = () => { setCart({}); setSelectedCustomer(null); setAmountTendered(""); };

  const [saleError, setSaleError] = useState("");

  const completeSale = async () => {
    if (cartItems.length === 0) return;
    if (shiftStatus === "Closed") {
      setSaleError("Cannot complete sale while shift is closed.");
      return;
    }
    // Credit payment requires a customer
    if (paymentMethod === "Credit" && !selectedCustomer) {
      setSaleError("Credit sales require a customer to be selected.");
      return;
    }
    // Check credit limit
    if (paymentMethod === "Credit" && selectedCustomer) {
      const available = (selectedCustomer.creditLimit || 0) - (selectedCustomer.creditBalance || 0);
      if (total > available) {
        setSaleError(`Credit limit exceeded. Available: KES ${available.toLocaleString()}.`);
        return;
      }
    }
    setLoading(true);
    setSaleError("");
    try {
      await createRetailSale({
        ...(selectedCustomer?.id ? { customerId: selectedCustomer.id } : {}),
        items: cartItems.map((i) => ({ itemId: i.id, quantity: i.quantity, price: i.price })),
        total,
        paymentMethod,
        status: "Completed",
      });
      // Update stock for all items in parallel
      await Promise.all(
        cartItems.map((item) => updateInventoryStock(item.id, Math.max(0, item.stock - item.quantity)))
      );
      // If credit, increase customer's credit balance
      if (paymentMethod === "Credit" && selectedCustomer) {
        await updateCustomerCredit(selectedCustomer.id, total);
      }
      clearCart();
      setSaleSuccess(true);
      setTimeout(() => setSaleSuccess(false), 4000);
    } catch (err: unknown) {
      setSaleError(err instanceof Error ? err.message : "Sale failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">🛒</div>
            <div className="min-w-0">
              <p className="font-black text-xs sm:text-sm">KABSON WATERS — POS</p>
              <p className="text-blue-200 text-xs hidden sm:block">{new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <button
              onClick={() => setShiftStatus(s => s === "Open" ? "Closed" : "Open")}
              className={`ml-4 text-xs font-bold px-3 py-1.5 rounded-xl transition ${shiftStatus === "Open" ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
            >
              {shiftStatus === "Open" ? "Close Shift" : "Open Shift"}
            </button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {lowStockItems.length > 0 && (
              <span className="rounded-full bg-amber-400 text-amber-900 text-xs font-bold px-2 sm:px-3 py-1">
                ⚠ {lowStockItems.length}
              </span>
            )}
            <Link href="/inventory" className="rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-2 sm:px-3 py-1.5 transition">
              Inv
            </Link>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden gap-4 lg:gap-0 p-4 lg:p-0 lg:bg-slate-100">
          {/* LEFT: Product browser */}
          <div className="flex-1 flex flex-col overflow-hidden lg:bg-slate-100">
            {/* Search + categories */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-2 shrink-0 rounded-t-2xl lg:rounded-none">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" placeholder="Search products by name or SKU..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="font-semibold">No products found</p>
                  <p className="text-sm mt-1">Try a different search or category</p>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredProducts.map((product) => {
                    const inCart = cart[product.id] ?? 0;
                    const isLow = product.stock <= product.reorderPoint;
                    const outOfStock = product.stock === 0;
                    return (
                      <button key={product.id} onClick={() => !outOfStock && addToCart(product.id)} disabled={outOfStock}
                        className={`relative rounded-2xl border-2 bg-white p-4 text-left transition-all duration-150 ${
                          outOfStock ? "opacity-50 cursor-not-allowed border-slate-200" :
                          inCart > 0 ? "border-blue-500 shadow-md shadow-blue-100 scale-[1.02]" :
                          "border-slate-200 hover:border-blue-300 hover:shadow-md active:scale-95"
                        }`}>
                        {inCart > 0 && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                            {inCart}
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mb-3">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white opacity-90">
                            <path d="M12 2C8.5 7 5 10.5 5 14a7 7 0 0014 0c0-3.5-3.5-7-7-12z"/>
                          </svg>
                        </div>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">{product.category}</p>
                        <p className="font-bold text-slate-900 text-sm mt-0.5 leading-tight">{product.name}</p>
                        <p className="text-base font-black text-slate-900 mt-2">KES {product.price.toLocaleString()}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs font-semibold ${isLow ? "text-rose-500" : "text-emerald-600"}`}>
                            {outOfStock ? "Out of stock" : `${product.stock} left`}
                          </span>
                          {inCart > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); removeOne(product.id); }}
                              className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition">
                              −
                            </button>
                          )}
                        </div>
                        {product.name.toLowerCase().includes("1l") && !product.name.toLowerCase().includes("500ml") && (
                          <button onClick={(e) => { e.stopPropagation(); addMultipleToCart(product.id, 12); }} disabled={outOfStock} className="mt-3 w-full text-xs font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 py-2 rounded-lg transition disabled:opacity-50">
                            Add Pack (12)
                          </button>
                        )}
                        {product.name.toLowerCase().includes("500ml") && (
                          <button onClick={(e) => { e.stopPropagation(); addMultipleToCart(product.id, 24); }} disabled={outOfStock} className="mt-3 w-full text-xs font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 py-2 rounded-lg transition disabled:opacity-50">
                            Add Pack (24)
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart + checkout - Hidden on mobile, shown on lg+ */}
          <div className={`${showCheckout ? "fixed inset-0 lg:static lg:inset-auto" : "hidden lg:flex"} lg:w-96 bg-white ${showCheckout ? "z-50 flex flex-col rounded-t-3xl shadow-2xl max-h-[95vh]" : ""} lg:border-l lg:border-slate-200 lg:flex-col lg:shrink-0`}>
            {/* Mobile header with close button */}
            {showCheckout && (
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-200 lg:hidden">
                <h2 className="font-black text-slate-900">Cart & Checkout</h2>
                <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Customer */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Customer</p>
              {selectedCustomer ? (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2">
                  <div>
                    <p className="font-bold text-blue-900 text-sm">{selectedCustomer.name}</p>
                    <p className="text-xs text-blue-500">{selectedCustomer.loyaltyPoints} pts · {selectedCustomer.phone}</p>
                    <p className="text-xs text-blue-600 font-semibold">Spent: KES {selectedCustomer.totalPurchases.toLocaleString()}</p>
                    {selectedCustomer.creditLimit ? (
                      <p className="text-xs text-amber-600 font-semibold">
                        Credit: KES {(selectedCustomer.creditBalance || 0).toLocaleString()} / {selectedCustomer.creditLimit.toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-blue-300 hover:text-blue-600 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" placeholder="Search customer..." value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition" />
                  {customerSearch && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                      {filteredCustomers.map((c) => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 text-slate-700 first:rounded-t-xl last:rounded-b-xl border-b border-slate-50 last:border-0">
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cart ({cartItems.length})</p>
                {cartItems.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition">Clear all</button>
                )}
              </div>
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  <p className="text-sm font-medium">Tap products to add</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.quantity} × KES {item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-slate-900">KES {(item.price * item.quantity).toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => removeOne(item.id)} className="w-6 h-6 rounded-full bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition">−</button>
                          <button onClick={() => addToCart(item.id)} className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold transition">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals + payment */}
            <div className="border-t border-slate-200 px-4 py-4 space-y-3 shrink-0">
              {/* Totals */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span><span className="font-semibold">KES {subtotal.toLocaleString()}</span>
                </div>
                {includeTax && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>VAT (16%)</span><span>KES {vat.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>TOTAL</span><span className="text-blue-700">KES {total.toLocaleString()}</span>
                </div>
                <div className="pt-2 flex items-center justify-end">
                  <label className="text-sm font-bold text-slate-600 flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Include Tax (16%)
                  </label>
                </div>
              </div>

              {/* Payment method */}
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                    disabled={m.id === "Credit" && !selectedCustomer}
                    className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${paymentMethod === m.id ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    <span className="text-base">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Cash tendered */}
              {paymentMethod === "Cash" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Amount tendered</label>
                  <input type="number" placeholder={`KES ${total.toLocaleString()}`} value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition" />
                  {amountTendered && parseFloat(amountTendered) >= total && (
                    <p className="text-xs font-bold text-emerald-600 mt-1">Change: KES {change.toLocaleString()}</p>
                  )}
                </div>
              )}

              {/* Credit info banner */}
              {paymentMethod === "Credit" && selectedCustomer && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs">
                  <p className="font-bold text-amber-800">Credit Sale — {selectedCustomer.name}</p>
                  <p className="text-amber-600 mt-0.5">
                    Balance: KES {(selectedCustomer.creditBalance || 0).toLocaleString()} &nbsp;/&nbsp;
                    Limit: KES {(selectedCustomer.creditLimit || 0).toLocaleString()}
                  </p>
                  <p className="text-amber-600 font-semibold mt-0.5">
                    After sale: KES {((selectedCustomer.creditBalance || 0) + total).toLocaleString()}
                  </p>
                </div>
              )}

              {saleError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-medium">
                  {saleError}
                </div>
              )}

              {/* Complete sale */}
              {saleSuccess ? (
                <div className="rounded-xl bg-emerald-500 text-white font-black py-4 text-center text-sm flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Sale complete! Receipt ready.
                </div>
              ) : (
                <button onClick={completeSale} disabled={loading || cartItems.length === 0}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 text-sm transition shadow-lg shadow-blue-200">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : `Charge KES ${total.toLocaleString()}`}
                </button>
              )}
              {shiftStatus === "Closed" && (
                <div className="text-center mt-2">
                  <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 inline-block">
                    Shift is closed. Open shift to record sales.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile floating checkout button */}
        {cartItems.length > 0 && !showCheckout && (
          <button onClick={() => setShowCheckout(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-300 flex items-center justify-center font-black text-lg transition">
            {cartItems.length}
          </button>
        )}
      </div>
    </SiteShell>
  );
}
