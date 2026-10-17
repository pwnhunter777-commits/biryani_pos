import { CatalogItem, Bill, ShopSettings, BillItemSnapshot } from '../types';

const STORAGE_KEYS = {
  ITEMS: 'biryani_pos_catalog_items',
  BILLS: 'biryani_pos_saved_bills',
  SETTINGS: 'biryani_pos_shop_settings',
  LAST_BILL_SEQ: 'biryani_pos_last_bill_sequence',
  ACTIVE_SESSION: 'biryani_pos_active_session',
  LAST_RESET_DATE: 'biryani_pos_last_reset_date',
};

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: '', // Left unconfigured as instructed
  tagline: '',
  phone: '',
  address: '',
  footerNote: 'Thank you for your visit!',
  ownerPin: '8888',
  employeePin: '1234',
  paperWidth: '58mm',
};

// Simple event emitter for reactive updates across components
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying listener:', e);
    }
  });
}

// Helper to safely read from localStorage
function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

// Helper to safely write to localStorage
function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

// Catalog Items (Managed solely by Owner)
export function getCatalogItems(): CatalogItem[] {
  return safeGet<CatalogItem[]>(STORAGE_KEYS.ITEMS, []);
}

export function addCatalogItem(name: string, price: number): CatalogItem {
  const items = getCatalogItems();
  const newItem: CatalogItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim(),
    price: Number(price),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  safeSet(STORAGE_KEYS.ITEMS, [...items, newItem]);
  return newItem;
}

export function updateCatalogItem(id: string, name: string, price: number): boolean {
  const items = getCatalogItems();
  const index = items.findIndex((it) => it.id === id);
  if (index === -1) return false;

  const updated: CatalogItem = {
    ...items[index],
    name: name.trim(),
    price: Number(price),
    updatedAt: Date.now(),
  };

  const nextItems = [...items];
  nextItems[index] = updated;
  safeSet(STORAGE_KEYS.ITEMS, nextItems);
  return true;
}

export function deleteCatalogItem(id: string): boolean {
  const items = getCatalogItems();
  const filtered = items.filter((it) => it.id !== id);
  if (filtered.length === items.length) return false;
  safeSet(STORAGE_KEYS.ITEMS, filtered);
  return true;
}

// Saved Bills (Created only by Employee, Read-Only for Owner and Employee)
export function getSavedBills(): Bill[] {
  const bills = safeGet<Bill[]>(STORAGE_KEYS.BILLS, []);
  // Return sorted descending by timestamp
  return bills.sort((a, b) => b.timestamp - a.timestamp);
}

export function getBillById(id: string): Bill | undefined {
  const bills = getSavedBills();
  return bills.find((b) => b.id === id || b.billNumber.toLowerCase() === id.toLowerCase());
}

export function searchBills(query: string): Bill[] {
  const clean = query.trim().toLowerCase();
  const bills = getSavedBills();
  if (!clean) return bills;

  return bills.filter(
    (b) =>
      b.billNumber.toLowerCase().includes(clean) ||
      b.dateString.includes(clean) ||
      b.items.some((item) => item.name.toLowerCase().includes(clean))
  );
}

export function createAndSaveBill(
  itemsSnapshot: BillItemSnapshot[],
  employeePinUsed?: string
): Bill {
  if (!itemsSnapshot || itemsSnapshot.length === 0) {
    throw new Error('Cannot create a bill with zero items.');
  }

  // Calculate totals
  const totalAmount = itemsSnapshot.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalQuantity = itemsSnapshot.reduce((sum, item) => sum + item.quantity, 0);

  // Generate sequence number
  const lastSeq = safeGet<number>(STORAGE_KEYS.LAST_BILL_SEQ, 1000);
  const nextSeq = lastSeq + 1;
  safeSet(STORAGE_KEYS.LAST_BILL_SEQ, nextSeq);

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  
  const billNumber = `B-${nextSeq}`;
  const id = `bill_${now.getTime()}_${Math.random().toString(36).substring(2, 6)}`;

  const newBill: Bill = {
    id,
    billNumber,
    timestamp: now.getTime(),
    dateString,
    timeString,
    items: itemsSnapshot, // Immutable snapshot
    totalAmount,
    totalQuantity,
    employeePinUsed,
    printCount: 0,
  };

  const existingBills = safeGet<Bill[]>(STORAGE_KEYS.BILLS, []);
  safeSet(STORAGE_KEYS.BILLS, [newBill, ...existingBills]);

  return newBill;
}

