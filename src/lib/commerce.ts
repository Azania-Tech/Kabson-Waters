import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import type { Product } from "@/types";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db } from "./firebase";
import { accountingCategoryForLine, getPackSize } from "./pricing";

export type CustomerOrderRecord = {
  id: string;
  customerId?: string;
  customer: string;
  type: string;
  volume: string;
  status: string;
  due: string;
  amount?: number;       // order total in KES
  notes?: string;        // any extra notes / invoice line
  paidAmount?: number;   // amount already settled
  createdAt: string;
};

export type SupplierRecord = {
  id: string;
  name: string;
  category: string;
  contact: string;
  nextDelivery: string;
  status: string;
  createdAt: string;
};

export type PurchaseOrderRecord = {
  id: string;
  supplier: string;
  item: string;
  quantity: string;
  payment: string;
  status?: string; // "Pending", "Approved", "Received"
  approvedAt?: string;
  receivedAt?: string;
  createdAt: string;
};

export type AccountingTransactionRecord = {
  id: string;
  date: string;
  account: string;
  amount: string;
  status: string;
  type: string;
  category: string; // e.g. "Operations", "Salaries", "Tax", "Sales", "Utilities"
  taxRate?: number; // percentage e.g. 16 for 16% VAT
  note: string;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;          // default/legacy price
  retailPrice?: number;
  wholesalePrice?: number;
  refillPrice?: number;
  stock: number;
  productionStock: number;
  stores?: Record<string, number>; // storeId -> quantity for multi-store support
  reorderPoint: number;
  createdAt: string;
};

export type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalPurchases: number;
  loyaltyPoints: number;
  creditLimit: number;
  creditBalance: number;
  lastPurchase: string;
  createdAt: string;
};

export type SaleLineItem = {
  itemId: string;
  itemName?: string;
  quantity: number;
  price: number;
  saleKind?: "retail" | "wholesale" | "refill";
  skipInventory?: boolean;
};

export type RetailSale = {
  id: string;
  customerId?: string;
  items: SaleLineItem[];
  total: number;
  paymentMethod: string;
  paymentBreakdown?: Record<string, number>;
  status: string;
  createdAt: string;
};

export type StockTakeItem = {
  itemId: string;
  itemName: string;
  recordedStock: number;
  countedStock: number;
  variance: number;
};

export type StockTakeRecord = {
  id: string;
  date: string;
  operator: string;
  notes: string;
  items: StockTakeItem[];
  createdAt: string;
};

/** Firestore rejects `undefined` field values — omit them before writes. */
function omitUndefined<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? omitUndefined(item as Record<string, unknown>)
          : item
      );
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

const ordersRef = collection(db, "orders");
const suppliersRef = collection(db, "suppliers");
const purchaseOrdersRef = collection(db, "purchaseOrders");
const transactionsRef = collection(db, "transactions");
const inventoryRef = collection(db, "inventory");
const customersRef = collection(db, "customers");
const salesRef = collection(db, "sales");

export async function createOrderRecord(input: Omit<CustomerOrderRecord, "id" | "createdAt">) {
  // Generate a readable invoice/order id with prefix 'KB' and date-based sequence
  const id = await generateOrderId();
  const data = Object.fromEntries(
    Object.entries({ ...input, createdAt: new Date().toISOString() })
      .filter(([, v]) => v !== undefined)
  );
  await setDoc(doc(ordersRef, id), data);
  return id;
}

async function generateOrderId(): Promise<string> {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  
  // Simple approach: get all orders and count today's orders
  const allSnap = await getDocs(ordersRef);
  const todayOrders = allSnap.docs.filter((doc) => {
    const createdAt = (doc.data() as any).createdAt;
    if (!createdAt) return false;
    try {
      const docDate = new Date(createdAt).toISOString().slice(0, 10).replace(/-/g, "");
      return docDate === ymd;
    } catch {
      return false;
    }
  });
  
  const seq = todayOrders.length + 1;
  const seqStr = String(seq).padStart(4, "0");
  return `KB-${ymd}-${seqStr}`;
}

export function subscribeToOrders(callback: (orders: CustomerOrderRecord[]) => void) {
  return onSnapshot(
    query(ordersRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CustomerOrderRecord, "id">),
        }))
      );
    }
  );
}

