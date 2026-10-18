export type ItemPricingType = 'fixed' | 'gram' | 'plate';

export interface GramPricing {
  p100g: number;
  p200g?: number;
  p250g?: number;
  p500g: number;
  p1kg: number;
}

export interface PlatePricing {
  plate1: number; // Normal / 1 plate
  plate2: number; // Two plate
  plate3: number; // Three plate
  plate4: number; // Four plate
}

export interface CatalogItem {
  id: string;
  name: string;
  price: number; // Base selling price (or fixed price)
  pricingType?: ItemPricingType; // 'fixed' | 'gram' | 'plate'
  gramPrices?: GramPricing;
  platePrices?: PlatePricing;
  weightKg?: number; // Base weight in KG per portion (e.g. 0.5 for 500g, 1.0 for 1kg)
  createdAt: number;
  updatedAt: number;
}

export interface BillItemSnapshot {
  itemId: string;
  name: string; // Snapshot of item name at time of billing
  unitPrice: number; // Snapshot of unit price at time of billing
  quantity: number;
  lineTotal: number; // unitPrice * quantity
  weightKg?: number; // Weight in KG per portion
  totalWeightKg?: number; // quantity * weightKg
  variantKey?: string;
  variantLabel?: string;
}

export interface Bill {
  id: string;
  billNumber: string; // Unique sequential or formatted bill number e.g. #1001 or B-20261017-001
  timestamp: number;
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm:ss
  items: BillItemSnapshot[];
  totalAmount: number;
  totalQuantity: number;
  employeePinUsed?: string;
  printedAt?: number;
  printCount: number;
}

export interface ShopSettings {
  shopName: string; // Empty by default (unconfigured) until owner sets it
  tagline?: string;
  phone?: string;
  address?: string;
  footerNote?: string;
  ownerPin: string; // Default: '8888'
  employeePin: string; // Default: '1234'
  paperWidth: '58mm' | '80mm';
  ownerWhatsApp?: string; // Optional Owner WhatsApp number for instant report sharing
}

export interface OwnerSharedDailyReport {
  id: string;
  dateString: string; // YYYY-MM-DD
  sharedAt: number; // timestamp
  sharedTime: string; // HH:mm:ss
  totalBills: number;
  totalSales: number;
  totalItemsSold: number;
  itemsBreakdown: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    weightKg?: number;
    totalWeightKg?: number;
  }[];
  employeePinUsed?: string;
  notes?: string;
}

export type ScreenState = 
  | 'OPENING_SCREEN'
  | 'OWNER_LOGIN'
  | 'OWNER_DASHBOARD'
  | 'EMPLOYEE_LOGIN'
  | 'EMPLOYEE_SECTION';

export type EmployeePage = 'BILLING' | 'HISTORY';

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
}