export function incrementBillPrintCount(billId: string): void {
  const bills = safeGet<Bill[]>(STORAGE_KEYS.BILLS, []);
  const index = bills.findIndex((b) => b.id === billId);
  if (index !== -1) {
    bills[index].printCount = (bills[index].printCount || 0) + 1;
    bills[index].printedAt = Date.now();
    safeSet(STORAGE_KEYS.BILLS, [...bills]);
  }
}

// Shop Settings (Configured by Owner)
export function getShopSettings(): ShopSettings {
  return safeGet<ShopSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function updateShopSettings(updates: Partial<ShopSettings>): ShopSettings {
  const current = getShopSettings();
  const updated: ShopSettings = { ...current, ...updates };
  safeSet(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

// Sales Calculations based on Device's Local Date
export function getTodayDateString(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface TodaySalesSummary {
  billCount: number;
  totalSales: number;
  totalItemsSold: number;
}

export interface ItemSaleRecord {
  name: string;
  quantity: number;
  totalAmount: number;
  unitPrice: number;
}

export function getSalesSummaryForDate(targetDateString: string): TodaySalesSummary {
  const bills = getSavedBills().filter((b) => b.dateString === targetDateString);
  const billCount = bills.length;
  const totalSales = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalItemsSold = bills.reduce((sum, b) => sum + b.totalQuantity, 0);

  return {
    billCount,
    totalSales,
    totalItemsSold,
  };
}

export function getItemSalesReportForDate(targetDateString: string): ItemSaleRecord[] {
  const bills = getSavedBills().filter((b) => b.dateString === targetDateString);
  const map: Record<string, ItemSaleRecord> = {};

  for (const bill of bills) {
    for (const item of bill.items) {
      if (!map[item.name]) {
        map[item.name] = {
          name: item.name,
          quantity: 0,
          totalAmount: 0,
          unitPrice: item.unitPrice,
        };
      }
      map[item.name].quantity += item.quantity;
      map[item.name].totalAmount += item.lineTotal;
    }
  }

  return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
}

export function getAllTimeSalesSummary(): { billCount: number; totalSales: number } {
  const bills = getSavedBills();
  return {
    billCount: bills.length,
    totalSales: bills.reduce((sum, b) => sum + b.totalAmount, 0),
  };
}

// Session Persistence: Owner stays logged in across app reopens
export function getPersistedSession(): 'OWNER' | 'EMPLOYEE' | null {
  return safeGet<'OWNER' | 'EMPLOYEE' | null>(STORAGE_KEYS.ACTIVE_SESSION, null);
}

export function setPersistedSession(session: 'OWNER' | 'EMPLOYEE' | null): void {
  safeSet(STORAGE_KEYS.ACTIVE_SESSION, session);
}

// Daily Data Reset: Automatically clears all sales and billing data when a new calendar day begins
export function checkAndPerformDailyReset(): boolean {
  const today = getTodayDateString();
  const lastResetDate = safeGet<string | null>(STORAGE_KEYS.LAST_RESET_DATE, null);

  if (!lastResetDate) {
    safeSet(STORAGE_KEYS.LAST_RESET_DATE, today);
    return false;
  }

  if (lastResetDate !== today) {
    // A new day has started: clear all billing data
    safeSet(STORAGE_KEYS.BILLS, []);
    safeSet(STORAGE_KEYS.LAST_BILL_SEQ, 1000);
    safeSet(STORAGE_KEYS.LAST_RESET_DATE, today);
    notifyListeners();
    return true;
  }

  return false;
}

// Manual reset function
export function clearAllBillsData(): void {
  safeSet(STORAGE_KEYS.BILLS, []);
  safeSet(STORAGE_KEYS.LAST_BILL_SEQ, 1000);
  safeSet(STORAGE_KEYS.LAST_RESET_DATE, getTodayDateString());
  notifyListeners();
}