export async function createSupplierRecord(input: Omit<SupplierRecord, "id" | "createdAt">) {
  await addDoc(suppliersRef, {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToSuppliers(callback: (suppliers: SupplierRecord[]) => void) {
  return onSnapshot(
    query(suppliersRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<SupplierRecord, "id">),
        }))
      );
    }
  );
}

export async function createPurchaseOrderRecord(input: Omit<PurchaseOrderRecord, "id" | "createdAt">) {
  await addDoc(purchaseOrdersRef, {
    ...input,
    status: input.status || "Pending",
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToPurchaseOrders(callback: (purchaseOrders: PurchaseOrderRecord[]) => void) {
  return onSnapshot(
    query(purchaseOrdersRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<PurchaseOrderRecord, "id">),
        }))
      );
    }
  );
}

export async function approvePurchaseOrder(orderId: string) {
  await updateDoc(doc(purchaseOrdersRef, orderId), { status: "Approved", approvedAt: new Date().toISOString() });
}

export async function receivePurchaseOrder(orderId: string, itemStr: string, quantityStr: string) {
  // 1. Mark as received
  await updateDoc(doc(purchaseOrdersRef, orderId), { status: "Received", receivedAt: new Date().toISOString() });
  
  // 2. Add to inventory
  // Try to parse quantity, e.g., "500 pcs" -> 500
  const qtyMatch = quantityStr.match(/\d+/);
  const qty = qtyMatch ? parseInt(qtyMatch[0]) : 0;
  
  if (qty > 0) {
    const snapshot = await getDocs(inventoryRef);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<InventoryItem, "id"> }));
    // Try to match inventory item loosely by name
    const targetItem = items.find(i => i.name.toLowerCase().includes(itemStr.toLowerCase()) || itemStr.toLowerCase().includes(i.name.toLowerCase()));
    
    if (targetItem) {
      await updateInventoryStock(targetItem.id, targetItem.stock + qty);
    }
  }
}

export async function createAccountingTransactionRecord(
  input: Omit<AccountingTransactionRecord, "id" | "createdAt">
) {
  await addDoc(transactionsRef, {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToAccountingTransactions(
  callback: (transactions: AccountingTransactionRecord[]) => void
) {
  return onSnapshot(
    query(transactionsRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<AccountingTransactionRecord, "id">),
        }))
      );
    }
  );
}

// INVENTORY FUNCTIONS
export async function createInventoryItem(input: Omit<InventoryItem, "id" | "createdAt">) {
  await addDoc(inventoryRef, {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToInventory(callback: (items: InventoryItem[]) => void) {
  return onSnapshot(
    query(inventoryRef, orderBy("name", "asc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<InventoryItem, "id">),
        }))
      );
    }
  );
}

export async function updateInventoryStock(itemId: string, newStock: number) {
  await updateDoc(doc(inventoryRef, itemId), { stock: newStock });
}

export async function updateInventoryProductionStock(itemId: string, newProductionStock: number) {
  await updateDoc(doc(inventoryRef, itemId), { productionStock: newProductionStock });
}

export async function updateInventoryItem(itemId: string, updates: Partial<Pick<InventoryItem, "stock" | "productionStock" | "price" | "retailPrice" | "wholesalePrice" | "refillPrice" | "reorderPoint">>) {
  await updateDoc(doc(inventoryRef, itemId), updates);
}

export async function deleteInventoryItem(itemId: string) {
  await deleteDoc(doc(inventoryRef, itemId));
}

// CUSTOMER FUNCTIONS
export async function createCustomerProfile(input: Omit<CustomerProfile, "id" | "createdAt">) {
  await addDoc(customersRef, {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function updateCustomerProfile(customerId: string, updates: Partial<Omit<CustomerProfile, "id" | "createdAt">>) {
  await updateDoc(doc(customersRef, customerId), updates);
}

export async function deleteCustomerProfile(customerId: string) {
  await deleteDoc(doc(customersRef, customerId));
}

export function subscribeToCustomers(callback: (customers: CustomerProfile[]) => void) {
  return onSnapshot(
    query(customersRef, orderBy("name", "asc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CustomerProfile, "id">),
        }))
      );
    }
  );
}

export async function updateCustomerLoyalty(customerId: string, points: number) {
  await updateDoc(doc(customersRef, customerId), {
    loyaltyPoints: points,
    lastPurchase: new Date().toISOString(),
  });
}

