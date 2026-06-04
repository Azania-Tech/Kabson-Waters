import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  getDocs,
  where,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db } from "./firebase";

export type CustomerOrderRecord = {
  id: string;
  customer: string;
  type: string;
  volume: string;
  status: string;
  due: string;
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
  price: number;
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

export type RetailSale = {
  id: string;
  customerId?: string;
  items: { itemId: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

const ordersRef = collection(db, "orders");
const suppliersRef = collection(db, "suppliers");
const purchaseOrdersRef = collection(db, "purchaseOrders");
const transactionsRef = collection(db, "transactions");
const inventoryRef = collection(db, "inventory");
const customersRef = collection(db, "customers");
const salesRef = collection(db, "sales");

export async function createOrderRecord(input: Omit<CustomerOrderRecord, "id" | "createdAt">) {
  await addDoc(ordersRef, {
    ...input,
    createdAt: new Date().toISOString(),
  });
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

export async function updateInventoryItem(itemId: string, updates: Partial<Pick<InventoryItem, "stock" | "productionStock" | "price" | "reorderPoint">>) {
  await updateDoc(doc(inventoryRef, itemId), updates);
}

// CUSTOMER FUNCTIONS
export async function createCustomerProfile(input: Omit<CustomerProfile, "id" | "createdAt">) {
  await addDoc(customersRef, {
    ...input,
    createdAt: new Date().toISOString(),
  });
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

  // Create accounting transaction for the sale
  const isCredit = input.paymentMethod === "Credit";
  await createAccountingTransactionRecord({
    date: new Date().toISOString().split("T")[0],
    account: `${input.paymentMethod} sales`,
    amount: input.total.toString(),
    status: isCredit ? "Pending" : "Completed",
    type: "Revenue",
    category: isCredit ? "Wholesale" : "Retail Sales",
    taxRate: 16,
    note: `${input.paymentMethod} sale of KES ${input.total}${input.customerId ? " to customer" : ""}`,
  });
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

// ORDER STATUS
export async function updateOrderStatus(orderId: string, status: string) {
  await updateDoc(doc(ordersRef, orderId), { status });
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
export type ProductionBatch = {
  id: string;
  batchNumber: string;
  rawWaterLitres: number;
  treatedWaterLitres: number;
  bottled20L: number;
  bottled10L: number;
  bottled5L: number;
  bottled1L: number;
  bottled500ml: number;
  wasteLitres: number;
  startMeter: number;
  endMeter: number;
  expectedEndMeter: number;
  variance: number;
  status: "In progress" | "Completed" | "Quality check" | "Rejected";
  operator: string;
  notes: string;
  sourceStoreId?: string; // Which store to deduct raw materials from
  startedAt: string;
  completedAt?: string;
  createdAt: string;
};

const productionRef = collection(db, "production");

export async function createProductionBatch(input: Omit<ProductionBatch, "id" | "createdAt">) {
  await addDoc(productionRef, { ...input, createdAt: new Date().toISOString() });
}

export async function updateProductionBatch(batchId: string, updates: Partial<ProductionBatch>) {
  await updateDoc(doc(productionRef, batchId), updates);
}

export async function completeProductionBatch(batchId: string, batch: ProductionBatch) {
  // 1. Mark batch as completed
  await updateProductionBatch(batchId, {
    status: "Completed",
    completedAt: new Date().toISOString()
  });

  // Get default stores if not using multi-store
  const { posStoreId, prodStoreId } = await getOrCreateDefaultStores();
  const sourceStoreId = batch.sourceStoreId || prodStoreId;

  // 2. Adjust inventory
  const snapshot = await getDocs(inventoryRef);
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<InventoryItem, "id"> }));

  const isKabson = (name: string) => name.toLowerCase().includes("kabson water");
  const treatedWaterItem = items.find(i => i.name.toLowerCase().includes("treated water") && i.category === "Water");
  const bottle20LItem = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("20l"));
  const bottle10LItem = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("10l"));
  const bottle5LItem = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("5l"));
  const bottle1LItem = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("1l") && !i.name.toLowerCase().includes("10l") && !i.name.toLowerCase().includes("20l"));
  const bottle500mlItem = items.find(i => isKabson(i.name) && i.name.toLowerCase().includes("500ml"));

  const actualWaterUsed = batch.endMeter - batch.startMeter;

  // Decrease treated water from production stock
  if (treatedWaterItem) {
    await updateInventoryProductionStock(treatedWaterItem.id, treatedWaterItem.productionStock - actualWaterUsed);
  }

  // Add finished goods to main store (multi-store enabled)
  if (bottle20LItem && batch.bottled20L > 0) {
    if (bottle20LItem.stores?.[posStoreId] !== undefined) {
      await updateStoreItemQuantity(bottle20LItem.id, posStoreId, batch.bottled20L);
      await createInterStoreTransfer({
        fromStoreId: prodStoreId,
        toStoreId: posStoreId,
        itemId: bottle20LItem.id,
        quantity: batch.bottled20L,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryStock(bottle20LItem.id, bottle20LItem.stock + batch.bottled20L);
    }
  }
  if (bottle10LItem && batch.bottled10L > 0) {
    if (bottle10LItem.stores?.[posStoreId] !== undefined) {
      await updateStoreItemQuantity(bottle10LItem.id, posStoreId, batch.bottled10L);
      await createInterStoreTransfer({
        fromStoreId: prodStoreId,
        toStoreId: posStoreId,
        itemId: bottle10LItem.id,
        quantity: batch.bottled10L,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryStock(bottle10LItem.id, bottle10LItem.stock + batch.bottled10L);
    }
  }
  if (bottle5LItem && batch.bottled5L > 0) {
    if (bottle5LItem.stores?.[posStoreId] !== undefined) {
      await updateStoreItemQuantity(bottle5LItem.id, posStoreId, batch.bottled5L);
      await createInterStoreTransfer({
        fromStoreId: prodStoreId,
        toStoreId: posStoreId,
        itemId: bottle5LItem.id,
        quantity: batch.bottled5L,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryStock(bottle5LItem.id, bottle5LItem.stock + batch.bottled5L);
    }
  }
  if (bottle1LItem && batch.bottled1L > 0) {
    if (bottle1LItem.stores?.[posStoreId] !== undefined) {
      await updateStoreItemQuantity(bottle1LItem.id, posStoreId, batch.bottled1L);
      await createInterStoreTransfer({
        fromStoreId: prodStoreId,
        toStoreId: posStoreId,
        itemId: bottle1LItem.id,
        quantity: batch.bottled1L,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryStock(bottle1LItem.id, bottle1LItem.stock + batch.bottled1L);
    }
  }
  if (bottle500mlItem && batch.bottled500ml > 0) {
    if (bottle500mlItem.stores?.[posStoreId] !== undefined) {
      await updateStoreItemQuantity(bottle500mlItem.id, posStoreId, batch.bottled500ml);
      await createInterStoreTransfer({
        fromStoreId: prodStoreId,
        toStoreId: posStoreId,
        itemId: bottle500mlItem.id,
        quantity: batch.bottled500ml,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryStock(bottle500mlItem.id, bottle500mlItem.stock + batch.bottled500ml);
    }
  }

  // Deduct raw materials (empty bottles) from source store
  const empty20L = items.find(i => i.name.toLowerCase().includes("empty") && i.name.toLowerCase().includes("20l"));
  if (empty20L && batch.bottled20L > 0) {
    if (empty20L.stores?.[sourceStoreId] !== undefined) {
      await updateStoreItemQuantity(empty20L.id, sourceStoreId, -batch.bottled20L);
      await createInterStoreTransfer({
        fromStoreId: sourceStoreId,
        toStoreId: prodStoreId,
        itemId: empty20L.id,
        quantity: batch.bottled20L,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryProductionStock(empty20L.id, empty20L.productionStock - batch.bottled20L);
    }
  }
  const empty10L = items.find(i => i.name.toLowerCase().includes("empty") && i.name.toLowerCase().includes("10l"));
  if (empty10L && batch.bottled10L > 0) {
    if (empty10L.stores?.[sourceStoreId] !== undefined) {
      await updateStoreItemQuantity(empty10L.id, sourceStoreId, -batch.bottled10L);
      await createInterStoreTransfer({
        fromStoreId: sourceStoreId,
        toStoreId: prodStoreId,
        itemId: empty10L.id,
        quantity: batch.bottled10L,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryProductionStock(empty10L.id, empty10L.productionStock - batch.bottled10L);
    }
  }
  const empty5L = items.find(i => i.name.toLowerCase().includes("empty") && i.name.toLowerCase().includes("5l"));
  if (empty5L && batch.bottled5L > 0) {
    if (empty5L.stores?.[sourceStoreId] !== undefined) {
      await updateStoreItemQuantity(empty5L.id, sourceStoreId, -batch.bottled5L);
      await createInterStoreTransfer({
        fromStoreId: sourceStoreId,
        toStoreId: prodStoreId,
        itemId: empty5L.id,
        quantity: batch.bottled5L,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryProductionStock(empty5L.id, empty5L.productionStock - batch.bottled5L);
    }
  }
  const empty1L = items.find(i => i.name.toLowerCase().includes("empty") && i.name.toLowerCase().includes("1l") && !i.name.toLowerCase().includes("10l") && !i.name.toLowerCase().includes("20l"));
  if (empty1L && batch.bottled1L > 0) {
    if (empty1L.stores?.[sourceStoreId] !== undefined) {
      await updateStoreItemQuantity(empty1L.id, sourceStoreId, -batch.bottled1L);
      await createInterStoreTransfer({
        fromStoreId: sourceStoreId,
        toStoreId: prodStoreId,
        itemId: empty1L.id,
        quantity: batch.bottled1L,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryProductionStock(empty1L.id, empty1L.productionStock - batch.bottled1L);
    }
  }
  const empty500ml = items.find(i => i.name.toLowerCase().includes("empty") && i.name.toLowerCase().includes("500ml"));
  if (empty500ml && batch.bottled500ml > 0) {
    if (empty500ml.stores?.[sourceStoreId] !== undefined) {
      await updateStoreItemQuantity(empty500ml.id, sourceStoreId, -batch.bottled500ml);
      await createInterStoreTransfer({
        fromStoreId: sourceStoreId,
        toStoreId: prodStoreId,
        itemId: empty500ml.id,
        quantity: batch.bottled500ml,
        reason: "production",
        referenceId: batchId,
      });
    } else {
      await updateInventoryProductionStock(empty500ml.id, empty500ml.productionStock - batch.bottled500ml);
    }
  }
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
