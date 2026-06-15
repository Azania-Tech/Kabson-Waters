"use client";

import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import {
  subscribeToStores, subscribeToInventory, subscribeToTransfers,
  createInterStoreTransfer, updateStoreItemQuantity, createStore,
  getOrCreateDefaultStores, addItemToStore,
  type Store, type InventoryItem, type InterStoreTransfer,
} from "@/lib/commerce";

type Tab = "overview" | "transfer" | "add" | "history";

const storeTypeStyles: Record<string, string> = {
  retail:     "badge badge-blue",
  production: "badge badge-green",
  warehouse:  "badge badge-violet",
};
const storeTypeLabels: Record<string, string> = {
  retail:     "Main Store",
  production: "Production",
  warehouse:  "Warehouse",
};

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<InterStoreTransfer[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [initing, setIniting] = useState(false);

  // Transfer form
  const [tFromStore, setTFromStore] = useState("");
  const [tToStore, setTToStore] = useState("");
  const [tItem, setTItem] = useState("");
  const [tQty, setTQty] = useState("");
  const [tReason, setTReason] = useState("manual_transfer");
  const [tLoading, setTLoading] = useState(false);
  const [tError, setTError] = useState("");
  const [tSuccess, setTSuccess] = useState(false);

  // Add to store form
  const [aStore, setAStore] = useState("");
  const [aItem, setAItem] = useState("");
  const [aQty, setAQty] = useState("");
  const [aNewName, setANewName] = useState("");
  const [aLoading, setALoading] = useState(false);
  const [aError, setAError] = useState("");
  const [aSuccess, setASuccess] = useState(false);

  useEffect(() => {
    const u1 = subscribeToStores(setStores);
    const u2 = subscribeToInventory(setInventory);
    const u3 = subscribeToTransfers(setTransfers);
    return () => { u1(); u2(); u3(); };
  }, []);

  const initStores = async () => {
    setIniting(true);
    try { await getOrCreateDefaultStores(); }
    finally { setIniting(false); }
  };

  // Build store stock map: storeId -> { itemId -> qty }
  const storeStockMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    stores.forEach(s => { map[s.id] = {}; });
    inventory.forEach(item => {
      if (item.stores) {
        Object.entries(item.stores).forEach(([storeId, qty]) => {
          if (!map[storeId]) map[storeId] = {};
          map[storeId][item.id] = qty;
        });
      }
      // production store uses productionStock field
      const prodStore = stores.find(s => s.type === "production");
      if (prodStore) {
        if (!map[prodStore.id]) map[prodStore.id] = {};
        if (item.productionStock !== undefined) map[prodStore.id][item.id] = item.productionStock;
      }
    });
    return map;
  }, [stores, inventory]);

  const storeRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    stores.forEach(s => { map[s.id] = 0; });
    // Sum inventory value per store
    stores.forEach(s => {
      const stock = storeStockMap[s.id] ?? {};
      let val = 0;
      Object.entries(stock).forEach(([itemId, qty]) => {
        const item = inventory.find(i => i.id === itemId);
        if (item) val += item.price * qty;
      });
      map[s.id] = val;
    });
    return map;
  }, [stores, storeStockMap, inventory]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tFromStore || !tToStore || !tItem || !tQty) { setTError("All fields required."); return; }
    if (tFromStore === tToStore) { setTError("Source and destination must differ."); return; }
    const qty = parseInt(tQty);
    if (isNaN(qty) || qty <= 0) { setTError("Enter a valid quantity."); return; }

    setTLoading(true); setTError(""); setTSuccess(false);
    try {
      const fromStore = stores.find(s => s.id === tFromStore);
      const toStore = stores.find(s => s.id === tToStore);

      // Deduct from source
      if (fromStore?.type === "production") {
        const item = inventory.find(i => i.id === tItem);
        if (item) {
          const { updateInventoryProductionStock } = await import("@/lib/commerce");
          await updateInventoryProductionStock(tItem, Math.max(0, (item.productionStock ?? 0) - qty));
        }
      } else {
        await updateStoreItemQuantity(tItem, tFromStore, -qty);
      }

      // Add to destination
      if (toStore?.type === "production") {
        const item = inventory.find(i => i.id === tItem);
        if (item) {
          const { updateInventoryProductionStock } = await import("@/lib/commerce");
          await updateInventoryProductionStock(tItem, (item.productionStock ?? 0) + qty);
        }
      } else {
        await updateStoreItemQuantity(tItem, tToStore, qty);
      }

      // Log transfer
      await createInterStoreTransfer({
        fromStoreId: tFromStore,
        toStoreId: tToStore,
        itemId: tItem,
        quantity: qty,
        reason: tReason as InterStoreTransfer["reason"],
      });

      setTQty(""); setTItem(""); setTSuccess(true);
      setTimeout(() => setTSuccess(false), 3000);
    } catch (err: unknown) {
      setTError(err instanceof Error ? err.message : "Transfer failed.");
    } finally { setTLoading(false); }
  };

  const getStoreName = (id: string) => stores.find(s => s.id === id)?.name ?? id;
  const getItemName  = (id: string) => inventory.find(i => i.id === id)?.name ?? id;

  const handleAddToStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aStore || !aItem || !aQty) { setAError("All fields required."); return; }
    const qty = parseInt(aQty);
    if (isNaN(qty) || qty <= 0) { setAError("Enter a valid quantity."); return; }
    setALoading(true); setAError(""); setASuccess(false);
    try {
      await addItemToStore(aItem, aStore, qty);
      // Also log as a transfer from "external" 
      await createInterStoreTransfer({
        fromStoreId: "external",
        toStoreId: aStore,
        itemId: aItem,
        quantity: qty,
        reason: "supplier_receipt",
      });
      setAQty(""); setASuccess(true);
      setTimeout(() => setASuccess(false), 3000);
    } catch (err: unknown) {
      setAError(err instanceof Error ? err.message : "Failed to add stock.");
    } finally { setALoading(false); }
  };

  const reasonLabels: Record<string, string> = {
    production: "Production",
    supplier_receipt: "Supplier receipt",
    manual_transfer: "Manual transfer",
    sales: "Sales",
  };

  return (
    <SiteShell>
      <div className="page-body fade-in">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="section-label">Multi-store management</p>
            <h1 className="page-title mt-1">Stores</h1>
            <p className="page-subtitle">View stock levels per store and transfer items between stores.</p>
          </div>
          <div className="flex items-center gap-3">
            {stores.length === 0 && (
              <button onClick={initStores} disabled={initing} className="btn btn-secondary">
                {initing ? "Setting up..." : "Initialize default stores"}
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className={`metric-grid metric-grid-${Math.min(stores.length + 1, 4)} mb-6`}>
          <div className="stat-card">
            <p className="label">Total stores</p>
            <p className="text-2xl font-black mt-1" style={{ color: "var(--kw-700)" }}>{stores.length}</p>
          </div>
          {stores.map(store => (
            <div key={store.id} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <span className={storeTypeStyles[store.type] ?? "badge badge-slate"}>{storeTypeLabels[store.type] ?? store.type}</span>
              </div>
              <p className="label">{store.name}</p>
              <p className="text-xl font-black mt-1 text-emerald-600">
                KES {(storeRevenue[store.id] ?? 0).toLocaleString()}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {Object.keys(storeStockMap[store.id] ?? {}).length} SKUs
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs-root mb-6">
          {([["overview","Stock overview"],["add","Add to store"],["transfer","Transfer stock"],["history","Transfer history"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} className={`tab ${tab === k ? "active" : ""}`}>{l}</button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {stores.map(store => (
              <div key={store.id} className="table-wrap">
                <div className="px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--border-subtle)" }}>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={storeTypeStyles[store.type] ?? "badge badge-slate"}>{storeTypeLabels[store.type]}</span>
                    </div>
                    <h2 className="font-bold text-slate-900">{store.name}</h2>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{store.location}</p>
                  </div>
                  <p className="font-black text-emerald-600">KES {(storeRevenue[store.id] ?? 0).toLocaleString()}</p>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.filter(item => {
                      if (store.type === "production") return (item.productionStock ?? 0) > 0 || item.category === "Water" || item.name.toLowerCase().includes("treated");
                      const storeQty = item.stores?.[store.id];
                      return storeQty !== undefined && storeQty >= 0;
                    }).map(item => {
                      const qty = store.type === "production" ? (item.productionStock ?? 0) : (item.stores?.[store.id] ?? 0);
                      const isLow = qty <= item.reorderPoint;
                      return (
                        <tr key={item.id}>
                          <td className="font-semibold">{item.name}</td>
                          <td><span className="badge badge-slate">{item.category}</span></td>
                          <td className={isLow ? "font-black text-rose-600" : "font-bold text-slate-900"}>{qty}</td>
                          <td className="font-semibold" style={{ color: "var(--kw-700)" }}>KES {(item.price * qty).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {inventory.filter(item => store.type === "production" ? true : item.stores?.[store.id] !== undefined).length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <p className="font-medium text-sm">No stock in this store yet</p>
                    <p className="text-xs mt-1">Transfer items or complete a production batch</p>
                  </div>
                )}
              </div>
            ))}
            {stores.length === 0 && (
              <div className="lg:col-span-2">
                <div className="table-wrap">
                  <div className="empty-state">
                    <div className="empty-state-icon">🏪</div>
                    <p className="font-medium">No stores configured</p>
                    <p className="text-xs mt-1 mb-4">Click "Initialize default stores" to create your Main Store and Production store.</p>
                    <button onClick={initStores} disabled={initing} className="btn btn-primary">
                      {initing ? "Setting up..." : "Initialize stores"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ADD TO STORE TAB ── */}
        {tab === "add" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <h2 className="font-black text-slate-900 mb-1">Add stock to store</h2>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Add new inventory items to a specific store — e.g. empty bottles arriving from a supplier into the Main Store, or chemicals going into Production.
              </p>

              <form onSubmit={handleAddToStore} className="space-y-4">
                <div className="field">
                  <label className="label">Target store *</label>
                  <select className="input" value={aStore} onChange={e => setAStore(e.target.value)} required>
                    <option value="">Select store</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({storeTypeLabels[s.type] ?? s.type})</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Item *</label>
                  <select className="input" value={aItem} onChange={e => setAItem(e.target.value)} required>
                    <option value="">Select item from inventory</option>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>{i.name} — SKU: {i.sku} — Current stock: {i.stock}</option>
                    ))}
                  </select>
                  {aItem && aStore && (() => {
                    const item = inventory.find(i => i.id === aItem);
                    const store = stores.find(s => s.id === aStore);
                    if (!item || !store) return null;
                    const currentInStore = store.type === "production"
                      ? (item.productionStock ?? 0)
                      : (item.stores?.[aStore] ?? 0);
                    return (
                      <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--kw-700)" }}>
                        Currently in {store.name}: <strong>{currentInStore}</strong> units
                      </p>
                    );
                  })()}
                </div>

                <div className="field">
                  <label className="label">Quantity to add *</label>
                  <input className="input" type="number" min="1" placeholder="e.g. 200"
                    value={aQty} onChange={e => setAQty(e.target.value)} required />
                </div>

                {/* Preview */}
                {aStore && aItem && aQty && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--bg-card-2)", border: "1px solid var(--border-subtle)" }}>
                    <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Preview</p>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Add <strong>{aQty}</strong> × <strong>{getItemName(aItem)}</strong> to <strong>{getStoreName(aStore)}</strong>
                    </p>
                  </div>
                )}

                {aError && <div className="alert-banner alert-rose text-sm">{aError}</div>}
                {aSuccess && <div className="alert-banner alert-emerald text-sm">✓ Stock added successfully. Transfer logged in history.</div>}

                <button type="submit" disabled={aLoading} className="btn btn-primary w-full">
                  {aLoading ? "Adding..." : "Add stock to store"}
                </button>
              </form>
            </div>

            {/* Info panel */}
            <div className="card p-6 space-y-4">
              <h2 className="font-black text-slate-900">When to use this</h2>
              {[
                {
                  icon: "📦",
                  title: "Empty bottles from supplier",
                  desc: "When a supplier delivers empty 20L, 10L, 5L or 1L bottles — add them to the Main Store so they can be transferred to Production for bottling.",
                  store: "Main Store",
                  color: "badge-blue",
                },
                {
                  icon: "⚗️",
                  title: "Treatment chemicals",
                  desc: "Received chlorine tablets, filters, or other chemicals? Add directly to Production store where they'll be consumed.",
                  store: "Production",
                  color: "badge-green",
                },
                {
                  icon: "💧",
                  title: "Raw water intake",
                  desc: "Log raw or treated water received from a borehole or tanker into the Production store.",
                  store: "Production",
                  color: "badge-green",
                },
                {
                  icon: "🏪",
                  title: "Finished goods (manual)",
                  desc: "If you need to manually add finished bottled water to the Main Store outside of a production batch.",
                  store: "Main Store",
                  color: "badge-blue",
                },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl p-4"
                  style={{ background: "var(--bg-card-2)", border: "1px solid var(--border-subtle)" }}>
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                      <span className={`badge ${item.color}`}>{item.store}</span>
                    </div>
                    <p className="text-xs leading-5" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#f0fdff", border: "1px solid #a5f3fc", color: "#0e7490" }}>
                <p className="font-bold mb-1">💡 Tip</p>
                <p>Every addition is logged in Transfer History as a "Supplier receipt" so you have a full audit trail.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSFER TAB ── */}
        {tab === "transfer" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <h2 className="font-black text-slate-900 mb-1">Transfer stock</h2>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Move items between Main Store and Production. Production batches auto-transfer on completion.
              </p>

              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="field">
                    <label className="label">From store *</label>
                    <select className="input" value={tFromStore} onChange={e => setTFromStore(e.target.value)} required>
                      <option value="">Select store</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">To store *</label>
                    <select className="input" value={tToStore} onChange={e => setTToStore(e.target.value)} required>
                      <option value="">Select store</option>
                      {stores.filter(s => s.id !== tFromStore).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Item *</label>
                  <select className="input" value={tItem} onChange={e => setTItem(e.target.value)} required>
                    <option value="">Select item</option>
                    {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (SKU: {i.sku})</option>)}
                  </select>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="field">
                    <label className="label">Quantity *</label>
                    <input className="input" type="number" min="1" placeholder="e.g. 50" value={tQty}
                      onChange={e => setTQty(e.target.value)} required />
                  </div>
                  <div className="field">
                    <label className="label">Reason</label>
                    <select className="input" value={tReason} onChange={e => setTReason(e.target.value)}>
                      <option value="manual_transfer">Manual transfer</option>
                      <option value="production">Production</option>
                      <option value="supplier_receipt">Supplier receipt</option>
                      <option value="sales">Sales</option>
                    </select>
                  </div>
                </div>

                {/* Preview */}
                {tFromStore && tToStore && tItem && tQty && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--bg-card-2)", border: "1px solid var(--border-subtle)" }}>
                    <p className="font-semibold text-slate-900 mb-1">Transfer preview</p>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Move <strong>{tQty}×</strong> <strong>{getItemName(tItem)}</strong><br />
                      from <strong>{getStoreName(tFromStore)}</strong> → <strong>{getStoreName(tToStore)}</strong>
                    </p>
                  </div>
                )}

                {tError && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{tError}</div>}
                {tSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">✓ Transfer completed successfully.</div>}

                <button type="submit" disabled={tLoading} className="btn btn-primary w-full">
                  {tLoading ? "Transferring..." : "Complete transfer"}
                </button>
              </form>
            </div>

            {/* Quick reference */}
            <div className="card p-6">
              <h2 className="font-black text-slate-900 mb-4">Store roles</h2>
              <div className="space-y-4">
                {[
                  {
                    type: "retail" as const,
                    title: "Main Store",
                    desc: "Holds raw materials and empty bottles. Empties are stored here and transferred to Production when needed for batches.",
                    icon: "🏪",
                    flow: "Empties & Raw materials IN → Production OUT",
                  },
                  {
                    type: "production" as const,
                    title: "Production Store",
                    desc: "Holds finished goods and treated water. Finished goods from completed batches appear here directly.",
                    icon: "🏭",
                    flow: "Finished goods IN",
                  },
                ].map(s => (
                  <div key={s.type} className="rounded-2xl p-4" style={{ background: "var(--bg-card-2)", border: "1px solid var(--border-subtle)" }}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{s.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-900 text-sm">{s.title}</p>
                          <span className={storeTypeStyles[s.type]}>{storeTypeLabels[s.type]}</span>
                        </div>
                        <p className="text-xs leading-5" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
                        <p className="text-xs font-semibold mt-2" style={{ color: "var(--kw-600)" }}>→ {s.flow}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl px-4 py-3 text-xs" style={{ background: "#eff8ff", border: "1px solid #bfe3fd", color: "#1a5ed5" }}>
                <p className="font-bold mb-1">💡 Automatic transfers</p>
                <p>When you complete a production batch (via Inventory → Production tab), all bottled output is automatically transferred from Production to the Main Store. No manual action needed.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div className="table-wrap">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
              <div>
                <p className="section-label">Transfer log</p>
                <h2 className="font-bold text-slate-900 mt-0.5">All inter-store movements</h2>
              </div>
              <span className="badge badge-slate">{transfers.length} records</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Qty</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id}>
                    <td className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(t.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="font-semibold">{getItemName(t.itemId)}</td>
                    <td>
                      <span className={storeTypeStyles[stores.find(s => s.id === t.fromStoreId)?.type ?? "retail"] ?? "badge badge-slate"}>
                        {getStoreName(t.fromStoreId)}
                      </span>
                    </td>
                    <td>
                      <span className={storeTypeStyles[stores.find(s => s.id === t.toStoreId)?.type ?? "retail"] ?? "badge badge-slate"}>
                        {getStoreName(t.toStoreId)}
                      </span>
                    </td>
                    <td className="font-black">{t.quantity}</td>
                    <td><span className="badge badge-slate">{reasonLabels[t.reason] ?? t.reason}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transfers.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">↔️</div>
                <p className="font-medium text-sm">No transfers yet</p>
                <p className="text-xs mt-1">Complete a production batch or use the Transfer tab to move stock.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </SiteShell>
  );
}
