import React, { useState, useEffect } from 'react';
import {
  getCatalogItems,
  getSavedBills,
  createAndSaveBill,
  getShopSettings,
  subscribeToStore,
  searchBills,
  incrementBillPrintCount,
  updateCatalogItemPrice,
} from '../db/storage';
import { CatalogItem, ShopSettings, Bill, BillItemSnapshot } from '../types';
import {
  Printer,
  Receipt,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Bluetooth,
  LogOut,
  RefreshCw,
  Eye,
  Trash2,
  Clock,
  ShoppingBag,
  X,
  Share2,
  Smartphone,
  Check,
  Scale,
  Utensils,
  Cloud,
  Pencil,
} from 'lucide-react';
import { ReceiptView } from './ReceiptView';
import { BluetoothModal } from './BluetoothModal';
import { ShareToOwnerModal } from './ShareToOwnerModal';
import { ItemModal } from './ItemModal';
import {
  printBillViaBluetooth,
  subscribeToBluetoothState,
  checkBluetoothAvailability,
} from '../utils/bluetoothPrinter';
import { Language, translations } from '../utils/translations';
import { LanguageToggle } from './LanguageToggle';
import { AppLogo } from './AppLogo';
import { PinPad } from './PinPad';

interface PricePromptState {
  item: CatalogItem;
  variantKey: string;
  displayName: string;
  defaultPrice: number;
  weightKg: number;
  variantLabel?: string;
  cartKey: string;
  isAlreadyInCart: boolean;
  currentQty: number;
}

interface EmployeeViewProps {
  onLogout: () => void;
  employeePin: string;
  lang?: Language;
  onLanguageChange?: (newLang: Language) => void;
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({
  onLogout,
  employeePin,
  lang = 'en',
  onLanguageChange,
}) => {
  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';

  // Exactly Two Main Pages:
  // Page 1: BILLING ('Items List and Print Bill')
  // Page 2: HISTORY ('Bill History')
  const [currentPage, setCurrentPage] = useState<'BILLING' | 'HISTORY'>('BILLING');

  // Data states
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(getShopSettings());
  const [savedBills, setSavedBills] = useState<Bill[]>([]);

  // Page 1: Current Bill Cart State (Cart Key -> CartEntry)
  const [cartMap, setCartMap] = useState<Record<string, {
    cartKey: string;
    itemId: string;
    itemName: string;
    displayName: string;
    unitPrice: number;
    weightKg: number;
    quantity: number;
    lineTotal: number;
    variantKey?: string;
    variantLabel?: string;
  }>>({});

  // Add Item modal state (for employees to quickly add items too)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  
  // Confirmed & Saved Bill Modal / Print Dialog
  const [confirmedBill, setConfirmedBill] = useState<Bill | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatusMessage, setPrintStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [billSaveError, setBillSaveError] = useState<string | null>(null);

  // Price Prompt Modal State: pops up when food button is clicked to ask for price
  const [pricePrompt, setPricePrompt] = useState<PricePromptState | null>(null);
  const [pricePromptValue, setPricePromptValue] = useState<string>('');
  const [pricePromptQty, setPricePromptQty] = useState<number>(1);

  // Quick Edit Price Modal State for Employee
  const [quickEditItem, setQuickEditItem] = useState<{ id: string; name: string; currentPrice: number } | null>(null);
  const [quickEditPriceValue, setQuickEditPriceValue] = useState('');

  // Page 2: History Search & Selected Bill for Details / Reprint
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedHistoryBill, setSelectedHistoryBill] = useState<Bill | null>(null);