export async function updateCustomerCredit(customerId: string, amountAddedToBalance: number) {
  const snap = await getDoc(doc(customersRef, customerId));
  if (snap.exists()) {
    const data = snap.data() as CustomerProfile;
    const newBalance = (data.creditBalance || 0) + amountAddedToBalance;
    await updateDoc(doc(customersRef, customerId), { creditBalance: newBalance });
  }
}

export async function settleCustomerCredit(customerId: string, amountPaid: number) {
  const snap = await getDoc(doc(customersRef, customerId));
  if (snap.exists()) {
    const data = snap.data() as CustomerProfile;
    const newBalance = Math.max(0, (data.creditBalance || 0) - amountPaid);
    await updateDoc(doc(customersRef, customerId), { creditBalance: newBalance });
    
    // Create an accounting transaction for the payment
    await createAccountingTransactionRecord({
      date: new Date().toISOString().split("T")[0],
      account: "Main account",
      amount: amountPaid.toString(),
      status: "Completed",
      type: "Income",
      category: "Sales",
      note: `Credit settlement from customer ${data.name}`,
    });
  }
}

// SALES FUNCTIONS
export async function createRetailSale(input: Omit<RetailSale, "id" | "createdAt">) {
  // Strip undefined fields — Firestore rejects them
  const data = Object.fromEntries(
    Object.entries({ ...input, createdAt: new Date().toISOString() }).filter(([, v]) => v !== undefined)
  );
  await addDoc(salesRef, data);

  // Update customer metrics if customer is linked
  if (input.customerId) {
    const customerSnap = await getDoc(doc(customersRef, input.customerId));
    if (customerSnap.exists()) {
      const customer = customerSnap.data() as CustomerProfile;
      const newTotalPurchases = (customer.totalPurchases || 0) + input.total;
      const pointsEarned = Math.floor(input.total / 1000);
      const newLoyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;

      await updateDoc(doc(customersRef, input.customerId), {
        totalPurchases: newTotalPurchases,
        loyaltyPoints: newLoyaltyPoints,
        lastPurchase: new Date().toISOString(),
      });
    }
  }

  // Create accounting transactions grouped by revenue category (retail / wholesale / refill)
  const isCredit = input.paymentMethod === "Credit";
  const categoryTotals = new Map<string, number>();
  for (const item of input.items) {
    const kind = item.saleKind ?? "retail";
    const category = accountingCategoryForLine(kind, isCredit);
    const lineTotal = item.quantity * item.price;
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + lineTotal);
  }

  if (input.paymentMethod === "Split" && input.paymentBreakdown) {
    const splitDate = new Date().toISOString().split("T")[0];
    for (const [method, amount] of Object.entries(input.paymentBreakdown)) {
      if (amount <= 0) continue;
      const accountName = method === "M-Pesa" ? "M-Pesa sales" : `${method} sales`;
      await createAccountingTransactionRecord({
        date: splitDate,
        account: accountName,
        amount: amount.toString(),
        status: "Completed",
        type: "Revenue",
        category: "Split",
        taxRate: 16,
        note: `Split payment ${method} — KES ${amount}`,
      });
    }
  } else {
    for (const [category, amount] of categoryTotals) {
      if (amount <= 0) continue;
      await createAccountingTransactionRecord({
        date: new Date().toISOString().split("T")[0],
        account: `${input.paymentMethod} sales`,
        amount: amount.toString(),
        status: isCredit ? "Pending" : "Completed",
        type: "Revenue",
        category,
        taxRate: 16,
        note: `${input.paymentMethod} ${category.toLowerCase()} — KES ${amount}${input.customerId ? " to customer" : ""}`,
      });
    }
  }
}

export function subscribeToSales(callback: (sales: RetailSale[]) => void) {
  return onSnapshot(
    query(salesRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<RetailSale, "id">),
        }))
      );
    }
  );
}

export async function deleteTodaysSalesRecords() {
  const today = new Date();
  const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const q = query(
    salesRef,
    where("createdAt", ">=", startOfDay.toISOString()),
    where("createdAt", "<", endOfDay.toISOString())
  );
  const snapshot = await getDocs(q);
  const deletes = snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref));
  await Promise.all(deletes);
  return snapshot.size;
}

