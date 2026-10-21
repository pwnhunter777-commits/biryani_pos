import { CatalogItem, Bill, ShopSettings, BillItemSnapshot, OwnerSharedDailyReport, ItemPricingType, GramPricing, PlatePricing } from '../types';
import {
  saveCatalogItemToFirestore,
  deleteCatalogItemFromFirestore,
  clearAllCatalogItemsFromFirestore,
  saveBillToFirestore,
  saveShopSettingsToFirestore,
  saveDailyReportToFirestore,
  subscribeToFirestoreItems,
  subscribeToFirestoreBills,
  subscribeToFirestoreSettings,
  subscribeToFirestoreDailyReports,
  testConnection,
} from './firebase';

const STORAGE_KEYS = {
  ITEMS: 'biryani_pos_catalog_items',
  SETTINGS: 'biryani_pos_shop_settings',
  EMPLOYEE_PHONE_BILLS: 'biryani_pos_employee_phone_bills',
  LEGACY_BILLS: 'biryani_pos_saved_bills',
  DATABASE_SHARED_REPORTS: 'biryani_pos_db_shared_reports',
  LAST_BILL_SEQ: 'biryani_pos_last_bill_sequence',
  ACTIVE_SESSION: 'biryani_pos_active_session',
  LAST_DATABASE_RESET_DATE: 'biryani_pos_last_database_reset_date',
  LAST_THREE_DAY_RESET_TIME: 'biryani_pos_last_three_day_reset_time',
};

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: '',
  tagline: '',
  phone: '',
  address: '',
  footerNote: 'Thank you for your visit!',
  ownerPin: '8888',
  employeePin: '1234',
  paperWidth: '58mm',
  ownerWhatsApp: '',
};

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

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

// Default Chicken / Meat items matching shop setup and screenshot
export const DEFAULT_CHICKEN_CATALOG: CatalogItem[] = [
  {
    id: 'item_boneless',
    name: 'போன்லெஸ் (எலும்பில்லா)',
    price: 320,
    weightKg: 1,
    pricingType: 'gram',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'item_wings',
    name: 'விங்ஸ் (இறக்கை)',
    price: 200,
    weightKg: 1,
    pricingType: 'gram',
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
  },
  {
    id: 'item_liver',
    name: 'ஈரல்',
    price: 160,
    weightKg: 1,
    pricingType: 'gram',
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
  },
  {
    id: 'item_leg_boneless',
    name: 'லெக் போன்லெஸ்',
    price: 320,
    weightKg: 1,
    pricingType: 'gram',
    createdAt: 1700000003000,
    updatedAt: 1700000003000,
  },
  {
    id: 'item_broiler',
    name: 'பிராய்லர் கோழி',
    price: 180,
    weightKg: 1,
    pricingType: 'gram',
    createdAt: 1700000004000,
    updatedAt: 1700000004000,
  },
  {
    id: 'item_leg_piece',
    name: 'லெக் பீஸ்',
    price: 260,
    weightKg: 1,
    pricingType: 'gram',
    createdAt: 1700000005000,
    updatedAt: 1700000005000,
  },
  {
    id: 'item_country_chicken',
    name: 'நாட்டுக்கோழி',
    price: 450,
    weightKg: 1,
    pricingType: 'gram',
    createdAt: 1700000006000,
    updatedAt: 1700000006000,
  },
  {
    id: 'item_biryani',
    name: 'சிக்கன் பிரியாணி',
    price: 140,
    weightKg: 0.5,
    pricingType: 'fixed',
    createdAt: 1700000007000,
    updatedAt: 1700000007000,
  },
];

// ================= CATALOG ITEMS (Database) =================
export function getCatalogItems(): CatalogItem[] {
  const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
  if (raw === null) {
    safeSet(STORAGE_KEYS.ITEMS, DEFAULT_CHICKEN_CATALOG);
    return DEFAULT_CHICKEN_CATALOG;
  }
  try {
    return JSON.parse(raw) as CatalogItem[];
  } catch {
    return [];
  }
}