  // Bluetooth Modal State
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLogoutPinModalOpen, setIsLogoutPinModalOpen] = useState(false);
  const [bluetoothState, setBluetoothState] = useState({
    isConnected: false,
    deviceName: null as string | null,
    isSupported: checkBluetoothAvailability(),
  });

  // Load / Reload store
  const reloadData = () => {
    setItems(getCatalogItems());
    setSettings(getShopSettings());
    setSavedBills(getSavedBills());
  };

  useEffect(() => {
    reloadData();
    const unsubStore = subscribeToStore(reloadData);
    const unsubBt = subscribeToBluetoothState((bt) => {
      setBluetoothState({
        isConnected: bt.isConnected,
        deviceName: bt.deviceName,
        isSupported: bt.isSupported,
      });
    });
    return () => {
      unsubStore();
      unsubBt();
    };
  }, []);

  // Cart operations (with Gram portions and Plate servings support)
  const handleAddPortion = (item: CatalogItem, variantKey: string = 'fixed') => {
    setCartMap((prev) => {
      const next = { ...prev };
      const cartKey = `${item.id}_${variantKey}`;
      const existing = next[cartKey];

      let unitPrice = item.price;
      let weightKg = item.weightKg || 0.5;
      let variantLabel = '';
      let displayName = item.name;

      if (item.pricingType === 'gram') {
        if (variantKey === '100g') {
          unitPrice = item.gramPrices?.p100g ?? item.price;
          weightKg = 0.1;
          variantLabel = '100gm';
          displayName = `${item.name} (100gm)`;
        } else if (variantKey === '250g') {
          unitPrice = item.gramPrices?.p250g ?? (item.gramPrices?.p200g ? Math.round(item.gramPrices.p200g * 1.25) : Math.round(item.price * 2.5));
          weightKg = 0.25;
          variantLabel = '250gm';
          displayName = `${item.name} (250gm)`;
        } else if (variantKey === '200g') {
          unitPrice = item.gramPrices?.p200g ?? Math.round(item.price * 2);
          weightKg = 0.2;
          variantLabel = '200gm';
          displayName = `${item.name} (200gm)`;
        } else if (variantKey === '500g') {
          unitPrice = item.gramPrices?.p500g ?? Math.round(item.price * 5);
          weightKg = 0.5;
          variantLabel = '500gm';
          displayName = `${item.name} (500gm)`;
        } else if (variantKey === '1kg') {
          unitPrice = item.gramPrices?.p1kg ?? Math.round(item.price * 10);
          weightKg = 1.0;
          variantLabel = '1kg';
          displayName = `${item.name} (1kg)`;
        }
      } else if (item.pricingType === 'plate') {
        const pLabel1 = '1 Plate';
        const pLabel2 = '2 Plate';
        const pLabel3 = '3 Plate';
        const pLabel4 = '4 Plate';

        if (variantKey === 'plate1') {
          unitPrice = item.platePrices?.plate1 ?? item.price;
          weightKg = 0.5;
          variantLabel = pLabel1;
          displayName = `${item.name} (${pLabel1})`;
        } else if (variantKey === 'plate2') {
          unitPrice = item.platePrices?.plate2 ?? item.price * 2;
          weightKg = 1.0;
          variantLabel = pLabel2;
          displayName = `${item.name} (${pLabel2})`;
        } else if (variantKey === 'plate3') {
          unitPrice = item.platePrices?.plate3 ?? item.price * 3;
          weightKg = 1.5;
          variantLabel = pLabel3;
          displayName = `${item.name} (${pLabel3})`;
        } else if (variantKey === 'plate4') {
          unitPrice = item.platePrices?.plate4 ?? item.price * 4;
          weightKg = 2.0;
          variantLabel = pLabel4;
          displayName = `${item.name} (${pLabel4})`;
        }
      }

      const newQty = (existing?.quantity || 0) + 1;
      next[cartKey] = {
        cartKey,
        itemId: item.id,
        itemName: item.name,
        displayName,
        unitPrice,
        weightKg,
        quantity: newQty,
        lineTotal: newQty * unitPrice,
        variantKey,
        variantLabel,
      };

      return next;
    });
  };

  // Prompt price when food button is clicked:
  // "if i click this a pop pu must come and ask for the price"
  const handlePromptItemPrice = (item: CatalogItem, variantKey: string = 'fixed') => {
    let unitPrice = item.price;
    let weightKg = item.weightKg || 0.5;
    let variantLabel = isTa ? 'நிலையான விலை' : 'Fixed';
    let displayName = item.name;

    if (item.pricingType === 'gram') {
      if (variantKey === '100g') {
        unitPrice = item.gramPrices?.p100g ?? item.price;
        weightKg = 0.1;
        variantLabel = '100gm';
        displayName = `${item.name} (100gm)`;
      } else if (variantKey === '250g') {
        unitPrice = item.gramPrices?.p250g ?? (item.gramPrices?.p200g ? Math.round(item.gramPrices.p200g * 1.25) : Math.round(item.price * 2.5));
        weightKg = 0.25;
        variantLabel = '250gm';
        displayName = `${item.name} (250gm)`;
      } else if (variantKey === '200g') {
        unitPrice = item.gramPrices?.p200g ?? Math.round(item.price * 2);
        weightKg = 0.2;
        variantLabel = '200gm';
        displayName = `${item.name} (200gm)`;
      } else if (variantKey === '500g') {
        unitPrice = item.gramPrices?.p500g ?? Math.round(item.price * 5);
        weightKg = 0.5;
        variantLabel = '500gm';
        displayName = `${item.name} (500gm)`;
      } else if (variantKey === '1kg') {
        unitPrice = item.gramPrices?.p1kg ?? Math.round(item.price * 10);
        weightKg = 1.0;
        variantLabel = '1kg';
        displayName = `${item.name} (1kg)`;
      }
    } else if (item.pricingType === 'plate') {
      if (variantKey === 'plate1') {
        unitPrice = item.platePrices?.plate1 ?? item.price;
        weightKg = 0.5;
        variantLabel = '1 Plate';
        displayName = `${item.name} (1 Plate)`;
      } else if (variantKey === 'plate2') {
        unitPrice = item.platePrices?.plate2 ?? item.price * 2;
        weightKg = 1.0;
        variantLabel = '2 Plate';
        displayName = `${item.name} (2 Plate)`;
      } else if (variantKey === 'plate3') {
        unitPrice = item.platePrices?.plate3 ?? item.price * 3;
        weightKg = 1.5;
        variantLabel = '3 Plate';
        displayName = `${item.name} (3 Plate)`;
      } else if (variantKey === 'plate4') {
        unitPrice = item.platePrices?.plate4 ?? item.price * 4;
        weightKg = 2.0;
        variantLabel = '4 Plate';
        displayName = `${item.name} (4 Plate)`;
      }
    }

    const cartKey = `${item.id}_${variantKey}`;
    const altFixedKey = variantKey === 'fixed' ? item.id : null;
    const existing = cartMap[cartKey] || (altFixedKey ? cartMap[altFixedKey] : undefined);
    const isAlreadyInCart = !!(existing && existing.quantity > 0);

    const initialPrice = existing ? existing.unitPrice : unitPrice;
    const initialQty = existing ? existing.quantity : 1;

    setPricePrompt({
      item,
      variantKey,
      displayName,
      defaultPrice: unitPrice,
      weightKg,
      variantLabel,
      cartKey,
      isAlreadyInCart,
      currentQty: initialQty,
    });
    setPricePromptValue(initialPrice.toString());
    setPricePromptQty(initialQty);
  };

  const handleConfirmPricePrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pricePrompt) return;

    const priceNum = parseFloat(pricePromptValue);
    const validPrice = isNaN(priceNum) || priceNum < 0 ? pricePrompt.defaultPrice : priceNum;
    const validQty = Math.max(1, pricePromptQty);

    setCartMap((prev) => {
      const next = { ...prev };
      next[pricePrompt.cartKey] = {
        cartKey: pricePrompt.cartKey,
        itemId: pricePrompt.item.id,
        itemName: pricePrompt.item.name,
        displayName: pricePrompt.displayName,
        unitPrice: validPrice,
        weightKg: pricePrompt.weightKg,
        quantity: validQty,
        lineTotal: validQty * validPrice,
        variantKey: pricePrompt.variantKey,
        variantLabel: pricePrompt.variantLabel,
      };
      return next;
    });

    setPricePrompt(null);
  };

  const handleRemoveFromPrompt = () => {
    if (!pricePrompt) return;
    setCartMap((prev) => {
      const next = { ...prev };
      delete next[pricePrompt.cartKey];
      if (pricePrompt.variantKey === 'fixed') {
        delete next[pricePrompt.item.id];
      }
      return next;
    });
    setPricePrompt(null);
  };

  // Toggle portion logic fallback:
  const handleTogglePortion = (item: CatalogItem, variantKey: string = 'fixed') => {
    const cartKey = `${item.id}_${variantKey}`;
    const altFixedKey = variantKey === 'fixed' ? item.id : null;
    const existing = cartMap[cartKey] || (altFixedKey ? cartMap[altFixedKey] : undefined);

    if (existing && existing.quantity > 0) {
      // If I re-click it, it must remove from the bill!
      setCartMap((prev) => {
        const next = { ...prev };
        delete next[cartKey];
        if (altFixedKey) delete next[altFixedKey];
        return next;
      });
    } else {
      // If I click it, it must add to the bill
      handleAddPortion(item, variantKey);
    }
  };

  const handleDecrementPortion = (cartKey: string) => {
    setCartMap((prev) => {
      const next = { ...prev };
      const existing = next[cartKey];
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        delete next[cartKey];
      } else {
        const newQty = existing.quantity - 1;
        next[cartKey] = {
          ...existing,
          quantity: newQty,
          lineTotal: newQty * existing.unitPrice,
        };
      }
      return next;
    });
  };

  const handleRemovePortion = (cartKey: string) => {
    setCartMap((prev) => {
      const next = { ...prev };
      delete next[cartKey];
      return next;
    });
  };

  const handleClearCart = () => {
    setCartMap({});
  };

  // Editable price per item in the Current Bill
  const handleUpdateCartItemPrice = (cartKey: string, newUnitPrice: number) => {
    setCartMap((prev) => {
      const existing = prev[cartKey];
      if (!existing) return prev;
      const validPrice = Math.max(0, newUnitPrice);
      return {
        ...prev,
        [cartKey]: {
          ...existing,
          unitPrice: validPrice,
          lineTotal: validPrice * existing.quantity,
        },
      };
    });
  };

  // Quick edit master price in catalog
  const handleOpenQuickPriceEdit = (item: CatalogItem) => {
    setQuickEditItem({ id: item.id, name: item.name, currentPrice: item.price });
    setQuickEditPriceValue(item.price.toString());
  };

  const handleSaveQuickPriceEdit = () => {
    if (!quickEditItem) return;
    const priceNum = parseFloat(quickEditPriceValue);
    if (!isNaN(priceNum) && priceNum >= 0) {
      updateCatalogItemPrice(quickEditItem.id, priceNum);
      // Also update any matching item currently in cart
      setCartMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (next[key].itemId === quickEditItem.id && (!next[key].variantKey || next[key].variantKey === 'fixed')) {
            next[key] = {
              ...next[key],
              unitPrice: priceNum,
              lineTotal: priceNum * next[key].quantity,
            };
          }
        });
        return next;
      });
      reloadData();
    }
    setQuickEditItem(null);
  };

  // Build cart item list with calculated line totals
  const selectedCartItems = Object.values(cartMap).filter((entry) => entry.quantity > 0);
  const totalBillAmount = selectedCartItems.reduce((sum, entry) => sum + entry.lineTotal, 0);
  const totalBillItemsCount = selectedCartItems.reduce((sum, entry) => sum + entry.quantity, 0);

  // Bill Confirmation and Saving
  const handleConfirmAndSaveBill = () => {
    if (selectedCartItems.length === 0) {
      return;
    }

    try {
      const snapshots: BillItemSnapshot[] = selectedCartItems.map((entry) => ({
        itemId: entry.itemId,
        name: entry.displayName,
        unitPrice: entry.unitPrice,
        quantity: entry.quantity,
        lineTotal: entry.lineTotal,
        weightKg: entry.weightKg,
        totalWeightKg: Number((entry.quantity * entry.weightKg).toFixed(2)),
        variantKey: entry.variantKey,
        variantLabel: entry.variantLabel,
      }));

      const savedBill = createAndSaveBill(snapshots, employeePin);

      setCartMap({});
      setConfirmedBill(savedBill);
      setPrintStatusMessage(null);
      setIsPrintDialogOpen(true);
      setBillSaveError(null);
      reloadData();
    } catch (err: any) {
      setBillSaveError(err?.message || (isTa ? 'பில் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Could not save bill. Please try again.'));
      setTimeout(() => setBillSaveError(null), 5000);
    }
  };

  // Bluetooth Thermal Printing Handler
  const handlePrintViaBluetooth = async (billToPrint: Bill) => {
    setIsPrinting(true);
    setPrintStatusMessage(null);

    const result = await printBillViaBluetooth(billToPrint, settings);
    setIsPrinting(false);

    if (result.success) {
      setPrintStatusMessage({
        type: 'success',
        text: isTa
          ? `பில் #${billToPrint.billNumber} புளூடூத் பிரிண்டரில் வெற்றிகரமாக அச்சிடப்பட்டது!`
          : `Bill #${billToPrint.billNumber} printed successfully via Bluetooth thermal printer!`,
      });
      reloadData();
    } else {
      setPrintStatusMessage({
        type: 'error',
        text: result.error || (isTa
          ? 'புளூடூத் அச்சிடலில் பிழை. பில்லை மீண்டும் அச்சிட முயற்சிக்கலாம்.'
          : 'Bluetooth print failed. You can retry printing without creating a duplicate bill.'),
      });
    }
  };

  // Browser / System Thermal Spooler Print Handler
  const handleBrowserPrint = (billToPrint: Bill) => {
    try {
      incrementBillPrintCount(billToPrint.id);
      window.print();
      setPrintStatusMessage({
        type: 'success',
        text: isTa
          ? `பில் #${billToPrint.billNumber} பிரிண்டர் வரிசைக்கு அனுப்பப்பட்டது.`
          : `Sent bill #${billToPrint.billNumber} to printer spooler.`,
      });
      reloadData();
    } catch (err: any) {
      setPrintStatusMessage({
        type: 'error',
        text: `Printing error: ${err?.message || 'Could not launch print service'}`,
      });
    }
  };

  // Filter bills for Page 2
  const displayedHistoryBills = searchBills(historySearchQuery);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-bold">
      {/* Top App Bar - Small & Compact */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-blue-200 px-2.5 py-1 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AppLogo size="sm" />
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-sm tracking-wide text-slate-900 uppercase">
                {settings.shopName && settings.shopName.trim() !== ''
                  ? settings.shopName
                  : t.appName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Toggle */}
            {onLanguageChange && (
              <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />
            )}

            {/* Bluetooth connection button */}
            <button
              onClick={() => setIsBluetoothModalOpen(true)}
              className={`px-2 py-0.5 rounded-md border text-xs font-black flex items-center gap-1 transition cursor-pointer uppercase ${
                bluetoothState.isConnected
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
              title={t.thermalPrinter}
            >
              <Bluetooth
                className={`w-3.5 h-3.5 stroke-[2.5] ${
                  bluetoothState.isConnected ? 'text-emerald-700' : 'text-slate-500'
                }`}
              />
              <span className="hidden sm:inline">
                {bluetoothState.isConnected ? bluetoothState.deviceName || t.printer : t.btPrinter}
              </span>
            </button>

            {/* Logout / Lock - Asks for Password / PIN */}
            <button
              onClick={() => setIsLogoutPinModalOpen(true)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-300 text-xs font-black flex items-center gap-1 transition cursor-pointer uppercase"
              title={t.lock}
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">{t.lock}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Navigation (Exactly Two Main Pages) - Compact with Bold Labels */}
      <nav className="bg-white border-b border-slate-200 px-2.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex gap-1.5 py-1">
          {/* Page 1 Button */}
          <button
            onClick={() => setCurrentPage('BILLING')}
            className={`flex-1 sm:flex-none px-3.5 py-1 rounded-md text-xs sm:text-sm font-black uppercase flex items-center justify-center transition cursor-pointer ${
              currentPage === 'BILLING'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.page1Billing}</span>
          </button>

          {/* Page 2 Button */}
          <button
            onClick={() => setCurrentPage('HISTORY')}
            className={`flex-1 sm:flex-none px-3.5 py-1 rounded-md text-xs sm:text-sm font-black uppercase flex items-center justify-center transition cursor-pointer ${
              currentPage === 'HISTORY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.page2History}</span>
          </button>
        </div>
      </nav>

      {/* ================= PAGE 1: ITEMS LIST AND PRINT BILL ================= */}
      {currentPage === 'BILLING' && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-1.5 sm:p-2 grid grid-cols-1 lg:grid-cols-12 gap-1.5">
          {/* Left Column: Items List (7 cols) - Small Compact Cards with Big Bold Text */}
          <div className="lg:col-span-7 flex flex-col space-y-1.5">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(true)}
                className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>{t.addItem}</span>
              </button>
            </div>

            {/* If no items configured */}
            {items.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-lg p-3 text-center flex flex-col items-center">
                <AlertCircle className="w-6 h-6 text-blue-600 stroke-[2.5] mb-1" />
                <h3 className="font-black text-sm text-slate-900 uppercase">{t.noItemsConfigured}</h3>
                <p className="text-xs font-bold text-slate-500 max-w-xs mt-0.5">
                  {t.askOwnerToAddItems}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="mt-2 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase flex items-center gap-1 shadow-xs cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{t.addFirstItem}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* 1. Gram / Weight Foods */}
                {items.some((i) => i.pricingType === 'gram') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items
                      .filter((i) => i.pricingType === 'gram')
                      .map((item) => {
                        const portions = [
                          { key: '100g', label: '100gm', price: item.gramPrices?.p100g ?? item.price },
                          { key: '250g', label: '250gm', price: item.gramPrices?.p250g ?? (item.gramPrices?.p200g ? Math.round(item.gramPrices.p200g * 1.25) : Math.round(item.price * 2.5)) },
                          { key: '500g', label: '500gm', price: item.gramPrices?.p500g ?? Math.round(item.price * 5) },
                          { key: '1kg', label: '1 KG', price: item.gramPrices?.p1kg ?? Math.round(item.price * 10) },
                        ];

                        return (
                          <div
                            key={item.id}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between select-none"
                          >
                            <h4 className="font-black text-slate-900 text-sm sm:text-base uppercase leading-tight mb-1 truncate">
                              {item.name}
                            </h4>

                            <div className="grid grid-cols-2 gap-1">
                              {portions.map((g) => {
                                const cartKey = `${item.id}_${g.key}`;
                                const isAdded = (cartMap[cartKey]?.quantity || 0) > 0;
                                return (
                                  <button
                                    key={g.key}
                                    type="button"
                                    onClick={() => handlePromptItemPrice(item, g.key)}
                                    className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer active:scale-95 ${
                                      isAdded
                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                        : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 border-emerald-200'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className={`font-black text-xs sm:text-sm leading-none ${isAdded ? 'text-white' : 'text-emerald-900'}`}>
                                        {g.label}
                                      </div>
                                      <div className={`text-xs sm:text-sm font-mono font-black mt-0.5 ${isAdded ? 'text-emerald-100' : 'text-emerald-700'}`}>
                                        {isTa ? 'ரூ.' : 'Rs.'} {g.price}
                                      </div>
                                    </div>
                                    {isAdded && (
                                      <Check className="w-3.5 h-3.5 stroke-[3.5] text-white shrink-0 ml-1" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* 2. Plating Foods */}
                {items.some((i) => i.pricingType === 'plate') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items
                      .filter((i) => i.pricingType === 'plate')
                      .map((item) => {
                        const plates = [
                          { key: 'plate1', label: isTa ? '1 தட்டு' : '1 Plate', price: item.platePrices?.plate1 ?? item.price },
                          { key: 'plate2', label: isTa ? '2 தட்டு' : '2 Plate', price: item.platePrices?.plate2 ?? (item.price * 2) },
                          { key: 'plate3', label: isTa ? '3 தட்டு' : '3 Plate', price: item.platePrices?.plate3 ?? (item.price * 3) },
                          { key: 'plate4', label: isTa ? '4 தட்டு' : '4 Plate', price: item.platePrices?.plate4 ?? (item.price * 4) },
                        ];

                        return (
                          <div
                            key={item.id}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between select-none"
                          >
                            <h4 className="font-black text-slate-900 text-sm sm:text-base uppercase leading-tight mb-1 truncate">
                              {item.name}
                            </h4>

                            <div className="grid grid-cols-2 gap-1">
                              {plates.map((p) => {
                                const cartKey = `${item.id}_${p.key}`;
                                const isAdded = (cartMap[cartKey]?.quantity || 0) > 0;
                                return (
                                  <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => handlePromptItemPrice(item, p.key)}
                                    className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer active:scale-95 ${
                                      isAdded
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                        : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 border-indigo-200'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className={`font-black text-xs sm:text-sm leading-none ${isAdded ? 'text-white' : 'text-indigo-900'}`}>
                                        {p.label}
                                      </div>
                                      <div className={`text-xs sm:text-sm font-mono font-black mt-0.5 ${isAdded ? 'text-indigo-100' : 'text-indigo-700'}`}>
                                        {isTa ? 'ரூ.' : 'Rs.'} {p.price}
                                      </div>
                                    </div>
                                    {isAdded && (
                                      <Check className="w-3.5 h-3.5 stroke-[3.5] text-white shrink-0 ml-1" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* 3. Fixed Price Foods - Square Tiles (A bit smaller with bold & big text) */}
                {items.some((i) => i.pricingType === 'fixed' || !i.pricingType) && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                    {items
                      .filter((i) => i.pricingType === 'fixed' || !i.pricingType)
                      .map((item) => {
                        const fixedCartKey = `${item.id}_fixed`;
                        const fixedEntry = cartMap[fixedCartKey] || cartMap[item.id];
                        const isAdded = (fixedEntry?.quantity || 0) > 0;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handlePromptItemPrice(item, 'fixed')}
                            className={`aspect-square w-full rounded-xl border-2 p-1.5 flex flex-col justify-between items-center text-center cursor-pointer select-none active:scale-95 transition relative ${
                              isAdded
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400'
                                : 'bg-white border-slate-300 text-slate-900 hover:border-blue-400 hover:bg-blue-50/40 shadow-xs'
                            }`}
                          >
                            {/* Selected Indicator Badge in corner */}
                            {isAdded && (
                              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white text-blue-700 flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3.5]" />
                              </span>
                            )}

                            {/* Big Bold Item Name */}
                            <div className="my-auto px-0.5 w-full flex items-center justify-center">
                              <h4 className="font-black text-sm sm:text-base uppercase leading-tight line-clamp-2">
                                {item.name}
                              </h4>
                            </div>

                            {/* Big Bold Price */}
                            <div
                              className={`font-mono font-black text-sm sm:text-base leading-none tracking-tight pb-0.5 ${
                                isAdded ? 'text-amber-200' : 'text-blue-700'
                              }`}
                            >
                              {isTa ? 'ரூ.' : 'Rs.'} {item.price.toFixed(0)}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Current Bill Slip (5 cols) - Small Compact Div with Big Bold Text */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white border-2 border-blue-200 rounded-xl p-2.5 sticky top-14 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <h3 className="font-black text-sm text-slate-900 uppercase">{t.currentBill}</h3>
                </div>
                {selectedCartItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs font-black text-red-600 hover:text-red-800 flex items-center gap-1 transition cursor-pointer uppercase"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    {t.clear}
                  </button>
                )}
              </div>

              {/* Items in Current Bill - Compact Rows with Editable Price */}
              <div className="flex-1 min-h-[120px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                {selectedCartItems.length === 0 ? (
                  <div className="h-full py-6 flex flex-col items-center justify-center text-center text-slate-400">
                    <Receipt className="w-6 h-6 stroke-[2] text-slate-400 mb-1" />
                    <span className="text-xs font-black text-slate-600 uppercase">{t.noItemsAdded}</span>
                  </div>
                ) : (
                  selectedCartItems.map((entry) => (
                    <div
                      key={entry.cartKey}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-1.5"
                    >
                      <div className="min-w-0 flex-1 pr-1">
                        <div className="font-black text-slate-900 text-xs sm:text-sm uppercase truncate">
                          {entry.displayName}
                        </div>
                      </div>

                      {/* Line Stepper & Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center bg-white border border-slate-300 rounded-md">
                          <button
                            type="button"
                            onClick={() => handleDecrementPortion(entry.cartKey)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-red-600 cursor-pointer"
                          >
                            <Minus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="font-mono font-black text-xs px-1 text-slate-900">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const itm = items.find((i) => i.id === entry.itemId);
                              if (itm) handleAddPortion(itm, entry.variantKey || 'fixed');
                            }}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-blue-600 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>

                        <div className="font-black text-blue-700 text-sm font-mono min-w-[50px] text-right">
                          Rs. {entry.lineTotal.toFixed(0)}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePortion(entry.cartKey)}
                          className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
                          title={isTa ? 'நீக்கு' : 'Remove'}
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Calculations Box - Big Bold Text */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5">
                <div className="flex justify-between text-xs font-black text-slate-600 uppercase">
                  <span>{t.totalPortions}</span>
                  <span className="text-xs text-slate-900">{totalBillItemsCount}</span>
                </div>

                <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-slate-300">
                  <span className="text-sm font-black text-slate-800 uppercase">{t.billTotal}</span>
                  <span className="text-2xl font-black text-blue-700 tracking-tight">
                    Rs. {totalBillAmount.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {billSaveError && (
                <div className="mt-2 p-2 rounded-lg bg-red-100 border border-red-300 text-red-700 text-xs font-black flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 stroke-[2.5]" />
                  <span>{billSaveError}</span>
                </div>
              )}

              {/* Action Button: Confirm & Save Bill */}
              <button
                type="button"
                onClick={handleConfirmAndSaveBill}
                disabled={selectedCartItems.length === 0}
                className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-base sm:text-lg uppercase shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[3]" />
                <span>{t.confirmAndSaveBill}</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ================= PAGE 2: BILL HISTORY ================= */}
      {currentPage === 'HISTORY' && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-2.5 space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white border border-blue-200 p-2 rounded-lg shadow-xs">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                {t.billHistoryAndReprint}
              </h2>
            </div>

            {/* Bill Number Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400 stroke-[2.5]" />
              <input
                type="text"
                placeholder={t.searchBillHistoryPlaceholder}
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md pl-7 pr-2 py-1 text-xs font-black text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Bills List - Compact Small Cards with Big Bold Text */}
          {displayedHistoryBills.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-lg p-6 text-center text-slate-400 flex flex-col items-center">
              <Clock className="w-6 h-6 text-slate-300 mb-1 stroke-[1.5]" />
              <div className="font-black text-sm text-slate-700 uppercase">{t.noBillsFound}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {displayedHistoryBills.map((bill) => (
                <div
                  key={bill.id}
                  className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-lg p-2 flex flex-col justify-between shadow-xs transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black font-mono text-xs text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                          {bill.billNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 font-mono">
                          {bill.dateString} {bill.timeString}
                        </span>
                      </div>
                      {bill.printCount > 0 && (
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-black">
                          {bill.printCount}x {t.print}
                        </span>
                      )}
                    </div>

                    {/* Snapshot of items */}
                    <div className="text-xs font-bold text-slate-700 space-y-0.5 my-1 bg-slate-50 p-1.5 rounded-md border border-slate-200">
                      {bill.items.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="truncate pr-1 uppercase font-black text-slate-800">{it.name} &times; {it.quantity}</span>
                          <span className="font-black text-slate-600">{isTa ? 'ரூ.' : 'Rs.'} {it.lineTotal.toFixed(0)}</span>
                        </div>
                      ))}
                      {bill.items.length > 3 && (
                        <div className="text-[10px] text-slate-400 italic">
                          {isTa ? `+ ${bill.items.length - 3} மேலும்...` : `+ ${bill.items.length - 3} more...`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-black text-blue-700">
                        {isTa ? 'ரூ.' : 'Rs.'} {bill.totalAmount.toFixed(0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedHistoryBill(bill)}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 font-black text-xs border border-slate-300 flex items-center gap-0.5 cursor-pointer uppercase"
                      >
                        <Eye className="w-3 h-3 stroke-[2.5]" />
                        <span>{t.view}</span>
                      </button>

                      <button
                        onClick={() => {
                          setConfirmedBill(bill);
                          setPrintStatusMessage(null);
                          setIsPrintDialogOpen(true);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-0.5 transition shadow-xs cursor-pointer uppercase"
                      >
                        <Printer className="w-3 h-3 stroke-[2.5]" />
                        <span>{t.print}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ================= MODAL: PRICE PROMPT POPUP (When food button is clicked) ================= */}
      {pricePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs bg-white border-2 border-blue-500 rounded-2xl p-4 text-slate-900 shadow-2xl relative animate-in zoom-in-95">
            {/* Header: Item Name and Close button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <h3 className="font-black text-base uppercase text-blue-700 leading-tight truncate pr-2">
                {pricePrompt.displayName}
              </h3>
              <button
                type="button"
                onClick={() => setPricePrompt(null)}
                className="text-slate-400 hover:text-slate-800 p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Price Input Form */}
            <form onSubmit={handleConfirmPricePrompt} className="space-y-3">
              <div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-mono font-black text-slate-400 text-lg">
                    {isTa ? 'ரூ.' : 'Rs.'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pricePromptValue}
                    onChange={(e) => setPricePromptValue(e.target.value)}
                    className="w-full pl-12 pr-3 py-2 bg-slate-50 border-2 border-blue-400 focus:border-blue-600 rounded-xl text-2xl font-black text-slate-900 font-mono text-right focus:outline-none focus:bg-white shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-black text-slate-700 uppercase">
                  {isTa ? 'எண்ணிக்கை' : 'Quantity'}:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPricePromptQty((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-red-600 flex items-center justify-center font-black cursor-pointer shadow-2xs"
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <span className="font-mono font-black text-base w-6 text-center text-slate-900">
                    {pricePromptQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPricePromptQty((q) => q + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-blue-600 flex items-center justify-center font-black cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Line Total preview */}
              <div className="flex justify-between items-baseline px-1 text-xs font-black">
                <span className="text-slate-500 uppercase">{isTa ? 'பில் தொகை:' : 'Line Total:'}</span>
                <span className="text-base font-black text-blue-700 font-mono">
                  Rs. {((parseFloat(pricePromptValue) || 0) * pricePromptQty).toFixed(0)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>
                    {pricePrompt.isAlreadyInCart
                      ? (isTa ? 'பில்லில் மாற்று' : 'Update in Bill')
                      : (isTa ? 'பில்லில் சேர்' : 'Add to Bill')}
                  </span>
                </button>

                {pricePrompt.isAlreadyInCart && (
                  <button
                    type="button"
                    onClick={handleRemoveFromPrompt}
                    className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs uppercase flex items-center justify-center gap-1.5 border border-red-200 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isTa ? 'பில்லில் இருந்து நீக்கு' : 'Remove from Bill'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPricePrompt(null)}
                  className="w-full py-1 text-slate-500 hover:text-slate-800 text-xs font-black uppercase cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINT / REPRINT DIALOG - Compact ================= */}
      {isPrintDialogOpen && confirmedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs sm:max-w-[300px] bg-white border-2 border-blue-200 rounded-2xl p-3 text-slate-900 shadow-xl relative flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[3]" />
                <div>
                  <h3 className="font-black text-sm uppercase text-slate-900">{t.billSaved}</h3>
                  <p className="text-xs font-black text-blue-700">
                    {confirmedBill.billNumber} &bull; {isTa ? 'ரூ.' : 'Rs.'} {confirmedBill.totalAmount.toFixed(0)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintDialogOpen(false)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer text-lg font-black"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Print feedback status */}
            {printStatusMessage && (
              <div
                className={`mt-2 p-2 rounded-lg border text-xs font-black flex items-start gap-1.5 ${
                  printStatusMessage.type === 'success'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                    : 'bg-red-100 border-red-300 text-red-900'
                }`}
              >
                <div>{printStatusMessage.text}</div>
              </div>
            )}

            {/* Receipt Preview */}
            <div className="flex-1 overflow-y-auto py-1.5">
              <ReceiptView bill={confirmedBill} settings={settings} lang={lang} />
            </div>

            {/* Print action button */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handlePrintViaBluetooth(confirmedBill)}
                disabled={isPrinting}
                className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPrinting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {isTa ? 'பிரிண்ட்...' : 'Printing...'}
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5 stroke-[2.5]" />
                    {t.printBluetooth}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: HISTORY DETAILS VIEWER - Compact ================= */}
      {selectedHistoryBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs sm:max-w-[300px] bg-white border-2 border-blue-200 rounded-2xl p-3 text-slate-900 shadow-xl relative flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <div>
                <h3 className="font-black text-sm uppercase text-slate-900">{t.billSnapshot}</h3>
                <p className="text-xs font-black text-blue-700">
                  {selectedHistoryBill.billNumber} &bull; {selectedHistoryBill.dateString} {selectedHistoryBill.timeString}
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryBill(null)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer text-lg font-black"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <ReceiptView bill={selectedHistoryBill} settings={settings} lang={lang} />
            </div>

            <div className="pt-2 border-t border-slate-200 flex gap-1.5">
              <button
                type="button"
                onClick={() => handlePrintViaBluetooth(selectedHistoryBill)}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
              >
                <Bluetooth className="w-3.5 h-3.5 stroke-[2.5]" />
                {t.reprintBt}
              </button>
              <button
                type="button"
                onClick={() => handleBrowserPrint(selectedHistoryBill)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-black uppercase flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                {t.reprintThermal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Master Price Modal for Employee */}
      {quickEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs bg-white border-2 border-blue-400 rounded-2xl p-4 text-slate-900 shadow-xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
              <div className="flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                <h4 className="font-black text-sm uppercase text-slate-900">
                  {isTa ? 'உணவு விலையை மாற்றுக' : 'Edit Item Price'}
                </h4>
              </div>
              <button
                onClick={() => setQuickEditItem(null)}
                className="text-slate-400 hover:text-slate-800 p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <p className="text-sm font-black uppercase text-blue-700 mb-3 truncate">
              {quickEditItem.name}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                {isTa ? 'புதிய விற்பனை விலை (ரூ.)' : 'New Selling Price (Rs.)'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-black text-slate-500 font-mono">
                  {isTa ? 'ரூ.' : 'Rs.'}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quickEditPriceValue}
                  onChange={(e) => setQuickEditPriceValue(e.target.value)}
                  className="w-full pl-11 pr-3 py-2 bg-slate-50 border-2 border-blue-400 focus:border-blue-600 rounded-lg text-lg font-black text-slate-900 font-mono focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuickEditItem(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveQuickPriceEdit}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase shadow-xs cursor-pointer"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bluetooth Setup Modal */}
      <BluetoothModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        settings={settings}
        lang={lang}
      />

      {/* Share to Owner Daily Report Modal */}
      <ShareToOwnerModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        settings={settings}
        employeePin={employeePin}
        lang={lang}
      />

      {/* Add Item Modal */}
      <ItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSave={reloadData}
        lang={lang}
      />

      {/* ================= MODAL: EMPLOYEE LOGOUT CONFIRMATION WITH PIN ================= */}
      {isLogoutPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs">
            <PinPad
              title={isTa ? 'பணியாளர் வெளியேறுதல்' : 'Employee Logout'}
              subtitle={isTa ? 'வெளியேற கடவுச்சொல்லை உள்ளிடவும்' : 'Enter PIN / Password to Logout'}
              expectedPin={[settings.employeePin || employeePin || '1234', settings.ownerPin || '8888']}
              onSuccess={() => {
                setIsLogoutPinModalOpen(false);
                onLogout();
              }}
              onCancel={() => setIsLogoutPinModalOpen(false)}
              lang={lang}
            />
          </div>
        </div>
      )}
    </div>
  );
};