export async function deleteAllRecordsExceptUsers() {
  const collectionsToClear = [
    ordersRef,
    suppliersRef,
    purchaseOrdersRef,
    transactionsRef,
    inventoryRef,
    customersRef,
    salesRef,
    productionRef,
    configRef,
    storesRef,
    transfersRef,
    shopProductsRef,
  ];

  let deletedCount = 0;
  for (const ref of collectionsToClear) {
    const snapshot = await getDocs(ref);
    const batchDeletes = snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref));
    await Promise.all(batchDeletes);
    deletedCount += snapshot.size;
  }
  return deletedCount;
}

// ORDER STATUS
export async function updateOrderStatus(orderId: string, status: string) {
  await updateDoc(doc(ordersRef, orderId), { status });
}

export async function settleOrderPayment(orderId: string, amount: number, currentPaid: number) {
  await updateDoc(doc(ordersRef, orderId), {
    paidAmount: currentPaid + amount,
    status: "Settled",
  });
}

// USER ROLE MANAGEMENT
export type UserRecord = {
  uid: string;
  email: string;
  role: "cashier" | "manager" | "admin" | "owner";
  displayName?: string;
  createdAt: string;
};

const usersRef = collection(db, "users");

export async function setUserRole(uid: string, email: string, role: UserRecord["role"], displayName?: string) {
  await setDoc(doc(usersRef, uid), { uid, email, role, displayName: displayName ?? "", createdAt: new Date().toISOString() }, { merge: true });
}

/**
 * Creates a new Firebase Auth user + Firestore profile without disrupting the
 * currently signed-in admin session, by using a temporary secondary app instance.
 */