export function resetToDefaultChickenItems(): CatalogItem[] {
  safeSet(STORAGE_KEYS.ITEMS, DEFAULT_CHICKEN_CATALOG);
  DEFAULT_CHICKEN_CATALOG.forEach((item) => {
    saveCatalogItemToFirestore(item).catch(() => {});
  });
  return DEFAULT_CHICKEN_CATALOG;
}

export function clearAllCatalogItems(): void {
  safeSet(STORAGE_KEYS.ITEMS, []);
  clearAllCatalogItemsFromFirestore().catch((err) => {
    console.error('Failed to clear items from Firestore:', err);
  });
}

export function detectItemWeightKg(itemName: string, customWeight?: number): number {
  if (customWeight !== undefined && Number(customWeight) > 0) {
    return Number(customWeight);
  }
  const clean = (itemName || '').toLowerCase();
  
  // Explicit kg: e.g. "1 kg", "2.5kg", "5 kg"
  const kgMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo)/);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  // Fraction kg
  if (/1\/2\s*kg|half\s*kg|500\s*g|500\s*gm/.test(clean)) return 0.5;
  if (/1\/4\s*kg|quarter\s*kg|250\s*g|250\s*gm/.test(clean)) return 0.25;
  if (/3\/4\s*kg|750\s*g|750\s*gm/.test(clean)) return 0.75;
  if (/100\s*g|100\s*gm/.test(clean)) return 0.1;

  // Single standard biryani / rice dish is commonly 0.5 KG (500g)
  if (/biryani|briyani|rice|pulao|kuska|bucket/.test(clean)) {
    return 0.5;
  }

  // Default portion weight in kg
  return 0.5;
}

export function addCatalogItem(
  name: string,
  price: number,
  weightKg?: number,
  pricingType: ItemPricingType = 'fixed',
  gramPrices?: GramPricing,
  platePrices?: PlatePricing
): CatalogItem {
  const items = getCatalogItems();
  const detectedWeight = detectItemWeightKg(name, weightKg);
  const newItem: CatalogItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim(),
    price: Number(price),
    pricingType,
    gramPrices: pricingType === 'gram' ? gramPrices : undefined,
    platePrices: pricingType === 'plate' ? platePrices : undefined,
    weightKg: detectedWeight,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  safeSet(STORAGE_KEYS.ITEMS, [...items, newItem]);
  saveCatalogItemToFirestore(newItem).catch((err) => {
    console.error('Failed to sync new item to Firebase:', err);
  });
  return newItem;
}

export function updateCatalogItem(
  id: string,
  name: string,
  price: number,
  weightKg?: number,
  pricingType: ItemPricingType = 'fixed',
  gramPrices?: GramPricing,
  platePrices?: PlatePricing
): boolean {
  const items = getCatalogItems();
  const index = items.findIndex((it) => it.id === id);
  if (index === -1) return false;

  const detectedWeight = detectItemWeightKg(name, weightKg);
  const updated: CatalogItem = {
    ...items[index],
    name: name.trim(),
    price: Number(price),
    pricingType,
    gramPrices: pricingType === 'gram' ? gramPrices : undefined,
    platePrices: pricingType === 'plate' ? platePrices : undefined,
    weightKg: detectedWeight,
    updatedAt: Date.now(),
  };

  const nextItems = [...items];
  nextItems[index] = updated;
  safeSet(STORAGE_KEYS.ITEMS, nextItems);
  saveCatalogItemToFirestore(updated).catch((err) => {
    console.error('Failed to sync updated item to Firebase:', err);
  });
  return true;
}

export function deleteCatalogItem(id: string): boolean {
  const items = getCatalogItems();
  const filtered = items.filter((it) => it.id !== id);
  if (filtered.length === items.length) return false;
  safeSet(STORAGE_KEYS.ITEMS, filtered);
  deleteCatalogItemFromFirestore(id).catch((err) => {
    console.error('Failed to delete item from Firebase:', err);
  });
  return true;
}

