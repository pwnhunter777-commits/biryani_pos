export interface CatalogItem {
  id: string;
  name: string;
  price: number; // Fixed selling price
  createdAt: number;
  updatedAt: number;
}

export interface BillItemSnapshot {
  itemId: string;
  name: string; // Snapshot of item name at time of billing
  unitPrice: number; // Snapshot of unit price at time of billing
  quantity: number;
  lineTotal: number; // unitPrice * quantity
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