export async function createUserAccount(
  email: string,
  password: string,
  displayName: string,
  role: UserRecord["role"]
): Promise<void> {
  // Build config from the same env vars the primary app uses
  const secondaryConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Use a unique name so it doesn't collide with the primary app
  const secondaryApp = initializeApp(secondaryConfig, `create-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUser = credential.user;

    // Set the display name on the Auth profile
    if (displayName) {
      await updateProfile(newUser, { displayName });
    }

    // Write the Firestore user record with the chosen role
    await setDoc(doc(usersRef, newUser.uid), {
      uid: newUser.uid,
      email,
      role,
      displayName,
      createdAt: new Date().toISOString(),
    });
  } finally {
    // Always sign out and delete the temporary app to avoid stale auth listeners
    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);
  }
}

export async function getUserRole(uid: string): Promise<UserRecord["role"] | null> {
  const snap = await getDoc(doc(usersRef, uid));
  if (snap.exists()) return (snap.data() as UserRecord).role;
  return null;
}

// PRODUCTION TRACKING
export type ProducedItem = {
  itemId: string;
  name: string;
  newQty: number;        // customer/production new bottles for credit invoice
  refillQty: number;     // refill units from refill sales
  inventoryAddQty?: number; // extra new stock to add into inventory
  newPackQty?: number;   // packs ordered (customer production only)
};

export type CustomerAllocation = {
  customerId: string;
  customerName: string;
  producedItems: {
    itemId: string;
    name: string;
    newQty: number;
    newPackQty?: number;
  }[];
};

export type ProductionBatch = {
  id: string;
  batchNumber: string;
  rawWaterLitres: number;
  bottledWaterLitres?: number;
  treatedWaterLitres?: number;
  // Dynamic produced items (replaces hardcoded size fields)
  producedItems?: ProducedItem[];
  customerAllocations?: CustomerAllocation[];
  // Legacy hardcoded size fields (kept for backward compat)
  bottled20L?: number;
  bottled10L?: number;
  bottled5L?: number;
  bottled1L?: number;
  bottled500ml?: number;
  wasteLitres: number;
  startMeter: number;
  endMeter: number;
  expectedEndMeter: number;
  variance: number;
  status: "In progress" | "Completed" | "Quality check" | "Rejected";
  operator: string;
  notes: string;
  // Customer production fields
  customerId?: string;
  customerName?: string;
  addToInventory?: boolean;
  sourceStoreId?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  // Summaries calculated on completion
  refillCount?: number;
  refillLitres?: number;
  producedLitres?: number;
};

const productionRef = collection(db, "production");

export async function createProductionBatch(input: Omit<ProductionBatch, "id" | "createdAt">) {
  await addDoc(
    productionRef,
    omitUndefined({ ...input, createdAt: new Date().toISOString() } as Record<string, unknown>)
  );
}

export async function updateProductionBatch(batchId: string, updates: Partial<ProductionBatch>) {
  await updateDoc(doc(productionRef, batchId), omitUndefined(updates as Record<string, unknown>));
}

export async function completeProductionBatch(batchId: string, batch: ProductionBatch) {
  // 1. Mark batch as completed
  await updateProductionBatch(batchId, {
    status: "Completed",
    completedAt: new Date().toISOString()
  });

  const { posStoreId, prodStoreId } = await getOrCreateDefaultStores();
  const sourceStoreId = batch.sourceStoreId || prodStoreId;

  const snapshot = await getDocs(inventoryRef);
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<InventoryItem, "id"> }));

  const actualWaterUsed = batch.endMeter - batch.startMeter;

  // Decrease bottled water from production stock (metered)
  const bottledWaterItem = items.find(i =>
    (i.name.toLowerCase().includes("treated water") || i.name.toLowerCase().includes("bottled water"))
    && i.category === "Water"
  );
  if (bottledWaterItem && actualWaterUsed > 0) {
    await updateInventoryProductionStock(bottledWaterItem.id, bottledWaterItem.productionStock - actualWaterUsed);
  }

  // ─── DYNAMIC producedItems (new system) ────────────────────────────────────
  if (batch.producedItems && batch.producedItems.length > 0) {
    const isCustomerBatch = !!batch.customerId;
    const saleLineItems: SaleLineItem[] = [];

    for (const pi of batch.producedItems) {
      const item = items.find(i => i.id === pi.itemId);
      if (!item) continue;

      const inventoryQty = isCustomerBatch
        ? (pi.inventoryAddQty ?? 0) + pi.refillQty
        : (pi.newQty + (pi.inventoryAddQty ?? 0) + pi.refillQty);
      if (pi.newQty <= 0 && pi.refillQty <= 0 && inventoryQty <= 0) continue;

      const shouldAddToInventory = inventoryQty > 0;

      if (shouldAddToInventory) {
        // ── Add finished goods to inventory stock for standard production or explicit stock additions ──
        if (item.stores?.[prodStoreId] !== undefined) {
          await updateStoreItemQuantity(item.id, prodStoreId, inventoryQty);
          // Finished goods now go to Production store, no inter-store transfer needed
        } else {
          await updateInventoryStock(item.id, item.stock + inventoryQty);
        }
      }

      if (isCustomerBatch) {
        // ── Customer production: create credit invoice for the customer order portion ──
        if (pi.newPackQty && pi.newPackQty > 0) {
          // Use customerOrderPrice per pack if set, else wholesalePrice * packSize
          const packSize = getPackSize(item.name);
          const packPrice = (item as { customerOrderPrice?: number }).customerOrderPrice
            ?? ((item.wholesalePrice ?? item.retailPrice ?? item.price) * packSize);
          saleLineItems.push({
            itemId: item.id,
            itemName: item.name,
            quantity: pi.newPackQty,
            price: packPrice,
            saleKind: "wholesale",
            skipInventory: true,
          });
        } else if (pi.newQty > 0) {
          const unitPrice = item.wholesalePrice ?? item.retailPrice ?? item.price;
          saleLineItems.push({
            itemId: item.id,
            itemName: item.name,
            quantity: pi.newQty,
            price: unitPrice,
            saleKind: "wholesale",
            skipInventory: true,
          });
        }
        if (pi.refillQty > 0) {
          const unitPrice = item.refillPrice ?? Math.round((item.wholesalePrice ?? item.price) * 0.5);
          saleLineItems.push({
            itemId: item.id,
            itemName: item.name,
            quantity: pi.refillQty,
            price: unitPrice,
            saleKind: "refill",
            skipInventory: true,
          });
        }
      }

      // ── Deduct empty bottles only for NEW qty (Kabson items) ──
      if (pi.newQty > 0) {
        // Match empty-bottle item by size extracted from product name
        const sizeMatch = item.name.match(/(\d+(?:\.\d+)?)(ml|l)/i);
        if (sizeMatch) {
          const sizeStr = sizeMatch[0].toLowerCase();
          const emptyBottle = items.find(i =>
            i.name.toLowerCase().includes("empty") &&
            i.name.toLowerCase().includes(sizeStr)
          );
          if (emptyBottle) {
            if (emptyBottle.stores?.[posStoreId] !== undefined) {
              await updateStoreItemQuantity(emptyBottle.id, posStoreId, -pi.newQty);
              await createInterStoreTransfer({
                fromStoreId: posStoreId,
                toStoreId: prodStoreId,
                itemId: emptyBottle.id,
                quantity: pi.newQty,
                reason: "production",
                referenceId: batchId,
              });
            } else {
              await updateInventoryProductionStock(emptyBottle.id, emptyBottle.productionStock - pi.newQty);
            }
          }
        }
      }
    }

    // Auto-create Credit invoices for customer allocations or single customer production
    if (batch.customerAllocations && batch.customerAllocations.length > 0) {
      for (const allocation of batch.customerAllocations) {
        const allocationSaleLineItems: SaleLineItem[] = [];
        
        for (const pi of allocation.producedItems) {
          const item = items.find(i => i.id === pi.itemId);
          if (!item) continue;
          
          if (pi.newPackQty && pi.newPackQty > 0) {
            const packSize = getPackSize(item.name);
            const packPrice = (item as { customerOrderPrice?: number }).customerOrderPrice
              ?? ((item.wholesalePrice ?? item.retailPrice ?? item.price) * packSize);
            allocationSaleLineItems.push({
              itemId: item.id,
              itemName: item.name,
              quantity: pi.newPackQty,
              price: packPrice,
              saleKind: "wholesale",
              skipInventory: true,
            });
          } else if (pi.newQty > 0) {
            const unitPrice = item.wholesalePrice ?? item.retailPrice ?? item.price;
            allocationSaleLineItems.push({
              itemId: item.id,
              itemName: item.name,
              quantity: pi.newQty,
              price: unitPrice,
              saleKind: "wholesale",
              skipInventory: true,
            });
          }
        }
        
        if (allocationSaleLineItems.length > 0) {
          const total = allocationSaleLineItems.reduce((sum, li) => sum + li.quantity * li.price, 0);
          await createRetailSale({
            customerId: allocation.customerId,
            items: allocationSaleLineItems,
            total,
            paymentMethod: "Credit",
            status: "Pending",
          });
          const linesSummary = allocationSaleLineItems
            .map(li => `${li.quantity}× ${li.itemName}`)
            .join(", ");
          await createOrderRecord({
            customerId: allocation.customerId,
            customer: allocation.customerName ?? "Customer",
            type: "Production order",
            volume: linesSummary,
            amount: total,
            paidAmount: 0,
            notes: `Batch ${batch.batchNumber}${batch.operator ? " · Operator: " + batch.operator : ""}`,
            status: "Pending delivery",
            due: new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
          });
        }
      }
    } else if (isCustomerBatch && saleLineItems.length > 0) {
      const total = saleLineItems.reduce((sum, li) => sum + li.quantity * li.price, 0);
      // 1. Create retail sale (for accounting/analytics)
      await createRetailSale({
        customerId: batch.customerId,
        items: saleLineItems,
        total,
        paymentMethod: "Credit",
        status: "Pending",
      });
      // 2. Create order record so it appears in Customer Portal with invoice + settle
      const linesSummary = saleLineItems
        .map(li => `${li.quantity}× ${li.itemName}`)
        .join(", ");
      await createOrderRecord({
        customerId: batch.customerId,
        customer: batch.customerName ?? batch.customerId ?? "Customer",
        type: "Production order",
        volume: linesSummary,
        amount: total,
        paidAmount: 0,
        notes: `Batch ${batch.batchNumber}${batch.operator ? " · Operator: " + batch.operator : ""}`,
        status: "Pending delivery",
        due: new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
      });
    }
    return; // done — skip legacy code below
  }

  // ─── LEGACY hardcoded fields (backward compat) ──────────────────────────────
  const isKabson = (name: string) => name.toLowerCase().includes("kabson water");
  const bottle20LItem = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("20l"));
  const bottle10LItem = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("10l"));
  const bottle5LItem  = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("5l"));
  const bottle1LItem  = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("1l") && !i.name.toLowerCase().includes("10l") && !i.name.toLowerCase().includes("20l"));
  const bottle500mlItem = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("500ml"));

  const addToStore = async (item: InventoryItem, qty: number) => {
    if (item.stores?.[prodStoreId] !== undefined) {
      await updateStoreItemQuantity(item.id, prodStoreId, qty);
    } else {
      await updateInventoryStock(item.id, item.stock + qty);
    }
  };
  const deductEmpty = async (sizeStr: string, qty: number) => {
    const emptyItem = items.find(i => i.name.toLowerCase().includes("empty") && i.name.toLowerCase().includes(sizeStr));
    if (!emptyItem || qty <= 0) return;
    if (emptyItem.stores?.[posStoreId] !== undefined) {
      await updateStoreItemQuantity(emptyItem.id, posStoreId, -qty);
      await createInterStoreTransfer({ fromStoreId: posStoreId, toStoreId: prodStoreId, itemId: emptyItem.id, quantity: qty, reason: "production", referenceId: batchId });
    } else {
      await updateInventoryProductionStock(emptyItem.id, emptyItem.productionStock - qty);
    }
  };

  if (bottle20LItem && (batch.bottled20L ?? 0) > 0)  { await addToStore(bottle20LItem, batch.bottled20L!);  await deductEmpty("20l", batch.bottled20L!); }
  if (bottle10LItem && (batch.bottled10L ?? 0) > 0)  { await addToStore(bottle10LItem, batch.bottled10L!);  await deductEmpty("10l", batch.bottled10L!); }
  if (bottle5LItem  && (batch.bottled5L  ?? 0) > 0)  { await addToStore(bottle5LItem,  batch.bottled5L!);   await deductEmpty("5l",  batch.bottled5L!);  }
  if (bottle1LItem  && (batch.bottled1L  ?? 0) > 0)  { await addToStore(bottle1LItem,  batch.bottled1L!);   await deductEmpty("1l",  batch.bottled1L!);  }
  if (bottle500mlItem && (batch.bottled500ml ?? 0) > 0) { await addToStore(bottle500mlItem, batch.bottled500ml!); await deductEmpty("500ml", batch.bottled500ml!); }
}

export function subscribeToProduction(callback: (batches: ProductionBatch[]) => void) {
  return onSnapshot(
    query(productionRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductionBatch, "id">) })));
    }
  );
}


export function subscribeToUsers(callback: (users: UserRecord[]) => void) {
  return onSnapshot(
    query(usersRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as UserRecord) })));
    }
  );
}

// STORE CONFIGURATION
export type StoreConfig = {
  storeName: string;
  city: string;
  phone: string;
  email: string;
  businessRegistration: string;
  taxPin: string;
  bankAccount: string;
  bankName: string;
  createdAt: string;
  updatedAt: string;
};

const configRef = collection(db, "storeConfig");

export async function getStoreConfig(): Promise<StoreConfig | null> {
  const snapshot = await getDocs(configRef);
  if (snapshot.docs.length === 0) return null;
  return snapshot.docs[0].data() as StoreConfig;
}

export async function updateStoreConfig(config: Partial<Omit<StoreConfig, "createdAt" | "updatedAt">>) {
  const snapshot = await getDocs(configRef);
  if (snapshot.docs.length === 0) {
    await addDoc(configRef, {
      ...config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    await updateDoc(doc(configRef, snapshot.docs[0].id), {
      ...config,
      updatedAt: new Date().toISOString(),
    });
  }
}

// MULTI-STORE MANAGEMENT
export type Store = {
  id: string;
  name: string;
  location: string;
  type: "retail" | "warehouse" | "production";
  isActive: boolean;
  createdAt: string;
};

export type InterStoreTransfer = {
  id: string;
  fromStoreId: string;
  toStoreId: string;
  itemId: string;
  quantity: number;
  reason: "production" | "supplier_receipt" | "manual_transfer" | "sales";
  referenceId?: string; // batchId or purchase order ID
  createdAt: string;
};

const storesRef = collection(db, "stores");
const transfersRef = collection(db, "interStoreTransfers");

export async function getOrCreateDefaultStores() {
  const snapshot = await getDocs(storesRef);
  if (snapshot.docs.length === 0) {
    const posStore = await addDoc(storesRef, {
      name: "Main POS",
      location: "Retail Counter",
      type: "retail",
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    const prodStore = await addDoc(storesRef, {
      name: "Production Floor",
      location: "Production",
      type: "production",
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    return { posStoreId: posStore.id, prodStoreId: prodStore.id };
  }
  const docs = snapshot.docs;
  const posStore = docs.find(d => (d.data() as Store).type === "retail");
  const prodStore = docs.find(d => (d.data() as Store).type === "production");
  return {
    posStoreId: posStore?.id || docs[0].id,
    prodStoreId: prodStore?.id || docs[1]?.id || docs[0].id
  };
}

export function subscribeToStores(callback: (stores: Store[]) => void) {
  return onSnapshot(
    query(storesRef, orderBy("createdAt", "asc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Store, "id">),
        }))
      );
    }
  );
}

export async function createStore(store: Omit<Store, "id" | "createdAt">) {
  await addDoc(storesRef, { ...store, createdAt: new Date().toISOString() });
}

export async function createInterStoreTransfer(transfer: Omit<InterStoreTransfer, "id" | "createdAt">) {
  await addDoc(transfersRef, { ...transfer, createdAt: new Date().toISOString() });
}

export function subscribeToTransfers(callback: (transfers: InterStoreTransfer[]) => void) {
  return onSnapshot(
    query(transfersRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<InterStoreTransfer, "id">),
        }))
      );
    }
  );
}

export async function getItemQuantityAtStore(itemId: string, storeId: string): Promise<number> {
  const snap = await getDoc(doc(inventoryRef, itemId));
  if (!snap.exists()) return 0;
  const item = snap.data() as InventoryItem;
  return item.stores?.[storeId] || 0;
}

export async function updateStoreItemQuantity(itemId: string, storeId: string, change: number) {
  const snap = await getDoc(doc(inventoryRef, itemId));
  if (!snap.exists()) return;
  const item = snap.data() as InventoryItem;
  const current = item.stores?.[storeId] || 0;
  const newQuantity = Math.max(0, current + change);

  const updatedStores = { ...item.stores, [storeId]: newQuantity };
  await updateDoc(doc(inventoryRef, itemId), { stores: updatedStores });
}

// SHOP CATALOG (public-facing products)
const shopProductsRef = collection(db, "products");

export function subscribeToShopProducts(callback: (products: Product[]) => void) {
  return onSnapshot(query(shopProductsRef, orderBy("name", "asc")), (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Product, "id">),
      }))
    );
  });
}

export async function createShopProduct(input: Omit<Product, "id">) {
  await addDoc(shopProductsRef, {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function updateShopProduct(productId: string, updates: Partial<Omit<Product, "id">>) {
  await updateDoc(doc(shopProductsRef, productId), updates);
}

export async function deleteShopProduct(productId: string) {
  await deleteDoc(doc(shopProductsRef, productId));
}

export async function seedShopProductsIfEmpty(seed: Omit<Product, "id">[]) {
  const snapshot = await getDocs(shopProductsRef);
  if (snapshot.docs.length > 0) return;
  await Promise.all(
    seed.map((product) =>
      addDoc(shopProductsRef, { ...product, createdAt: new Date().toISOString() })
    )
  );
}

// STOCK TAKE HISTORY
const stockTakesRef = collection(db, "stockTakes");

export async function createStockTakeRecord(input: Omit<StockTakeRecord, "id" | "createdAt">) {
  await addDoc(stockTakesRef, {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToStockTakes(callback: (records: StockTakeRecord[]) => void) {
  return onSnapshot(
    query(stockTakesRef, orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<StockTakeRecord, "id">),
        }))
      );
    }
  );
}

// ── ADD ITEM TO STORE ─────────────────────────────────────────
// Sets initial quantity of an inventory item in a specific store
export async function addItemToStore(itemId: string, storeId: string, qty: number) {
  const snap = await getDoc(doc(inventoryRef, itemId));
  if (!snap.exists()) return;
  const item = snap.data() as InventoryItem;
  const current = item.stores?.[storeId] ?? 0;
  const updatedStores = { ...(item.stores ?? {}), [storeId]: current + qty };
  await updateDoc(doc(inventoryRef, itemId), { stores: updatedStores });
}

// ── STOCK TAKE helpers ────────────────────────────────────────
export type StockTakeLine = {
  itemId: string;
  itemName: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
};
// Alias so inventory page can use either name
export type StockTake = StockTakeRecord;
export const createStockTake = createStockTakeRecord;

export async function updateStockTake(id: string, updates: Partial<StockTakeRecord>) {
  await updateDoc(doc(stockTakesRef, id), updates);
}

export async function approveStockTake(id: string, lines: StockTakeLine[]) {
  for (const line of lines) {
    if (line.variance !== 0) {
      await updateInventoryStock(line.itemId, line.actualQty);
    }
  }
  await updateDoc(doc(stockTakesRef, id), { status: "Approved" });
}