// ================= EMPLOYEE PHONE LOCAL STORAGE =================
// All individual customer bills are saved strictly on the employee phone itself!
export function getEmployeePhoneBills(): Bill[] {
  let bills = safeGet<Bill[]>(STORAGE_KEYS.EMPLOYEE_PHONE_BILLS, []);
  if (bills.length === 0) {
    // Check legacy storage and migrate once
    const legacy = safeGet<Bill[]>(STORAGE_KEYS.LEGACY_BILLS, []);
    if (legacy.length > 0) {
      bills = legacy;
      safeSet(STORAGE_KEYS.EMPLOYEE_PHONE_BILLS, legacy);
    }
  }
  return bills.sort((a, b) => b.timestamp - a.timestamp);
}

// Alias for backwards-compatibility
export function getSavedBills(): Bill[] {
  return getEmployeePhoneBills();
}

export function getBillById(id: string): Bill | undefined {
  const bills = getEmployeePhoneBills();
  return bills.find((b) => b.id === id || b.billNumber.toLowerCase() === id.toLowerCase());
}

export function searchBills(query: string): Bill[] {
  const clean = query.trim().toLowerCase();
  const bills = getEmployeePhoneBills();
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

  const totalAmount = itemsSnapshot.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalQuantity = itemsSnapshot.reduce((sum, item) => sum + item.quantity, 0);

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
    items: itemsSnapshot,
    totalAmount,
    totalQuantity,
    employeePinUsed,
    printCount: 0,
  };

  // Save to Employee Phone Storage and sync to Firebase!
  const existingBills = safeGet<Bill[]>(STORAGE_KEYS.EMPLOYEE_PHONE_BILLS, []);
  safeSet(STORAGE_KEYS.EMPLOYEE_PHONE_BILLS, [newBill, ...existingBills]);
  saveBillToFirestore(newBill).catch((err) => {
    console.error('Failed to sync bill to Firebase:', err);
  });

  return newBill;
}

export function incrementBillPrintCount(billId: string): void {
  const bills = safeGet<Bill[]>(STORAGE_KEYS.EMPLOYEE_PHONE_BILLS, []);
  const index = bills.findIndex((b) => b.id === billId);
  if (index !== -1) {
    bills[index].printCount = (bills[index].printCount || 0) + 1;
    bills[index].printedAt = Date.now();
    safeSet(STORAGE_KEYS.EMPLOYEE_PHONE_BILLS, [...bills]);
    saveBillToFirestore(bills[index]).catch((err) => {
      console.error('Failed to sync print count to Firebase:', err);
    });
  }
}

// ================= DATABASE: OWNER SHARED DATA =================
// Only data explicitly shared to the owner is saved to the database.
// This database data is cleared automatically every day.
export function getOwnerSharedReports(): OwnerSharedDailyReport[] {
  return safeGet<OwnerSharedDailyReport[]>(STORAGE_KEYS.DATABASE_SHARED_REPORTS, []);
}

export function getOwnerSharedReportForDate(targetDateString: string): OwnerSharedDailyReport | undefined {
  const reports = getOwnerSharedReports();
  return reports.find((r) => r.dateString === targetDateString);
}

export function saveOwnerSharedDailyReport(
  reportData: {
    dateString: string;
    totalBills: number;
    totalSales: number;
    totalItemsSold: number;
    itemsBreakdown: {
      name: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
    }[];
    employeePinUsed?: string;
    notes?: string;
  }
): OwnerSharedDailyReport {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const sharedTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const report: OwnerSharedDailyReport = {
    id: `rep_${now.getTime()}_${Math.random().toString(36).substring(2, 6)}`,
    dateString: reportData.dateString,
    sharedAt: now.getTime(),
    sharedTime,
    totalBills: reportData.totalBills,
    totalSales: reportData.totalSales,
    totalItemsSold: reportData.totalItemsSold,
    itemsBreakdown: reportData.itemsBreakdown,
    employeePinUsed: reportData.employeePinUsed,
    notes: reportData.notes,
  };

  const existingReports = getOwnerSharedReports().filter((r) => r.dateString !== reportData.dateString);
  safeSet(STORAGE_KEYS.DATABASE_SHARED_REPORTS, [report, ...existingReports]);
  saveDailyReportToFirestore(report).catch((err) => {
    console.error('Failed to sync daily report to Firebase:', err);
  });

  return report;
}

