"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteShell from "@/components/site-shell";
import { KwIcon } from "@/components/ui/icons";
import { AlertBanner, MetricCard, MetricGrid, PageHeader, PageLayout, PageTabs } from "@/components/ui/page-layout";
import {
  subscribeToInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  subscribeToProduction, createProductionBatch, updateProductionBatch, completeProductionBatch,
  subscribeToSales, subscribeToShopProducts, createShopProduct, deleteShopProduct, seedShopProductsIfEmpty,
  subscribeToCustomers, subscribeToOrders, subscribeToStores, subscribeToStockTakes, createStockTakeRecord,
  type InventoryItem, type ProductionBatch, type CustomerProfile, type ProducedItem, type RetailSale, type CustomerOrderRecord,
  type Store, type StockTakeRecord,
} from "@/lib/commerce";
import { products as defaultShopProducts } from "@/data/products";
import { getPackSize } from "@/lib/pricing";
import type { Product } from "@/types";

const CATEGORIES = ["Water Bottles", "Empty Bottles", "Refill Tanks", "Accessories", "Chemicals", "Other"];
const SHOP_CATEGORIES = ["Large", "Medium", "Small"];
type Tab = "stock" | "production" | "shop" | "stocktake";

const TAB_CONFIG: { key: Tab; label: string; icon: "package" | "factory" | "shop" | "clipboard" }[] = [
  { key: "stock", label: "Stock", icon: "package" },
  { key: "production", label: "Production", icon: "factory" },
  { key: "shop", label: "Shop catalog", icon: "shop" },
  { key: "stocktake", label: "Daily stock take", icon: "clipboard" },
];

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [tab, setTab] = useState<Tab>("production");

  useEffect(() => {
    setTab("production");
  }, []);
  const [form, setForm] = useState({ name: "", sku: "", category: "Water Bottles", price: "", retailPrice: "", wholesalePrice: "", refillPrice: "", stock: "", reorderPoint: "" });
  // Production form — basic fields
  const [prodForm, setProdForm] = useState({
    batchNumber: "", rawWaterLitres: "", bottledWaterLitres: "",
    wasteLitres: "", startMeter: "", endMeter: "", operator: "", notes: "",
    customerId: "", customerName: "",
  });
  // Dynamic produced items: one entry per Kabson product
  const [producedItems, setProducedItems] = useState<Record<string, { newQty: string; inventoryAddQty: string }>>({});
  const [completingBatch, setCompletingBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prodLoading, setProdLoading] = useState(false);
  const [error, setError] = useState("");
  const [prodError, setProdError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showProdForm, setShowProdForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [deletingInventoryId, setDeletingInventoryId] = useState<string | null>(null);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [showShopForm, setShowShopForm] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState("");
  const [shopForm, setShopForm] = useState({
    name: "", description: "", price: "", category: "Large",
    size: "", unit: "", stock: "", featured: false,
  });
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([]);
  const [sales, setSales] = useState<RetailSale[]>([]);
  const [editItemModal, setEditItemModal] = useState({ open: false, item: null as InventoryItem | null });
  const [editBatchModal, setEditBatchModal] = useState({ open: false, batch: null as ProductionBatch | null });
  const [editBatchForm, setEditBatchForm] = useState({
    batchNumber: "",
    operator: "",
    notes: "",
    rawWaterLitres: "",
    startMeter: "",
    endMeter: "",
    wasteLitres: "",
    producedItems: [] as ProducedItem[],
  });
  const [editBatchLoading, setEditBatchLoading] = useState(false);
  const [editBatchError, setEditBatchError] = useState("");
  const [editItemForm, setEditItemForm] = useState({
    stock: "", productionStock: "", price: "", retailPrice: "",
    wholesalePrice: "", refillPrice: "", reorderPoint: "",
  });
  const [editItemLoading, setEditItemLoading] = useState(false);
  const [editItemError, setEditItemError] = useState("");

  const [stores, setStores] = useState<Store[]>([]);
  const [stockTakes, setStockTakes] = useState<StockTakeRecord[]>([]);
  const [initialStoreId, setInitialStoreId] = useState("");

  // Stock take form
  const [stockTakeOperator, setStockTakeOperator] = useState("");
  const [stockTakeNotes, setStockTakeNotes] = useState("");
  const [stockTakeCounted, setStockTakeCounted] = useState<Record<string, string>>({});
  const [selectedStockTake, setSelectedStockTake] = useState<StockTakeRecord | null>(null);
  const [stockTakeLoading, setStockTakeLoading] = useState(false);
  const [stockTakeError, setStockTakeError] = useState("");
  const [stockTakeSuccess, setStockTakeSuccess] = useState(false);

  // Multi-customer allocations state for log batch form
  const [formAllocations, setFormAllocations] = useState<{ customerId: string; customerName: string; quantities: Record<string, string> }[]>([]);
  const [newAllocationCustId, setNewAllocationCustId] = useState("");

  useEffect(() => {
    const u1 = subscribeToInventory(setInventory);
    const u2 = subscribeToProduction(setBatches);
    const u3 = subscribeToShopProducts(setShopProducts);
    const u4 = subscribeToCustomers(setCustomers);
    const u5 = subscribeToSales(setSales);
    const u6 = subscribeToOrders(setOrders);
    const u7 = subscribeToStores(setStores);
    const u8 = subscribeToStockTakes(setStockTakes);
    seedShopProductsIfEmpty(
      defaultShopProducts.map(({ id: _id, ...product }) => product)
    ).catch(() => {});
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); };
  }, []);

  useEffect(() => {
    if (prodForm.customerId) {
      const customer = customers.find(c => c.id === prodForm.customerId);
      if (customer) {
        const pendingOrder = orders.find(o => 
          ((o.customer && o.customer.trim().toLowerCase() === customer.name.trim().toLowerCase()) || o.customerId === customer.id) && 
          (o.status === "Pending approval" || o.status === "Processing" || o.status === "Scheduled")
        );
        if (pendingOrder) {
          setProdForm(prev => ({ 
            ...prev, 
            notes: `Order ${pendingOrder.id}: ${pendingOrder.volume}`
          }));
        }
      }
    }
  }, [prodForm.customerId, customers, orders]);

  const handleOpenProdForm = () => {
    setProdError("");
    let nextBatchNumber = "B-0001";
    let lastEndMeter = "";
    if (batches.length > 0) {
      const lastBatch = batches[0].batchNumber;
      const match = lastBatch.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        nextBatchNumber = lastBatch.substring(0, match.index) + num.toString().padStart(match[1].length, '0');
      } else {
        nextBatchNumber = `${lastBatch}-1`;
      }

      // Auto-populate startMeter with the last batch's endMeter
      const lastBatchObj = batches[0];
      if (lastBatchObj.endMeter !== undefined && lastBatchObj.endMeter !== null) {
        lastEndMeter = lastBatchObj.endMeter.toString();
      }
    }
    setFormAllocations([]);
    setProdForm(prev => ({ ...prev, batchNumber: nextBatchNumber, startMeter: lastEndMeter }));
    setShowProdForm(true);
  };

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.stock <= item.reorderPoint),
    [inventory]
  );

  const totalValue = useMemo(
    () => inventory.reduce((sum, item) => sum + item.price * item.stock, 0),
    [inventory]
  );

  const filteredInventory = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [inventory, searchTerm]
  );

  const refillSalesData = useMemo(() => {
    const refillLines = sales.flatMap((sale) => sale.items.filter((line) => line.saleKind === "refill"));
    const quantity = refillLines.reduce((sum, line) => sum + line.quantity, 0);
    const litres = refillLines.reduce((sum, line) => {
      const item = inventory.find((i) => i.id === line.itemId);
      const name = item?.name ?? line.itemName ?? "";
      const match = name.match(/(\d+(?:\.\d+)?)(ml|l)\b/i);
      if (!match) return sum;
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      const volume = unit === "ml" ? value / 1000 : value;
      return sum + volume * line.quantity;
    }, 0);
    return { quantity, litres };
  }, [sales, inventory]);

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Product name is required."); return; }
    setLoading(true); setError("");
    try {
      const initialStock = parseInt(form.stock) || 0;
      await createInventoryItem({
        name: form.name.trim(),
        sku: form.sku.trim() || `SKU-${Date.now()}`,
        category: form.category,
        price: parseFloat(form.price) || 0,
        retailPrice: parseFloat(form.retailPrice) || undefined,
        wholesalePrice: parseFloat(form.wholesalePrice) || undefined,
        refillPrice: parseFloat(form.refillPrice) || undefined,
        stock: initialStock,
        productionStock: 0,
        stores: initialStoreId ? { [initialStoreId]: initialStock } : undefined,
        reorderPoint: parseInt(form.reorderPoint) || 10,
      });
      setForm({ name: "", sku: "", category: "Water Bottles", price: "", retailPrice: "", wholesalePrice: "", refillPrice: "", stock: "", reorderPoint: "" });
      setInitialStoreId("");
      setShowForm(false);
    } catch { setError("Failed to add item. Please try again."); }
    finally { setLoading(false); }
  };

  // Kabson products for dynamic production form
  const kabsonProducts = useMemo(
    () => inventory.filter(i => i.name.toLowerCase().includes("kabson")),
    [inventory]
  );

  const isCustomerOrder = formAllocations.length > 0 || !!prodForm.customerId;

  const getNewBottleQty = (item: InventoryItem, rawNewQty: string) => {
    const entered = parseInt(rawNewQty || "0") || 0;
    if (!isCustomerOrder) return entered;
    return entered * getPackSize(item.name);
  };

  const getPackCount = (item: InventoryItem | undefined, qty: number) => {
    if (!item) return qty;
    const packSize = getPackSize(item.name);
    return packSize > 1 ? Math.round((qty || 0) / packSize) : qty || 0;
  };

  const normalizeEditProducedItems = (batch: ProductionBatch) =>
    (batch.producedItems ?? []).map(pi => {
      const item = inventory.find(i => i.id === pi.itemId);
      const packSize = getPackSize(item?.name ?? "");
      const customerPackQty = batch.customerId ? (pi.newPackQty ?? getPackCount(item, pi.newQty ?? 0)) : undefined;
      return {
        ...pi,
        newPackQty: customerPackQty,
        newQty: batch.customerId ? (customerPackQty || 0) * packSize : (pi.newQty ?? 0),
        inventoryAddQty: batch.customerId ? (pi.inventoryAddQty ?? 0) : (pi.inventoryAddQty ?? 0),
      };
    });

  // Pre-calculate refills per Kabson product to show in table
  const refillsPerProduct = useMemo(() => {
    const lastBatchCreatedAt = batches[0]?.createdAt || null;
    const refills: Record<string, number> = {};
    for (const item of kabsonProducts) {
      const refillQty = sales.reduce((s, sale) => {
        try {
          if (lastBatchCreatedAt && new Date(sale.createdAt) <= new Date(lastBatchCreatedAt)) return s;
        } catch (e) {}
        const match = (sale.items || []).filter(si => si.saleKind === "refill" && si.itemId === item.id);
        return s + match.reduce((a, b) => a + (b.quantity || 0), 0);
      }, 0);
      refills[item.id] = refillQty;
    }
    return refills;
  }, [kabsonProducts, batches, sales]);

  const submitProdForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prodForm.batchNumber.trim()) { setProdError("Batch number is required."); return; }
    setProdLoading(true); setProdError("");
    try {
      const startMeter = parseFloat(prodForm.startMeter) || 0;
      const endMeter = parseFloat(prodForm.endMeter) || 0;
      const bottledWaterLitres = (endMeter - startMeter) || 0;

      // Build dynamic producedItems from the per-product inputs
      // Auto-calc refill quantities from POS refill sales since the last logged batch
      const lastBatchCreatedAt = batches[0]?.createdAt || null;
      const dynamicItems: ProducedItem[] = kabsonProducts
        .map(item => {
          let newQty = 0;
          let newPackQty = 0;
          
          if (formAllocations.length > 0) {
            formAllocations.forEach(alloc => {
              const rawVal = alloc.quantities[item.id] || "0";
              const val = parseInt(rawVal) || 0;
              newPackQty += val;
              newQty += getNewBottleQty(item, rawVal);
            });
          } else {
            const rawNewQty = producedItems[item.id]?.newQty || "0";
            newQty = getNewBottleQty(item, rawNewQty);
            newPackQty = isCustomerOrder ? (parseInt(rawNewQty || "0") || 0) : 0;
          }

          const rawInventoryAddQty = producedItems[item.id]?.inventoryAddQty || "0";
          const isCustomerBatch = formAllocations.length > 0 || !!prodForm.customerId;
          const inventoryAddQty = isCustomerBatch
            ? getNewBottleQty(item, rawInventoryAddQty)
            : (parseInt(rawInventoryAddQty || "0") || 0);

          // Sum refill sales for this item since the last batch (or all-time if none)
          const refillQty = sales.reduce((s, sale) => {
            try {
              if (lastBatchCreatedAt && new Date(sale.createdAt) <= new Date(lastBatchCreatedAt)) return s;
            } catch (e) {
              // ignore invalid dates
            }
            const match = (sale.items || []).filter(si => si.saleKind === "refill" && si.itemId === item.id);
            return s + match.reduce((a, b) => a + (b.quantity || 0), 0);
          }, 0);

          return {
            itemId: item.id,
            name: item.name,
            newQty,
            refillQty,
            inventoryAddQty,
            ...(newPackQty > 0 ? { newPackQty } : {}),
          };
        })
        .filter(pi => (pi.newQty || 0) > 0 || (pi.refillQty || 0) > 0 || (pi.inventoryAddQty || 0) > 0);

      // Build customerAllocations array
      const customerAllocations = formAllocations.map(alloc => {
        const allocItems = kabsonProducts
          .map(item => {
            const rawQty = alloc.quantities[item.id] || "0";
            const newPackQty = parseInt(rawQty) || 0;
            const newQty = getNewBottleQty(item, rawQty);
            return {
              itemId: item.id,
              name: item.name,
              newQty,
              newPackQty: newPackQty > 0 ? newPackQty : undefined,
            };
          })
          .filter(pi => pi.newQty > 0);
          
        return {
          customerId: alloc.customerId,
          customerName: alloc.customerName,
          producedItems: allocItems,
        };
      }).filter(alloc => alloc.producedItems.length > 0);

      // Estimate total bottled litres for variance calculation
      const totalBottledLitres = dynamicItems.reduce((sum, pi) => {
        const item = kabsonProducts.find(i => i.id === pi.itemId);
        if (!item) return sum;
        const litreMatch = item.name.match(/(\d+(?:\.\d+)?)(ml|l)\b/i);
        if (!litreMatch) return sum;
        const val = parseFloat(litreMatch[1]);
        const unit = litreMatch[2].toLowerCase();
        const litres = unit === "ml" ? val / 1000 : val;
        return sum + litres * ((pi.newQty || 0) + (pi.refillQty || 0));
      }, 0);

      const expectedEndMeter = startMeter + totalBottledLitres;
      const actualUsed = endMeter - startMeter;
      const variance = actualUsed > 0 ? totalBottledLitres - actualUsed : 0;

      const selectedCustomer = customers.find(c => c.id === prodForm.customerId);

      await createProductionBatch({
        batchNumber: prodForm.batchNumber.trim(),
        rawWaterLitres: parseFloat(prodForm.rawWaterLitres) || 0,
        bottledWaterLitres,
        producedItems: dynamicItems,
        customerAllocations: customerAllocations.length > 0 ? customerAllocations : undefined,
        wasteLitres: parseFloat(prodForm.wasteLitres) || 0,
        startMeter, endMeter, expectedEndMeter, variance,
        status: "In progress",
        operator: prodForm.operator.trim() || "—",
        notes: prodForm.notes.trim(),
        ...(formAllocations.length === 0 && selectedCustomer
          ? { customerId: selectedCustomer.id, customerName: selectedCustomer.name, addToInventory: true }
          : { addToInventory: true }),
        startedAt: new Date().toISOString(),
      });
      setProdForm({ batchNumber: "", rawWaterLitres: "", bottledWaterLitres: "", wasteLitres: "", startMeter: "", endMeter: "", operator: "", notes: "", customerId: "", customerName: "" });
      setProducedItems({});
      setFormAllocations([]);
      setNewAllocationCustId("");
      setShowProdForm(false);
    } catch (err: unknown) {
      setProdError(err instanceof Error ? err.message : "Failed to log batch.");
    } finally { setProdLoading(false); }
  };

  const saveEditBatch = async () => {
    if (!editBatchModal.batch) return;
    setEditBatchLoading(true);
    setEditBatchError("");
    try {
      const startMeter = Number(editBatchForm.startMeter ?? editBatchModal.batch.startMeter ?? 0) || 0;
      const endMeter = Number(editBatchForm.endMeter ?? editBatchModal.batch.endMeter ?? 0) || 0;
      const actualUsed = endMeter - startMeter;
      const bottledWaterLitres = editBatchForm.producedItems.reduce((sum, pi) => {
        const item = inventory.find(i => i.id === pi.itemId);
        const litreMatch = item?.name.match(/(\d+(?:\.\d+)?)(ml|l)\b/i);
        if (!litreMatch) return sum;
        const value = parseFloat(litreMatch[1]);
        const unit = litreMatch[2].toLowerCase();
        const litresEach = unit === "ml" ? value / 1000 : value;
        return sum + litresEach * ((pi.newQty || 0) + (pi.refillQty || 0) + (pi.inventoryAddQty || 0));
      }, 0);

      await updateProductionBatch(editBatchModal.batch.id, {
        batchNumber: editBatchForm.batchNumber.trim() || editBatchModal.batch.batchNumber,
        rawWaterLitres: Number(editBatchForm.rawWaterLitres) || editBatchModal.batch.rawWaterLitres || 0,
        bottledWaterLitres,
        wasteLitres: Number(editBatchForm.wasteLitres) || editBatchModal.batch.wasteLitres || 0,
        startMeter,
        endMeter,
        expectedEndMeter: startMeter + bottledWaterLitres,
        variance: actualUsed > 0 ? bottledWaterLitres - actualUsed : 0,
        operator: editBatchForm.operator.trim() || editBatchModal.batch.operator || "—",
        notes: editBatchForm.notes.trim() || editBatchModal.batch.notes || "",
        producedItems: editBatchForm.producedItems,
      });
      setEditBatchModal({ open: false, batch: null });
    } catch (err) {
      setEditBatchError(err instanceof Error ? err.message : "Failed to update batch.");
    } finally {
      setEditBatchLoading(false);
    }
  };

  const saveEditItem = async () => {
    if (!editItemModal.item) return;
    setEditItemLoading(true);
    setEditItemError("");
    try {
      const item = editItemModal.item;
      const updates: Partial<Pick<InventoryItem, "stock" | "productionStock" | "price" | "retailPrice" | "wholesalePrice" | "refillPrice" | "reorderPoint">> = {};
      const parseIntValue = (value: string) => parseInt(value, 10) || 0;
      const parseFloatValue = (value: string) => parseFloat(value) || 0;

      if (editItemForm.stock !== item.stock.toString()) updates.stock = parseIntValue(editItemForm.stock);
      if (editItemForm.productionStock !== (item.productionStock || 0).toString()) updates.productionStock = parseIntValue(editItemForm.productionStock);
      if (editItemForm.price !== item.price.toString()) updates.price = parseFloatValue(editItemForm.price);
      if (editItemForm.retailPrice !== (item.retailPrice?.toString() ?? "")) {
        updates.retailPrice = editItemForm.retailPrice ? parseFloatValue(editItemForm.retailPrice) : undefined;
      }
      if (editItemForm.wholesalePrice !== (item.wholesalePrice?.toString() ?? "")) {
        updates.wholesalePrice = editItemForm.wholesalePrice ? parseFloatValue(editItemForm.wholesalePrice) : undefined;
      }
      if (editItemForm.refillPrice !== (item.refillPrice?.toString() ?? "")) {
        updates.refillPrice = editItemForm.refillPrice ? parseFloatValue(editItemForm.refillPrice) : undefined;
      }
      if (editItemForm.reorderPoint !== item.reorderPoint.toString()) updates.reorderPoint = parseIntValue(editItemForm.reorderPoint);

      if (Object.keys(updates).length > 0) {
        await updateInventoryItem(item.id, updates);
      }
      setEditItemModal({ open: false, item: null });
    } catch (err) {
      setEditItemError("Failed to save changes. Please try again.");
    } finally {
      setEditItemLoading(false);
    }
  };

  const handleDeleteInventory = async (item: InventoryItem) => {
    if (!window.confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) return;
    setDeletingInventoryId(item.id);
    try {
      await deleteInventoryItem(item.id);
    } catch {
      window.alert("Failed to delete inventory item.");
    } finally {
      setDeletingInventoryId(null);
    }
  };

  const handleDeleteShopProduct = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}" from the shop catalog? This cannot be undone.`)) return;
    setDeletingShopId(product.id);
    try {
      await deleteShopProduct(product.id);
    } catch {
      window.alert("Failed to delete shop product.");
    } finally {
      setDeletingShopId(null);
    }
  };

  const submitShopForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shopForm.name.trim()) { setShopError("Product name is required."); return; }
    setShopLoading(true);
    setShopError("");
    try {
      await createShopProduct({
        name: shopForm.name.trim(),
        description: shopForm.description.trim() || shopForm.name.trim(),
        price: parseFloat(shopForm.price) || 0,
        category: shopForm.category,
        size: shopForm.size.trim() || "N/A",
        unit: shopForm.unit.trim() || "unit",
        stock: parseInt(shopForm.stock) || 0,
        featured: shopForm.featured,
        isActive: true,
      });
      setShopForm({ name: "", description: "", price: "", category: "Large", size: "", unit: "", stock: "", featured: false });
      setShowShopForm(false);
    } catch {
      setShopError("Failed to add shop product.");
    } finally {
      setShopLoading(false);
    }
  };

  const prodMetrics = useMemo(() => {
    const completed = batches.filter((b) => b.status === "Completed");
    const totalRaw = batches.reduce((s, b) => s + b.rawWaterLitres, 0);
    const totalMeteredBottled = batches.reduce((s, b) => s + (b.bottledWaterLitres || b.treatedWaterLitres || 0), 0);
    const totalWaste = batches.reduce((s, b) => s + b.wasteLitres, 0);
    const totalUnits = batches.reduce((s, b) => {
      if (b.producedItems) return s + b.producedItems.reduce((ss, pi) => ss + pi.newQty + pi.refillQty, 0);
      return s + (b.bottled20L ?? 0) + (b.bottled10L ?? 0) + (b.bottled5L ?? 0) + (b.bottled1L ?? 0) + (b.bottled500ml ?? 0);
    }, 0);
    const efficiency = totalRaw > 0 ? Math.round(((totalRaw - totalWaste) / totalRaw) * 100) : 0;
    return { completed: completed.length, totalBatches: batches.length, totalRaw, totalMeteredBottled, totalUnits, totalWaste, efficiency };
  }, [batches]);

  const statusBadge: Record<string, string> = {
    "In progress": "bg-blue-50 text-blue-700 border-blue-200",
    "Completed": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Quality check": "bg-amber-50 text-amber-700 border-amber-200",
    "Rejected": "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <SiteShell>
      <PageLayout wide>
        <PageHeader
          eyebrow="Stock control"
          title="Inventory & Production"
          subtitle="Track stock levels, production batches, and water output."
          actions={
            <>
              <Link href="/retail" className="btn btn-secondary btn-sm">POS</Link>
              {tab === "stock" && (
                <button type="button" onClick={() => { setShowForm((v) => !v); setError(""); }} className="btn btn-primary btn-sm">
                  <KwIcon name="plus" size={16} /> Add item
                </button>
              )}
              {tab === "production" && (
                <button type="button" onClick={showProdForm ? () => setShowProdForm(false) : handleOpenProdForm} className="btn btn-primary btn-sm">
                  <KwIcon name="plus" size={16} /> Log batch
                </button>
              )}
              {tab === "shop" && (
                <button type="button" onClick={() => { setShowShopForm((v) => !v); setShopError(""); }} className="btn btn-primary btn-sm">
                  <KwIcon name="plus" size={16} /> Add product
                </button>
              )}
            </>
          }
        />

        <PageTabs tabs={TAB_CONFIG} active={tab} onChange={setTab} />

        {/* STOCK TAB */}
        {tab === "stock" && (<>
        <MetricGrid cols={3}>
          <MetricCard label="Total SKUs" value={inventory.length.toString()} tone="sky" icon="package" />
          <MetricCard
            label="Low stock alerts"
            value={lowStockItems.length.toString()}
            tone={lowStockItems.length > 0 ? "amber" : "emerald"}
            icon="alert"
          />
          <MetricCard label="Inventory value" value={`KES ${totalValue.toLocaleString()}`} tone="emerald" icon="coins" />
        </MetricGrid>

        {lowStockItems.length > 0 && (
          <AlertBanner tone="amber">
            <KwIcon name="alert" size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-2">Low stock — reorder needed</p>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map((item) => (
                  <span key={item.id} className="badge badge-amber">
                    {item.name}: {item.stock} / {item.reorderPoint}
                  </span>
                ))}
              </div>
            </div>
          </AlertBanner>
        )}

        {/* Add item form */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">New inventory item</h2>
            <form onSubmit={submitForm} className="grid gap-6">
              {/* Basic info */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <p className="col-span-full text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Item details</p>
                {[
                  { label: "Product name *", key: "name", placeholder: "e.g. Kabson Water 20L", type: "text" },
                  { label: "SKU", key: "sku", placeholder: "e.g. WB-20L-001", type: "text" },
                  { label: "Current stock", key: "stock", placeholder: "e.g. 150", type: "number" },
                  { label: "Reorder point", key: "reorderPoint", placeholder: "e.g. 20", type: "number" },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                      required={key === "name"}
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Assign initial stock to store</label>
                  <select
                    value={initialStoreId}
                    onChange={(e) => setInitialStoreId(e.target.value)}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                  >
                    <option value="">— Select store (defaults to Main POS) —</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Pricing */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">Pricing (KES)</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Default / POS price", key: "price", placeholder: "e.g. 350", color: "focus:ring-sky-500 border-slate-200 bg-slate-50" },
                    { label: "Retail price", key: "retailPrice", placeholder: "e.g. 350", color: "focus:ring-sky-500 border-sky-200 bg-sky-50" },
                    { label: "Wholesale price", key: "wholesalePrice", placeholder: "e.g. 280", color: "focus:ring-blue-500 border-blue-200 bg-blue-50" },
                    { label: "Refill price", key: "refillPrice", placeholder: "e.g. 150", color: "focus:ring-purple-500 border-purple-200 bg-purple-50" },
                  ].map(({ label, key, placeholder, color }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">KES</span>
                        <input
                          type="number" min="0" step="0.01"
                          placeholder={placeholder}
                          value={form[key as keyof typeof form]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className={`w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:border-transparent outline-none transition ${color}`}
                          required={key === "price"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</label>
                <div className="relative flex items-center">
                  <select
                    value={CATEGORIES.includes(form.category) ? form.category : "Custom"}
                    onChange={(e) => {
                      if (e.target.value === "Custom") setForm((f) => ({ ...f, category: "" }));
                      else setForm((f) => ({ ...f, category: e.target.value }));
                    }}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="Custom">Add New...</option>
                  </select>
                  {!CATEGORIES.includes(form.category) && (
                    <input
                      type="text"
                      placeholder="Enter new category"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="ml-2 flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                      autoFocus
                      required
                    />
                  )}
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition"
                >
                  {loading ? "Saving..." : "Save item"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Inventory table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
              />
            </div>
            <span className="text-sm text-slate-500 shrink-0">{filteredInventory.length} items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left">
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Product</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">SKU</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Category</th>
                  <th className="px-6 py-3 font-semibold text-sky-600 text-xs uppercase tracking-wide">Retail</th>
                  <th className="px-6 py-3 font-semibold text-blue-600 text-xs uppercase tracking-wide">Wholesale</th>
                  <th className="px-6 py-3 font-semibold text-purple-600 text-xs uppercase tracking-wide">Refill</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Main Stock</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Prod. Floor</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Value</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const isLow = item.stock <= item.reorderPoint;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="px-6 py-4 text-slate-600">{item.category}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 text-sm">KES {(item.retailPrice ?? item.price).toLocaleString()}</span>
                      </td>
                      {/* Wholesale price */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-blue-700 text-sm">
                          {item.wholesalePrice ? `KES ${item.wholesalePrice.toLocaleString()}` : <span className="text-slate-300 text-xs">—</span>}
                        </span>
                      </td>
                      {/* Refill price */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-purple-700 text-sm">
                          {item.refillPrice ? `KES ${item.refillPrice.toLocaleString()}` : <span className="text-slate-300 text-xs">—</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-base font-black ${isLow ? "text-rose-600" : "text-slate-900"}`}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-700">
                        {item.productionStock || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isLow ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {isLow ? "Low stock" : "In stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        KES {(item.stock * item.price).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setEditItemModal({ open: true, item });
                            setEditItemForm({
                              stock: item.stock.toString(),
                              productionStock: (item.productionStock || 0).toString(),
                              price: item.price.toString(),
                              retailPrice: item.retailPrice?.toString() ?? "",
                              wholesalePrice: item.wholesalePrice?.toString() ?? "",
                              refillPrice: item.refillPrice?.toString() ?? "",
                              reorderPoint: item.reorderPoint.toString(),
                            });
                            setEditItemError("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredInventory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="font-medium">{searchTerm ? "No items match your search" : "No inventory items yet"}</p>
              {!searchTerm && (
                <button onClick={() => setShowForm(true)} className="mt-3 text-sky-600 hover:text-sky-700 font-semibold text-sm">
                  Add your first item &rarr;
                </button>
              )}
            </div>
          )}

          {editItemModal.open && editItemModal.item && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
              <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Edit inventory item</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">{editItemModal.item.name}</h3>
                    <p className="text-sm text-slate-500">SKU: {editItemModal.item.sku}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditItemModal({ open: false, item: null })}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
                <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                  {[
                    { label: "Main stock", key: "stock", type: "number" },
                    { label: "Production stock", key: "productionStock", type: "number" },
                    { label: "Price (KES)", key: "price", type: "number" },
                    { label: "Retail price (KES)", key: "retailPrice", type: "number" },
                    { label: "Wholesale price (KES)", key: "wholesalePrice", type: "number" },
                    { label: "Refill price (KES)", key: "refillPrice", type: "number" },
                    { label: "Reorder point", key: "reorderPoint", type: "number" },
                  ].map(({ label, key, type }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</label>
                      <input
                        type={type}
                        value={editItemForm[key as keyof typeof editItemForm]}
                        onChange={(e) => setEditItemForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={saveEditItem}
                      disabled={editItemLoading}
                      className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 transition"
                    >
                      {editItemLoading ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditItemModal({ open: false, item: null })}
                      className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                  {editItemError && <p className="text-sm text-rose-600">{editItemError}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
        </>)}

        {/* SHOP CATALOG TAB */}
        {tab === "shop" && (<>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Shop products", value: shopProducts.length.toString(), color: "text-blue-600" },
              { label: "Featured", value: shopProducts.filter((p) => p.featured).length.toString(), color: "text-amber-600" },
              { label: "Out of stock", value: shopProducts.filter((p) => p.stock === 0).length.toString(), color: "text-rose-600" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
                <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {showShopForm && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">New shop product</h2>
              <form onSubmit={submitShopForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Product name *", key: "name", placeholder: "e.g. Kabson 20L Jerry Can", type: "text" },
                  { label: "Description", key: "description", placeholder: "Short description", type: "text" },
                  { label: "Price (KES)", key: "price", placeholder: "e.g. 250", type: "number" },
                  { label: "Size", key: "size", placeholder: "e.g. 20L", type: "text" },
                  { label: "Unit", key: "unit", placeholder: "e.g. can", type: "text" },
                  { label: "Stock", key: "stock", placeholder: "e.g. 45", type: "number" },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={shopForm[key as keyof typeof shopForm] as string}
                      onChange={(e) => setShopForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                      required={key === "name"}
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</label>
                  <select
                    value={shopForm.category}
                    onChange={(e) => setShopForm((f) => ({ ...f, category: e.target.value }))}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition"
                  >
                    {SHOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shopForm.featured}
                      onChange={(e) => setShopForm((f) => ({ ...f, featured: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Featured product
                  </label>
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                  <button type="submit" disabled={shopLoading} className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-semibold px-6 py-2.5 text-sm transition">
                    {shopLoading ? "Saving..." : "Save product"}
                  </button>
                  <button type="button" onClick={() => setShowShopForm(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  {shopError && <p className="text-sm text-rose-600">{shopError}</p>}
                </div>
              </form>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Online shop catalog</h2>
              <p className="text-xs text-slate-400 mt-0.5">Products shown on the public shop at /shop</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left">
                    {["Product", "Category", "Size", "Price", "Stock", "Featured", "Actions"].map((h) => (
                      <th key={h} className="px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shopProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{product.description}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{product.category}</td>
                      <td className="px-6 py-4 text-slate-600">{product.size}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">KES {product.price.toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{product.stock}</td>
                      <td className="px-6 py-4">{product.featured ? "Yes" : "No"}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteShopProduct(product)}
                          disabled={deletingShopId === product.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition"
                        >
                          <KwIcon name="trash" size={14} />
                          {deletingShopId === product.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shopProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <ShoppingBag className="h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium">No shop products yet</p>
                <button onClick={() => setShowShopForm(true)} className="mt-3 text-sky-600 hover:text-sky-700 font-semibold text-sm">
                  Add your first product &rarr;
                </button>
              </div>
            )}
          </div>
        </>)}

        {/* PRODUCTION TAB */}
        {tab === "production" && (<>
          {/* Production metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Total batches", value: prodMetrics.totalBatches.toString(), color: "text-blue-600" },
              { label: "Raw water (L)", value: prodMetrics.totalRaw.toLocaleString(), color: "text-sky-600" },
              { label: "Refill sales", value: `${refillSalesData.quantity.toLocaleString()} refills`, color: "text-violet-600" },
              { label: "Units produced", value: prodMetrics.totalUnits.toLocaleString(), color: "text-emerald-600" },
              { label: "Production efficiency", value: `${prodMetrics.efficiency}%`, color: prodMetrics.efficiency >= 90 ? "text-emerald-600" : prodMetrics.efficiency >= 75 ? "text-amber-600" : "text-rose-600" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{m.label}</p>
                <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Production pipeline visual */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-4">Production pipeline</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[
                { label: "Raw water intake", value: `${prodMetrics.totalRaw.toLocaleString()} L`, icon: "droplet" as const, color: "bg-blue-100 border-blue-300 text-blue-800" },
                { label: "Refill sales", value: `${refillSalesData.quantity.toLocaleString()} refills`, icon: "droplet" as const, color: "bg-violet-100 border-violet-300 text-violet-800" },
                { label: "Metered Bottled", value: `${prodMetrics.totalMeteredBottled.toLocaleString()} L`, icon: "flask" as const, color: "bg-cyan-100 border-cyan-300 text-cyan-800" },
                { label: "Bottled Units", value: `${prodMetrics.totalUnits.toLocaleString()} units`, icon: "package" as const, color: "bg-sky-100 border-sky-300 text-sky-800" },
                { label: "Waste", value: `${prodMetrics.totalWaste.toLocaleString()} L`, icon: "recycle" as const, color: "bg-slate-100 border-slate-300 text-slate-600" },
              ].flatMap((step, i) => [
                ...(i > 0 ? [<KwIcon key={`arrow-${step.label}`} name="arrow-right" size={20} className="text-blue-300 shrink-0" />] : []),
                <div key={step.label} className={`rounded-2xl border px-4 py-3 text-center min-w-[120px] shrink-0 ${step.color}`}>
                  <KwIcon name={step.icon} size={28} className="mx-auto mb-1" />
                  <p className="text-xs font-bold">{step.label}</p>
                  <p className="text-sm font-black mt-1">{step.value}</p>
                </div>,
              ])}
            </div>
          </div>

          {showProdForm && <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Log production batch</h2>
              <p className="text-sm text-slate-500 mb-5">Enter metre readings and bottled output. Customer is optional — leave blank for standard production to inventory.</p>
              <form onSubmit={submitProdForm} className="grid gap-6">

                {/* ── Batch info ── */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-3">Batch info</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {([
                      { label: "Batch number *", key: "batchNumber", placeholder: "e.g. BATCH-2026-001", type: "text" },
                      { label: "Operator", key: "operator", placeholder: "Staff name", type: "text" },
                      { label: "Notes", key: "notes", placeholder: "Optional notes", type: "text" },
                    ] as { label: string; key: keyof typeof prodForm; placeholder: string; type: string }[]).map(({ label, key, placeholder, type }) => (
                      <div key={key as string} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                        <input type={type} placeholder={placeholder} value={prodForm[key]}
                          onChange={(e) => setProdForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition disabled:opacity-70 disabled:cursor-not-allowed"
                          required={key === "batchNumber"} readOnly={key === "batchNumber"} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Customer Allocations (Multiple Customers) ── */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">Customer Allocations</p>
                  <p className="text-xs text-indigo-500 mb-4">
                    Allocate bottling output directly to one or more customer orders. Each customer allocation will auto-generate a separate credit sale and delivery order.
                  </p>
                  
                  {/* Add customer dropdown and button */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <select
                      value={newAllocationCustId}
                      onChange={e => setNewAllocationCustId(e.target.value)}
                      className="px-3 py-2 border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white transition max-w-sm"
                    >
                      <option value="">— Select Customer to Allocate —</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ""}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newAllocationCustId) return;
                        const exists = formAllocations.some(a => a.customerId === newAllocationCustId);
                        if (exists) {
                          alert("Customer already added to this batch.");
                          return;
                        }
                        const cust = customers.find(c => c.id === newAllocationCustId);
                        if (cust) {
                          setFormAllocations(prev => [
                            ...prev,
                            { customerId: cust.id, customerName: cust.name, quantities: {} }
                          ]);
                          setNewAllocationCustId("");
                        }
                      }}
                      className="btn btn-sm"
                      style={{ background: "var(--kw-700)", color: "#fff" }}
                    >
                      + Add Customer Allocation
                    </button>
                  </div>

                  {/* Allocations list */}
                  {formAllocations.length > 0 ? (
                    <div className="space-y-4">
                      {formAllocations.map((alloc, allocIdx) => (
                        <div key={alloc.customerId} className="rounded-xl border border-indigo-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-4 border-b border-indigo-100 pb-2 mb-3">
                            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              👤 {alloc.customerName}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormAllocations(prev => prev.filter((_, idx) => idx !== allocIdx));
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                            >
                              ✕ Remove
                            </button>
                          </div>
                          
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {kabsonProducts.map(item => {
                              const qty = alloc.quantities[item.id] || "";
                              const packSize = getPackSize(item.name);
                              const bottlesCount = (parseInt(qty) || 0) * packSize;
                              return (
                                <div key={item.id} className="flex flex-col gap-1">
                                  <label className="text-xs font-semibold text-slate-600">
                                    {item.name.replace(/kabson water?\s*/i, "")} ({packSize > 1 ? "packs" : "units"})
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={qty}
                                      onChange={e => {
                                        const newQty = e.target.value;
                                        setFormAllocations(prev => prev.map((a, idx) => idx === allocIdx ? {
                                          ...a,
                                          quantities: { ...a.quantities, [item.id]: newQty }
                                        } : a));
                                      }}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none transition"
                                    />
                                    {bottlesCount > 0 && packSize > 1 && (
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-700">
                                        = {bottlesCount} L
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-indigo-200 rounded-xl bg-white/50">
                      No customer allocations added. Stock will go entirely to standard inventory.
                    </div>
                  )}

                  {/* Fallback to single legacy customer dropdown if no allocations exist */}
                  {formAllocations.length === 0 && (
                    <div className="mt-4 pt-4 border-t border-indigo-100 flex flex-col gap-1.5 max-w-sm">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Or Select Single Customer (Legacy)</label>
                      <select
                        value={prodForm.customerId}
                        onChange={(e) => {
                          const cust = customers.find(c => c.id === e.target.value);
                          setProducedItems({});
                          setFormAllocations([]);
                          setProdForm(f => ({ ...f, customerId: e.target.value, customerName: cust?.name ?? "" }));
                        }}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white transition"
                      >
                        <option value="">— Standard production (no customer) —</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ""}</option>
                        ))}
                      </select>
                      {prodForm.customerName && (
                        <p className="text-xs text-indigo-700 font-semibold mt-1">📋 Order for: {prodForm.customerName}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Metre readings ── */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-3">Metre readings</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {([
                      { label: "Start metre (L)", key: "startMeter", placeholder: "e.g. 10500" },
                      { label: "End metre (L)", key: "endMeter", placeholder: "e.g. 11200" },
                      { label: "Raw water intake (L)", key: "rawWaterLitres", placeholder: "e.g. 1000" },
                      { label: "Metered bottled water (L)", key: "bottledWaterLitres", placeholder: "Auto-calculated" },
                    ] as { label: string; key: keyof typeof prodForm; placeholder: string }[]).map(({ label, key, placeholder }) => {
                      const isAuto = key === "bottledWaterLitres";
                      const autoVal = (parseFloat(prodForm.endMeter) || 0) - (parseFloat(prodForm.startMeter) || 0);
                      const displayValue = isAuto ? (autoVal > 0 ? autoVal.toString() : "") : prodForm[key];
                      return (
                        <div key={key as string} className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                          <input type="number" min="0" step="0.01" placeholder={placeholder}
                            value={displayValue}
                            readOnly={isAuto}
                            onChange={(e) => !isAuto && setProdForm((f) => ({ ...f, [key]: e.target.value }))}
                            className={`px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${isAuto ? "bg-slate-100 cursor-not-allowed" : "bg-slate-50 focus:bg-white"} transition`} />
                        </div>
                      );
                    })}
                  </div>
                  {prodForm.startMeter && prodForm.endMeter && (() => {
                    const start = parseFloat(prodForm.startMeter) || 0;
                    const end = parseFloat(prodForm.endMeter) || 0;
                    const actualUsed = end - start;
                    
                    const totalBottled = kabsonProducts.reduce((sum, item) => {
                      let customerBottles = 0;
                      if (formAllocations.length > 0) {
                        formAllocations.forEach(alloc => {
                          customerBottles += getNewBottleQty(item, alloc.quantities[item.id] || "0");
                        });
                      } else {
                        const pi = producedItems[item.id];
                        customerBottles = getNewBottleQty(item, pi?.newQty || "0");
                      }
                      
                      const pi = producedItems[item.id];
                      const isCustomerBatch = formAllocations.length > 0 || !!prodForm.customerId;
                      const inventoryAddBottleQty = isCustomerBatch
                        ? getNewBottleQty(item, pi?.inventoryAddQty || "0")
                        : (parseInt(pi?.inventoryAddQty || "0") || 0);
                        
                      const refillQty = refillsPerProduct[item.id] || 0;
                      const litreMatch = item.name.match(/(\d+(?:\.\d+)?)(ml|l)\b/i);
                      if (!litreMatch) return sum;
                      const val = parseFloat(litreMatch[1]);
                      const unit = litreMatch[2].toLowerCase();
                      return sum + (unit === "ml" ? val / 1000 : val) * (customerBottles + inventoryAddBottleQty + refillQty);
                    }, 0);
                    
                    const variance = totalBottled - actualUsed;
                    return (
                      <div className={`mt-3 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap text-sm ${Math.abs(variance) < 1 ? "bg-emerald-50 border border-emerald-200" : variance < 0 ? "bg-rose-50 border border-rose-200" : "bg-amber-50 border border-amber-200"}`}>
                        <span className="font-semibold text-slate-700">Live variance:</span>
                        <span className="font-bold">Actual: <span className="text-blue-700">{actualUsed.toFixed(1)} L</span></span>
                        <span className="font-bold">Bottled: <span className="text-emerald-700">{totalBottled.toFixed(1)} L</span></span>
                        <span className={`font-black ${Math.abs(variance) < 1 ? "text-emerald-700" : variance < 0 ? "text-rose-700" : "text-amber-700"}`}>
                          Variance: {variance >= 0 ? "+" : ""}{variance.toFixed(1)} L {Math.abs(variance) < 1 ? "✓ OK" : variance < 0 ? "⚠ Loss" : "⚠ Gain"}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* ── Bottling output — dynamic Kabson products ── */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-1">Bottling output</p>
                  <p className="text-xs text-slate-500 mb-3">
                    {isCustomerOrder
                      ? "Customer order — the customer quantity goes to credit. Use the New stock column for extra inventory stock and refill units remain part of the batch."
                      : "Standard production — enter bottle counts and optional extra stock to add to inventory on completion."}
                  </p>
                  {kabsonProducts.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      ⚠ No "Kabson" products found in inventory. Add inventory items with "Kabson" in the name to track production here.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Product</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                              {isCustomerOrder ? "Customer new" : "New Bottles"}
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-700 uppercase tracking-wide">New stock</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wide">Refills (auto)</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Litres</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {kabsonProducts.map(item => {
                            const pi = producedItems[item.id] || { newQty: "", inventoryAddQty: "" };
                            const packSize = getPackSize(item.name);
                            
                            // Calculate customer new packs & bottles
                            let newPackQty = 0;
                            let newBottleQty = 0;
                            const hasAllocations = formAllocations.length > 0;
                            
                            if (hasAllocations) {
                              formAllocations.forEach(alloc => {
                                const val = parseInt(alloc.quantities[item.id] || "0") || 0;
                                newPackQty += val;
                              });
                              newBottleQty = newPackQty * packSize;
                            } else {
                              newPackQty = parseInt(pi.newQty) || 0;
                              newBottleQty = getNewBottleQty(item, pi.newQty);
                            }
                            
                            const isCustomerBatch = hasAllocations || isCustomerOrder;
                            const inventoryAddBottleQty = isCustomerBatch
                              ? getNewBottleQty(item, pi.inventoryAddQty || "0")
                              : (parseInt(pi.inventoryAddQty || "0") || 0);
                              
                            const refillQty = refillsPerProduct[item.id] || 0;
                            const litreMatch = item.name.match(/(\d+(?:\.\d+)?)(ml|l)\b/i);
                            const val = litreMatch ? parseFloat(litreMatch[1]) : 0;
                            const unit = litreMatch ? litreMatch[2].toLowerCase() : "l";
                            const litresEach = unit === "ml" ? val / 1000 : val;
                            const estLitres = (newBottleQty + inventoryAddBottleQty + refillQty) * litresEach;
                            
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-900">{item.name}</p>
                                  <p className="text-xs text-slate-400">
                                    Stock: {item.stock}
                                    {isCustomerBatch && packSize > 1 && ` · 1 pack = ${packSize} bottles`}
                                  </p>
                                </td>
                                <td className="px-4 py-3">
                                  {hasAllocations ? (
                                    <div className="font-bold text-slate-800 text-sm">
                                      {newPackQty} {packSize > 1 ? "packs" : "units"}
                                      {packSize > 1 && (
                                        <p className="text-[10px] text-slate-400 font-normal">= {newBottleQty} bottles</p>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <input
                                        type="number" min="0" placeholder="0"
                                        value={pi.newQty}
                                        onChange={e => setProducedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], newQty: e.target.value } }))}
                                        className="w-24 px-3 py-1.5 border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none bg-emerald-50 focus:bg-white transition"
                                      />
                                      {isCustomerOrder && newPackQty > 0 && packSize > 1 && (
                                        <p className="mt-1 text-[10px] font-semibold text-emerald-700">= {newBottleQty} bottles</p>
                                      )}
                                    </>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number" min="0" placeholder="0"
                                    value={pi.inventoryAddQty || ""}
                                    onChange={e => setProducedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], inventoryAddQty: e.target.value } }))}
                                    className="w-24 px-3 py-1.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-blue-50 focus:bg-white transition"
                                  />
                                  {isCustomerBatch && (parseInt(pi.inventoryAddQty || "0") || 0) > 0 && packSize > 1 && (
                                    <p className="mt-1 text-[10px] font-semibold text-blue-700">= {inventoryAddBottleQty} bottles</p>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-semibold ${refillQty > 0 ? "text-violet-700" : "text-slate-400"}`}>
                                    {refillQty > 0 ? `${refillQty} units` : "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-semibold ${estLitres > 0 ? "text-blue-700" : "text-slate-300"}`}>
                                    {estLitres > 0 ? `${estLitres.toFixed(1)} L` : "—"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Waste / loss (litres)</label>
                    <input type="number" min="0" step="0.1" placeholder="e.g. 50" value={prodForm.wasteLitres}
                      onChange={(e) => setProdForm((f) => ({ ...f, wasteLitres: e.target.value }))}
                      className="w-48 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white transition" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={prodLoading} className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition">
                    {prodLoading ? "Saving..." : "Log batch"}
                  </button>
                  <button type="button" onClick={() => { setShowProdForm(false); setProducedItems({}); }} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                  {prodError && <p className="text-sm text-rose-600">{prodError}</p>}
                </div>
              </form>
            </div>
          }

          {/* Batch cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="section-label">Batch history</p>
                <h2 className="panel-title mt-0.5">Production records</h2>
              </div>
              <span className="badge badge-green">✓ Completion auto-updates inventory</span>
            </div>

            {batches.length === 0 ? (
              <div className="panel">
                <div className="empty-state">
                  <div className="empty-state-icon">🏭</div>
                  <p className="font-medium text-sm">No production batches yet</p>
                  <p className="text-slate-500 text-xs mt-1">Record your first production run</p>
                  <button onClick={handleOpenProdForm} className="btn btn-primary btn-sm mt-3">Log first batch</button>
                </div>
              </div>
            ) : batches.map((batch) => {
              const actualUsed = (batch.endMeter ?? 0) - (batch.startMeter ?? 0);
              const totalBottledL = batch.producedItems
                ? batch.producedItems.reduce((sum, pi) => {
                    const item = inventory.find(i => i.id === pi.itemId);
                    if (!item) return sum;
                    const m = item.name.match(/(\d+(?:\.\d+)?)(ml|l)\b/i);
                    if (!m) return sum;
                    const v = parseFloat(m[1]); const u = m[2].toLowerCase();
                    return sum + (u === "ml" ? v / 1000 : v) * (pi.newQty + pi.refillQty);
                  }, 0)
                : (batch.bottled20L ?? 0)*20 + (batch.bottled10L ?? 0)*10 + (batch.bottled5L ?? 0)*5 + (batch.bottled1L ?? 0) + (batch.bottled500ml ?? 0)*0.5;
              const variance = batch.variance ?? (actualUsed > 0 ? totalBottledL - actualUsed : 0);
              const eff = batch.rawWaterLitres > 0 ? Math.round(((batch.rawWaterLitres - batch.wasteLitres) / batch.rawWaterLitres) * 100) : 0;
              const varOk = Math.abs(variance) < 1;

              const statusColor: Record<string, string> = {
                "In progress": "badge-blue",
                "Quality check": "badge-amber",
                "Completed": "badge-green",
                "Rejected": "badge-red",
              };

              return (
                <div key={batch.id} className="panel fade-in" style={{ overflow: "visible" }}>
                  {/* Card header row */}
                  <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b flex-wrap" style={{ borderColor: "var(--border-subtle)" }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-black text-sm" style={{ color: "var(--text-primary)" }}>{batch.batchNumber}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(batch.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {batch.customerName && (
                        <span className="badge badge-violet">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                          {batch.customerName}
                        </span>
                      )}
                      {batch.operator && (
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>by {batch.operator}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge badge-${statusColor[batch.status] ?? "badge-slate"}`}>{batch.status}</span>
                      {/* Action buttons */}
                      {batch.status === "In progress" && (
                        <button onClick={() => updateProductionBatch(batch.id, { status: "Quality check" })}
                          className="btn btn-sm" style={{ background: "#f59e0b", color: "#fff" }}>
                          QC check
                        </button>
                      )}
                      {batch.status === "Quality check" && (
                        <div className="flex gap-1.5">
                          <button disabled={completingBatch === batch.id}
                            onClick={async () => { setCompletingBatch(batch.id); try { await completeProductionBatch(batch.id, batch); } finally { setCompletingBatch(null); } }}
                            className="btn btn-sm btn-success disabled:opacity-50">
                            {completingBatch === batch.id ? "…" : "✓ Complete"}
                          </button>
                          <button onClick={() => updateProductionBatch(batch.id, { status: "Rejected" })}
                            className="btn btn-sm btn-danger">✕</button>
                        </div>
                      )}
                      {batch.status === "Completed" && (
                        <span className="text-xs font-semibold" style={{ color: "#059669" }}>
                          {batch.customerId ? "Invoice created ✓" : "Inventory updated ✓"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditBatchModal({ open: true, batch });
                          setEditBatchForm({
                            batchNumber: batch.batchNumber,
                            operator: batch.operator || "",
                            notes: batch.notes || "",
                            rawWaterLitres: String(batch.rawWaterLitres ?? ""),
                            startMeter: String(batch.startMeter ?? ""),
                            endMeter: String(batch.endMeter ?? ""),
                            wasteLitres: String(batch.wasteLitres ?? ""),
                            producedItems: normalizeEditProducedItems(batch),
                          });
                          setEditBatchError("");
                        }}
                        className="btn btn-sm btn-secondary"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 px-5 py-3 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card-2)" }}>
                    {[
                      { label: "Raw water", value: `${batch.rawWaterLitres?.toLocaleString() ?? "—"} L`, color: "var(--kw-700)" },
                      { label: "Metre range", value: batch.startMeter ? `${batch.startMeter.toLocaleString()} → ${batch.endMeter?.toLocaleString()}` : "—", color: "var(--text-secondary)" },
                      { label: "Actual used", value: actualUsed > 0 ? `${actualUsed.toFixed(1)} L` : "—", color: "var(--kw-600)" },
                      { label: "Bottled", value: `${totalBottledL.toFixed(1)} L`, color: "#0891b2" },
                      { label: "Refills", value: `${batch.refillCount ?? 0} units`, color: "#7c3aed" },
                      { label: "Refill litres", value: batch.refillLitres != null ? `${batch.refillLitres} L` : "—", color: "#6b7280" },
                      { label: "Variance", value: actualUsed > 0 ? `${variance >= 0 ? "+" : ""}${variance.toFixed(1)} L` : "—", color: varOk ? "#059669" : variance < 0 ? "#dc2626" : "#d97706" },
                      { label: "Efficiency", value: `${eff}%`, color: eff >= 90 ? "#059669" : eff >= 75 ? "#d97706" : "#dc2626" },
                    ].map(m => (
                      <div key={m.label}>
                        <p className="metric-label">{m.label}</p>
                        <p className="font-black text-sm num mt-0.5" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Output section */}
                  <div className="px-5 py-3">
                    <p className="metric-label mb-2">Output</p>
                    {batch.producedItems && batch.producedItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {batch.producedItems.map(pi => {
                          const inv = inventory.find(i => i.id === pi.itemId);
                          const packSize = getPackSize(inv?.name ?? "");
                          const shortName = (pi.name || inv?.name || pi.itemId).replace(/kabson water?\s*/i, "");
                          const displayNewQty = batch.customerId && packSize > 1 ? (pi.newPackQty ?? Math.round((pi.newQty || 0) / packSize)) : (pi.newQty || 0);
                          const displayInventoryQty = batch.customerId && packSize > 1 ? Math.round((pi.inventoryAddQty || 0) / packSize) : (pi.inventoryAddQty || 0);
                          const newLabel = displayNewQty > 0 ? `${displayNewQty} ${batch.customerId ? "packs" : "new"}` : null;
                          const newStockLabel = displayInventoryQty > 0 ? `${displayInventoryQty} new stock${batch.customerId ? " packs" : ""}` : null;
                          const refillLabel = pi.refillQty > 0 ? `${pi.refillQty} refill` : null;
                          if (!newLabel && !newStockLabel && !refillLabel) return null;
                          return (
                            <div key={pi.itemId} className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--bg-card-2)", border: "1px solid var(--border-subtle)" }}>
                              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{shortName}</span>
                              {newLabel && <span className="ml-2 badge badge-green">{newLabel}</span>}
                              {newStockLabel && <span className="ml-1 badge badge-blue">{newStockLabel}</span>}
                              {refillLabel && <span className="ml-1 badge badge-violet">{refillLabel}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Waste: {batch.wasteLitres} L
                        {batch.notes && ` · ${batch.notes}`}
                      </p>
                    )}
                    {batch.notes && batch.producedItems && (
                      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{batch.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {editBatchModal.open && editBatchModal.batch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
              <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Edit production batch</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">{editBatchModal.batch.batchNumber}</h3>
                    <p className="text-sm text-slate-500">Update the production record, meter readings, and output quantities for this batch.</p>
                  </div>
                  <button type="button" onClick={() => setEditBatchModal({ open: false, batch: null })} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Close</button>
                </div>
                <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Batch number</label>
                    <input type="text" value={editBatchForm.batchNumber} onChange={(e) => setEditBatchForm(f => ({ ...f, batchNumber: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Operator</label>
                    <input type="text" value={editBatchForm.operator} onChange={(e) => setEditBatchForm(f => ({ ...f, operator: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Raw water (L)</label>
                    <input type="number" min="0" step="0.1" value={editBatchForm.rawWaterLitres} onChange={(e) => setEditBatchForm(f => ({ ...f, rawWaterLitres: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Start metre</label>
                    <input type="number" min="0" step="0.1" value={editBatchForm.startMeter} onChange={(e) => setEditBatchForm(f => ({ ...f, startMeter: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">End metre</label>
                    <input type="number" min="0" step="0.1" value={editBatchForm.endMeter} onChange={(e) => setEditBatchForm(f => ({ ...f, endMeter: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Waste / loss (L)</label>
                    <input type="number" min="0" step="0.1" value={editBatchForm.wasteLitres} onChange={(e) => setEditBatchForm(f => ({ ...f, wasteLitres: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Notes</label>
                    <textarea rows={4} value={editBatchForm.notes} onChange={(e) => setEditBatchForm(f => ({ ...f, notes: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
                  </div>
                </div>
                {editBatchForm.producedItems.length > 0 && (
                  <div className="border-t border-slate-200 px-6 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Production quantities</p>
                    <p className="mt-1 text-sm text-slate-500">Adjust the units entered for this batch. These values are saved back to the production record.</p>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-slate-600">
                          <tr>
                            <th className="px-3 py-2.5">Product</th>
                            <th className="px-3 py-2.5">New</th>
                            <th className="px-3 py-2.5">New stock</th>
                            <th className="px-3 py-2.5">Refill</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {editBatchForm.producedItems.map((pi, index) => {
                            const item = inventory.find(i => i.id === pi.itemId);
                            const packSize = getPackSize(item?.name ?? "");
                            const isCustomerBatch = Boolean(editBatchModal.batch?.customerId);
                            const editableNewQty = isCustomerBatch ? getPackCount(item, pi.newQty ?? 0) : (pi.newQty ?? 0);
                            const editableInventoryQty = isCustomerBatch ? getPackCount(item, pi.inventoryAddQty ?? 0) : (pi.inventoryAddQty ?? 0);
                            return (
                              <tr key={`${pi.itemId}-${index}`}>
                                <td className="px-3 py-3 text-slate-700">{pi.name || item?.name || "Product"}</td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={editableNewQty}
                                    onChange={(e) => setEditBatchForm(f => ({
                                      ...f,
                                      producedItems: f.producedItems.map((row, rowIdx) => rowIdx === index
                                        ? {
                                            ...row,
                                            newPackQty: isCustomerBatch ? (Number(e.target.value) || 0) : undefined,
                                            newQty: isCustomerBatch ? (Number(e.target.value) || 0) * packSize : (Number(e.target.value) || 0),
                                          }
                                        : row)
                                    }))}
                                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm"
                                  />
                                  {isCustomerBatch && packSize > 1 && <p className="mt-1 text-[10px] text-slate-500">packs</p>}
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={editableInventoryQty}
                                    onChange={(e) => setEditBatchForm(f => ({
                                      ...f,
                                      producedItems: f.producedItems.map((row, rowIdx) => rowIdx === index
                                        ? {
                                            ...row,
                                            inventoryAddQty: isCustomerBatch ? (Number(e.target.value) || 0) * packSize : (Number(e.target.value) || 0),
                                          }
                                        : row)
                                    }))}
                                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm"
                                  />
                                  {isCustomerBatch && packSize > 1 && <p className="mt-1 text-[10px] text-slate-500">packs</p>}
                                </td>
                                <td className="px-3 py-3"><input type="number" min="0" value={pi.refillQty ?? 0} onChange={(e) => setEditBatchForm(f => ({ ...f, producedItems: f.producedItems.map((row, rowIdx) => rowIdx === index ? { ...row, refillQty: Number(e.target.value) || 0 } : row) }))} className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm" /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={saveEditBatch} disabled={editBatchLoading} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 transition">{editBatchLoading ? "Saving..." : "Save changes"}</button>
                    <button type="button" onClick={() => setEditBatchModal({ open: false, batch: null })} className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
                  </div>
                  {editBatchError && <p className="text-sm text-rose-600">{editBatchError}</p>}
                </div>
              </div>
            </div>
          )}
        </>)}
 
        {/* DAILY STOCK TAKE TAB */}
        {tab === "stocktake" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Record Daily Stock Take</h2>
              <p className="text-sm text-slate-500 mb-5">
                Verify the actual physical stock in the store. Submitting will update the inventory levels and log an audit history record.
              </p>
              
              {stockTakeSuccess && (
                <div className="alert-banner alert-emerald mb-4">
                  <KwIcon name="check" size={16} className="shrink-0" />
                  Stock take submitted. Inventory counts updated successfully.
                </div>
              )}
              {stockTakeError && (
                <div className="alert-banner alert-rose mb-4">
                  <KwIcon name="alert" size={16} className="shrink-0" />
                  {stockTakeError}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!stockTakeOperator.trim()) { setStockTakeError("Operator name is required."); return; }
                setStockTakeLoading(true); setStockTakeError(""); setStockTakeSuccess(false);
                try {
                  const itemsToSave = inventory.map(item => {
                    const recorded = item.stock;
                    const counted = stockTakeCounted[item.id] !== undefined && stockTakeCounted[item.id] !== ""
                      ? parseInt(stockTakeCounted[item.id]) || 0
                      : recorded;
                    return {
                      itemId: item.id,
                      itemName: item.name,
                      recordedStock: recorded,
                      countedStock: counted,
                      variance: counted - recorded,
                    };
                  });
                  
                  await createStockTakeRecord({
                    date: new Date().toISOString().slice(0, 10),
                    operator: stockTakeOperator.trim(),
                    notes: stockTakeNotes.trim(),
                    items: itemsToSave.filter(i => i.variance !== 0 || stockTakeCounted[i.itemId] !== undefined),
                  });
                  
                  for (const it of itemsToSave) {
                    if (it.variance !== 0) {
                      await updateInventoryItem(it.itemId, { stock: it.countedStock });
                    }
                  }
                  
                  setStockTakeOperator("");
                  setStockTakeNotes("");
                  setStockTakeCounted({});
                  setStockTakeSuccess(true);
                  setTimeout(() => setStockTakeSuccess(false), 3000);
                } catch (err) {
                  setStockTakeError("Failed to record stock take. Please try again.");
                } finally {
                  setStockTakeLoading(false);
                }
              }} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Stock Take Date</label>
                    <input type="text" value={new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })} readOnly className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 cursor-not-allowed outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Operator / Staff Name *</label>
                    <input type="text" placeholder="e.g. John Doe" value={stockTakeOperator} onChange={e => setStockTakeOperator(e.target.value)} required className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-slate-50 focus:bg-white transition" />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</label>
                    <input type="text" placeholder="Optional notes (e.g. End of day reconciliation)" value={stockTakeNotes} onChange={e => setStockTakeNotes(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-slate-50 focus:bg-white transition" />
                  </div>
                </div>

                {/* Stock take items table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr className="text-left text-slate-600 text-xs uppercase font-semibold">
                        <th className="px-4 py-2.5">Product</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Recorded Stock</th>
                        <th className="px-4 py-2.5">Actual Count</th>
                        <th className="px-4 py-2.5">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {inventory.map(item => {
                        const recorded = item.stock;
                        const countedStr = stockTakeCounted[item.id] ?? "";
                        const counted = countedStr !== "" ? parseInt(countedStr) || 0 : recorded;
                        const variance = counted - recorded;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                            <td className="px-4 py-3"><span className="badge badge-slate">{item.category}</span></td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-500">{recorded}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number" min="0" placeholder={recorded.toString()}
                                value={countedStr}
                                onChange={e => setStockTakeCounted(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-sm outline-none transition focus:ring-2 focus:ring-sky-500 focus:bg-white bg-slate-50"
                              />
                            </td>
                            <td className="px-4 py-3">
                              {variance === 0 ? (
                                <span className="text-xs font-semibold text-emerald-600">✓ OK</span>
                              ) : variance < 0 ? (
                                <span className="text-xs font-bold text-rose-600">{variance} Loss</span>
                              ) : (
                                <span className="text-xs font-bold text-amber-600">+{variance} Gain</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={stockTakeLoading} className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition">
                    {stockTakeLoading ? "Saving..." : "Submit Stock Take"}
                  </button>
                  <button type="button" onClick={() => { setStockTakeCounted({}); setStockTakeOperator(""); setStockTakeNotes(""); }} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                    Reset Form
                  </button>
                </div>
              </form>
            </div>

            {/* Stock take history list */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Stock Take History</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Audit log of all past stock takes</p>
                </div>
                <span className="badge badge-slate">{stockTakes.length} records</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left text-slate-600 text-xs uppercase font-semibold">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Operator</th>
                      <th className="px-6 py-3">Notes</th>
                      <th className="px-6 py-3 text-center">Items Reconciled</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockTakes.map((st) => {
                      const reconciledCount = st.items ? st.items.length : 0;
                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {new Date(st.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-6 py-4 text-slate-700">{st.operator}</td>
                          <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">{st.notes || "—"}</td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">{reconciledCount} items</td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => setSelectedStockTake(st)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                 </table>
               </div>
              {stockTakes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <KwIcon name="clipboard" size={32} className="mb-2 opacity-40" />
                  <p className="font-medium text-sm">No stock take history yet</p>
                </div>
              )}
             </div>

            {/* Selected stock take details modal */}
            {selectedStockTake && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setSelectedStockTake(null)}>
                <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Stock Take Details</p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-900">
                        {new Date(selectedStockTake.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                      </h3>
                      <p className="text-sm text-slate-500">Recorded by <strong>{selectedStockTake.operator}</strong></p>
                    </div>
                    <button type="button" onClick={() => setSelectedStockTake(null)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                      Close
                    </button>
                  </div>
                  
                  <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                    {selectedStockTake.notes && (
                      <div className="mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <strong>Notes:</strong> {selectedStockTake.notes}
                      </div>
                    )}
                    
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-left">
                          <tr>
                            <th className="px-3 py-2 text-xs uppercase">Product</th>
                            <th className="px-3 py-2 text-xs uppercase">Recorded</th>
                            <th className="px-3 py-2 text-xs uppercase">Counted</th>
                            <th className="px-3 py-2 text-xs uppercase">Variance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {selectedStockTake.items?.map((item, idx) => (
                            <tr key={`${item.itemId}-${idx}`} className="hover:bg-slate-50">
                              <td className="px-3 py-2.5 font-semibold text-slate-800">{item.itemName}</td>
                              <td className="px-3 py-2.5 font-mono text-slate-500">{item.recordedStock}</td>
                              <td className="px-3 py-2.5 font-mono text-slate-800 font-bold">{item.countedStock}</td>
                              <td className="px-3 py-2.5">
                                {item.variance === 0 ? (
                                  <span className="text-xs font-semibold text-emerald-600">No variance</span>
                                ) : item.variance < 0 ? (
                                  <span className="text-xs font-bold text-rose-600">{item.variance} Loss</span>
                                ) : (
                                  <span className="text-xs font-bold text-amber-600">+{item.variance} Gain</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                    <button type="button" onClick={() => setSelectedStockTake(null)} className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


      </PageLayout>
    </SiteShell>
  );
}