// ================= SHOP SETTINGS =================
export function getShopSettings(): ShopSettings {
  return safeGet<ShopSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function updateShopSettings(updates: Partial<ShopSettings>): ShopSettings {
  const current = getShopSettings();
  const updated: ShopSettings = { ...current, ...updates };
  safeSet(STORAGE_KEYS.SETTINGS, updated);
  saveShopSettingsToFirestore(updated).catch((err) => {
    console.error('Failed to sync shop settings to Firebase:', err);
  });
  return updated;
}

// ================= SALES CALCULATIONS & REPORTING =================
export function getTodayDateString(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface TodaySalesSummary {
  billCount: number;
  totalSales: number;
  totalItemsSold: number;
  totalKgSold: number;
  isFromSharedReport?: boolean;
  sharedAtTime?: string;
}

export interface ItemSaleRecord {
  name: string;
  quantity: number;
  totalAmount: number;
  unitPrice: number;
  weightKg: number;
  totalWeightKg: number;
}

// Calculate sales for employee phone or fallback
export function getSalesSummaryForDate(targetDateString: string): TodaySalesSummary {
  const itemRecords = getItemSalesReportForDate(targetDateString);
  const totalKgSold = Number(itemRecords.reduce((sum, item) => sum + item.totalWeightKg, 0).toFixed(2));

  // Check if owner database has a shared report for this date
  const sharedReport = getOwnerSharedReportForDate(targetDateString);
  const bills = getEmployeePhoneBills().filter((b) => b.dateString === targetDateString);

  if (sharedReport && bills.length === 0) {
    return {
      billCount: sharedReport.totalBills,
      totalSales: sharedReport.totalSales,
      totalItemsSold: sharedReport.totalItemsSold,
      totalKgSold,
      isFromSharedReport: true,
      sharedAtTime: sharedReport.sharedTime,
    };
  }

  const billCount = bills.length;
  const totalSales = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalItemsSold = bills.reduce((sum, b) => sum + b.totalQuantity, 0);

  return {
    billCount,
    totalSales,
    totalItemsSold,
    totalKgSold,
    isFromSharedReport: Boolean(sharedReport),
    sharedAtTime: sharedReport?.sharedTime,
  };
}

export function getItemSalesReportForDate(targetDateString: string): ItemSaleRecord[] {
  const catalogItems = getCatalogItems();
  const catalogMap = new Map(catalogItems.map((ci) => [ci.name.toLowerCase().trim(), ci]));

  const sharedReport = getOwnerSharedReportForDate(targetDateString);
  const bills = getEmployeePhoneBills().filter((b) => b.dateString === targetDateString);

  if (sharedReport && bills.length === 0) {
    return sharedReport.itemsBreakdown.map((item) => {
      const catItem = catalogMap.get(item.name.toLowerCase().trim());
      const weightKg = item.weightKg || detectItemWeightKg(item.name, catItem?.weightKg);
      const totalWeightKg = item.totalWeightKg || Number((item.quantity * weightKg).toFixed(2));
      return {
        name: item.name,
        quantity: item.quantity,
        totalAmount: item.totalAmount,
        unitPrice: item.unitPrice,
        weightKg,
        totalWeightKg,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  const map: Record<string, ItemSaleRecord> = {};
  for (const bill of bills) {
    for (const item of bill.items) {
      if (!map[item.name]) {
        const catItem = catalogMap.get(item.name.toLowerCase().trim());
        const weightKg = item.weightKg || detectItemWeightKg(item.name, catItem?.weightKg);
        map[item.name] = {
          name: item.name,
          quantity: 0,
          totalAmount: 0,
          unitPrice: item.unitPrice,
          weightKg,
          totalWeightKg: 0,
        };
      }
      map[item.name].quantity += item.quantity;
      map[item.name].totalAmount += item.lineTotal;
      map[item.name].totalWeightKg = Number((map[item.name].quantity * map[item.name].weightKg).toFixed(2));
    }
  }

  return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
}

export function getAllTimeSalesSummary(): { billCount: number; totalSales: number } {
  const bills = getEmployeePhoneBills();
  return {
    billCount: bills.length,
    totalSales: bills.reduce((sum, b) => sum + b.totalAmount, 0),
  };
}

export interface DailySalesDataPoint {
  dateString: string;
  dayLabel: string;
  totalSales: number;
  billCount: number;
  isToday: boolean;
}

export function getLast7DaysSalesData(): DailySalesDataPoint[] {
  const points: DailySalesDataPoint[] = [];
  const now = new Date();
  const todayStr = getTodayDateString();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayLabel = dateStr === todayStr ? 'Today' : `${weekday} ${d.getDate()}`;

    const summary = getSalesSummaryForDate(dateStr);
    points.push({
      dateString: dateStr,
      dayLabel,
      totalSales: summary.totalSales,
      billCount: summary.billCount,
      isToday: dateStr === todayStr,
    });
  }

  return points;
}

// Session Persistence
export function getPersistedSession(): 'OWNER' | 'EMPLOYEE' | null {
  return safeGet<'OWNER' | 'EMPLOYEE' | null>(STORAGE_KEYS.ACTIVE_SESSION, null);
}

export function setPersistedSession(session: 'OWNER' | 'EMPLOYEE' | null): void {
  safeSet(STORAGE_KEYS.ACTIVE_SESSION, session);
}

// ================= 3-DAY AUTOMATIC DATA RESET =================
// Automatically backs up all data to Firebase and clears transaction data every 3 days.
export function checkAndPerformThreeDayReset(): boolean {
  const now = Date.now();
  let lastResetTime = safeGet<number>(STORAGE_KEYS.LAST_THREE_DAY_RESET_TIME, 0);

  if (!lastResetTime) {
    const legacyDate = safeGet<string | null>(STORAGE_KEYS.LAST_DATABASE_RESET_DATE, null);
    if (legacyDate) {
      lastResetTime = new Date(legacyDate).getTime() || now;
    } else {
      lastResetTime = now;
    }
    safeSet(STORAGE_KEYS.LAST_THREE_DAY_RESET_TIME, lastResetTime);
  }

  const elapsedMs = now - lastResetTime;
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  if (elapsedMs >= threeDaysMs) {
    // 3 days have passed: backup everything to Firebase first!
    syncAllDataToFirebase().catch((err) => {
      console.error('Backup to Firebase failed before 3-day clear:', err);
    });

    // Clear transactional bills & shared reports for a fresh 3-day cycle
    safeSet(STORAGE_KEYS.DATABASE_SHARED_REPORTS, []);
    safeSet(STORAGE_KEYS.EMPLOYEE_PHONE_BILLS, []);
    safeSet(STORAGE_KEYS.LAST_THREE_DAY_RESET_TIME, now);
    safeSet(STORAGE_KEYS.LAST_DATABASE_RESET_DATE, getTodayDateString());
    notifyListeners();
    return true;
  }

  return false;
}

// Backwards-compatibility alias
export function checkAndPerformDailyReset(): boolean {
  return checkAndPerformThreeDayReset();
}

// 3-Day cycle status info helper
export function getThreeDayResetInfo(): { daysElapsed: number; daysRemaining: number } {
  const now = Date.now();
  const lastResetTime = safeGet<number>(STORAGE_KEYS.LAST_THREE_DAY_RESET_TIME, now);
  const elapsedMs = Math.max(0, now - lastResetTime);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.floor(elapsedMs / oneDayMs) + 1;
  const daysRemaining = Math.max(0, 3 - Math.floor(elapsedMs / oneDayMs));
  return {
    daysElapsed: Math.min(3, Math.max(1, daysElapsed)),
    daysRemaining,
  };
}

// Explicit Owner / System clear of the database shared data
export function clearDatabaseDailyData(): void {
  // Sync to Firebase before clearing
  syncAllDataToFirebase().catch(() => {});
  safeSet(STORAGE_KEYS.DATABASE_SHARED_REPORTS, []);
  safeSet(STORAGE_KEYS.LAST_DATABASE_RESET_DATE, getTodayDateString());
  safeSet(STORAGE_KEYS.LAST_THREE_DAY_RESET_TIME, Date.now());
  notifyListeners();
}

// Helper to get count of bills stored on employee phone
export function getEmployeePhoneBillsCount(): number {
  return getEmployeePhoneBills().length;
}

// ================= FIREBASE CLOUD SYNC ENGINE =================

function safeSetWithoutNotify<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

let isFirebaseSyncInitialized = false;

export function initFirebaseSync(): void {
  if (isFirebaseSyncInitialized) return;
  isFirebaseSyncInitialized = true;

  // Test Firestore connection on boot
  testConnection().then((connected) => {
    if (connected) {
      console.log('Firebase Firestore is connected and ready to sync.');
    }
  }).catch(() => {});

  // 1. Initial push of local data to Firebase if any
  try {
    const localItems = getCatalogItems();
    if (localItems.length > 0) {
      localItems.forEach((item) => {
        saveCatalogItemToFirestore(item).catch(() => {});
      });
    }

    const localBills = getEmployeePhoneBills();
    if (localBills.length > 0) {
      localBills.forEach((bill) => {
        saveBillToFirestore(bill).catch(() => {});
      });
    }

    const localSettings = getShopSettings();
    if (localSettings.shopName) {
      saveShopSettingsToFirestore(localSettings).catch(() => {});
    }

    const localReports = getOwnerSharedReports();
    if (localReports.length > 0) {
      localReports.forEach((rep) => {
        saveDailyReportToFirestore(rep).catch(() => {});
      });
    }
  } catch (err) {
    console.error('Initial Firebase upload error:', err);
  }

  // 2. Real-time Listeners from Firebase Firestore
  try {
    subscribeToFirestoreItems((firestoreItems) => {
      if (firestoreItems && Array.isArray(firestoreItems) && firestoreItems.length > 0) {
        const local = getCatalogItems();
        const map = new Map(local.map((i) => [i.id, i]));
        firestoreItems.forEach((item) => {
          map.set(item.id, item);
        });
        safeSetWithoutNotify(STORAGE_KEYS.ITEMS, Array.from(map.values()));
        notifyListeners();
      }
    });

    subscribeToFirestoreBills((firestoreBills) => {
      if (firestoreBills && Array.isArray(firestoreBills) && firestoreBills.length > 0) {
        const local = getEmployeePhoneBills();
        const map = new Map(local.map((b) => [b.id, b]));
        firestoreBills.forEach((b) => {
          map.set(b.id, b);
        });
        const sorted = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        safeSetWithoutNotify(STORAGE_KEYS.EMPLOYEE_PHONE_BILLS, sorted);
        notifyListeners();
      }
    });

    subscribeToFirestoreSettings((firestoreSettings) => {
      if (firestoreSettings && firestoreSettings.shopName) {
        safeSetWithoutNotify(STORAGE_KEYS.SETTINGS, firestoreSettings);
        notifyListeners();
      }
    });

    subscribeToFirestoreDailyReports((firestoreReports) => {
      if (firestoreReports && Array.isArray(firestoreReports) && firestoreReports.length > 0) {
        const local = getOwnerSharedReports();
        const map = new Map(local.map((r) => [r.id, r]));
        firestoreReports.forEach((r) => {
          map.set(r.id, r);
        });
        safeSetWithoutNotify(STORAGE_KEYS.DATABASE_SHARED_REPORTS, Array.from(map.values()));
        notifyListeners();
      }
    });
  } catch (err) {
    console.error('Error attaching Firebase listeners:', err);
  }
}

// Explicit manual trigger to force upload all local records to Firebase
export async function syncAllDataToFirebase(): Promise<{ itemsCount: number; billsCount: number }> {
  const items = getCatalogItems();
  const bills = getEmployeePhoneBills();
  const settings = getShopSettings();
  const reports = getOwnerSharedReports();

  await Promise.allSettled([
    ...items.map((it) => saveCatalogItemToFirestore(it)),
    ...bills.map((b) => saveBillToFirestore(b)),
    saveShopSettingsToFirestore(settings),
    ...reports.map((r) => saveDailyReportToFirestore(r)),
  ]);

  return {
    itemsCount: items.length,
    billsCount: bills.length,
  };
}
