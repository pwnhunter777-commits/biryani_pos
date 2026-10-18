import React, { useState, useEffect } from 'react';
import {
  getCatalogItems,
  getSavedBills,
  createAndSaveBill,
  getShopSettings,
  subscribeToStore,
  searchBills,
  incrementBillPrintCount,
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

  // Page 2: History Search & Selected Bill for Details / Reprint
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedHistoryBill, setSelectedHistoryBill] = useState<Bill | null>(null);

  // Bluetooth Modal State
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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
        const pLabel1 = isTa ? '1 தட்டு' : '1 Plate';
        const pLabel2 = isTa ? '2 தட்டு' : '2 Plate';
        const pLabel3 = isTa ? '3 தட்டு' : '3 Plate';
        const pLabel4 = isTa ? '4 தட்டு' : '4 Plate';

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
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm tracking-wide text-slate-900 uppercase">
                  {settings.shopName && settings.shopName.trim() !== ''
                    ? settings.shopName
                    : t.appName}
                </h1>
                <span className="text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.2 rounded uppercase">
                  {t.cashier}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500">
                {currentPage === 'BILLING' ? t.page1Billing : t.page2History}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Toggle */}
            {onLanguageChange && (
              <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />
            )}

            {/* Share to Owner Button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black flex items-center gap-1 transition cursor-pointer uppercase shadow-2xs"
              title={t.shareToOwner}
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
              <span className="hidden sm:inline">{t.shareToOwner}</span>
            </button>

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

            {/* Logout / Lock */}
            <button
              onClick={onLogout}
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
            className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-xs font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer ${
              currentPage === 'BILLING'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t.page1Billing}</span>
            {selectedCartItems.length > 0 && (
              <span className="bg-white text-blue-700 text-[10px] font-black px-1.5 py-0.2 rounded ml-1 shadow-xs">
                {totalBillItemsCount}
              </span>
            )}
          </button>

          {/* Page 2 Button */}
          <button
            onClick={() => setCurrentPage('HISTORY')}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-xs font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer ${
              currentPage === 'HISTORY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t.page2History}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-black ml-1 ${
                currentPage === 'HISTORY' ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {savedBills.length}
            </span>
          </button>
        </div>
      </nav>

      {/* ================= PAGE 1: ITEMS LIST AND PRINT BILL ================= */}
      {currentPage === 'BILLING' && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-1.5 sm:p-2 grid grid-cols-1 lg:grid-cols-12 gap-1.5">
          {/* Left Column: Items List (7 cols) - Small Compact Cards with Big Bold Text */}
          <div className="lg:col-span-7 flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                {t.menuItems}
              </h2>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => {
                  const itemVariantsInCart = selectedCartItems.filter((e) => e.itemId === item.id);
                  const itemTotalQtyInCart = itemVariantsInCart.reduce((sum, e) => sum + e.quantity, 0);
                  const itemTotalAmountInCart = itemVariantsInCart.reduce((sum, e) => sum + e.lineTotal, 0);

                  // CASE 1: GRAM / WEIGHT TYPE (100g, 200g, 500g, 1kg)
                  if (item.pricingType === 'gram') {
                    const portions = [
                      { key: '100g', label: '100gm', price: item.gramPrices?.p100g ?? item.price },
                      { key: '250g', label: '250gm', price: item.gramPrices?.p250g ?? (item.gramPrices?.p200g ? Math.round(item.gramPrices.p200g * 1.25) : Math.round(item.price * 2.5)) },
                      { key: '500g', label: '500gm', price: item.gramPrices?.p500g ?? Math.round(item.price * 5) },
                      { key: '1kg', label: '1 KG', price: item.gramPrices?.p1kg ?? Math.round(item.price * 10) },
                    ];

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border-2 transition-all flex flex-col justify-between shadow-xs select-none ${
                          itemTotalQtyInCart > 0
                            ? 'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200/90 hover:border-emerald-400 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          {/* Title and Badges */}
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight uppercase truncate">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                                {t.gramType}
                              </span>
                              {itemTotalQtyInCart > 0 && (
                                <span className="inline-flex items-center gap-0.5 bg-emerald-600 text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>{itemTotalQtyInCart}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 4 Gram Selection Buttons (100g, 200g, 500g, 1kg) */}
                          <div className="grid grid-cols-2 gap-1.5 mt-2">
                            {portions.map((g) => {
                              const cartKey = `${item.id}_${g.key}`;
                              const q = cartMap[cartKey]?.quantity || 0;
                              return (
                                <button
                                  key={g.key}
                                  type="button"
                                  onClick={() => handleAddPortion(item, g.key)}
                                  className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer active:scale-95 ${
                                    q > 0
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                      : 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-950 border-emerald-200'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className={`font-black text-xs leading-none ${q > 0 ? 'text-white' : 'text-emerald-900'}`}>
                                      {g.label}
                                    </div>
                                    <div className={`text-[11px] font-mono font-black mt-0.5 ${q > 0 ? 'text-emerald-100' : 'text-emerald-700'}`}>
                                      {isTa ? 'ரூ.' : 'Rs.'} {g.price}
                                    </div>
                                  </div>
                                  {q > 0 ? (
                                    <span className="w-5 h-5 rounded-full bg-white text-emerald-800 text-[11px] font-mono font-black flex items-center justify-center shrink-0 ml-1">
                                      {q}
                                    </span>
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3] ml-1" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {itemTotalQtyInCart > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-emerald-100 flex items-center justify-between text-xs font-mono">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {isTa ? 'மொத்தம்' : 'Subtotal'}:
                            </span>
                            <span className="font-black text-emerald-800">
                              {isTa ? 'ரூ.' : 'Rs.'} {itemTotalAmountInCart.toFixed(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // CASE 2: PLATE / SERVINGS TYPE (1, 2, 3, 4 Plates)
                  if (item.pricingType === 'plate') {
                    const plates = [
                      { key: 'plate1', label: isTa ? '1 தட்டு' : '1 Plate', price: item.platePrices?.plate1 ?? item.price },
                      { key: 'plate2', label: isTa ? '2 தட்டு' : '2 Plate', price: item.platePrices?.plate2 ?? (item.price * 2) },
                      { key: 'plate3', label: isTa ? '3 தட்டு' : '3 Plate', price: item.platePrices?.plate3 ?? (item.price * 3) },
                      { key: 'plate4', label: isTa ? '4 தட்டு' : '4 Plate', price: item.platePrices?.plate4 ?? (item.price * 4) },
                    ];

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border-2 transition-all flex flex-col justify-between shadow-xs select-none ${
                          itemTotalQtyInCart > 0
                            ? 'bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/40 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200/90 hover:border-indigo-400 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          {/* Title and Badges */}
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight uppercase truncate">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-black uppercase text-indigo-800 bg-indigo-100 border border-indigo-300 px-1.5 py-0.5 rounded">
                                {t.plateType}
                              </span>
                              {itemTotalQtyInCart > 0 && (
                                <span className="inline-flex items-center gap-0.5 bg-indigo-600 text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>{itemTotalQtyInCart}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 4 Plate Selection Buttons */}
                          <div className="grid grid-cols-2 gap-1.5 mt-2">
                            {plates.map((p) => {
                              const cartKey = `${item.id}_${p.key}`;
                              const q = cartMap[cartKey]?.quantity || 0;
                              return (
                                <button
                                  key={p.key}
                                  type="button"
                                  onClick={() => handleAddPortion(item, p.key)}
                                  className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer active:scale-95 ${
                                    q > 0
                                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                      : 'bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-950 border-indigo-200'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className={`font-black text-xs leading-none ${q > 0 ? 'text-white' : 'text-indigo-900'}`}>
                                      {p.label}
                                    </div>
                                    <div className={`text-[11px] font-mono font-black mt-0.5 ${q > 0 ? 'text-indigo-100' : 'text-indigo-700'}`}>
                                      {isTa ? 'ரூ.' : 'Rs.'} {p.price}
                                    </div>
                                  </div>
                                  {q > 0 ? (
                                    <span className="w-5 h-5 rounded-full bg-white text-indigo-800 text-[11px] font-mono font-black flex items-center justify-center shrink-0 ml-1">
                                      {q}
                                    </span>
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 text-indigo-600 shrink-0 stroke-[3] ml-1" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {itemTotalQtyInCart > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-indigo-100 flex items-center justify-between text-xs font-mono">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {isTa ? 'மொத்தம்' : 'Subtotal'}:
                            </span>
                            <span className="font-black text-indigo-800">
                              {isTa ? 'ரூ.' : 'Rs.'} {itemTotalAmountInCart.toFixed(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // CASE 3: FIXED PRICE TYPE
                  const fixedCartKey = `${item.id}_fixed`;
                  const fixedEntry = cartMap[fixedCartKey] || cartMap[item.id];
                  const fixedQty = fixedEntry?.quantity || 0;
                  const itemSubtotal = item.price * fixedQty;

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border-2 transition-all duration-150 relative overflow-hidden flex flex-col justify-between shadow-xs select-none ${
                        fixedQty > 0
                          ? 'bg-gradient-to-br from-blue-50/95 via-white to-blue-50/50 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Tap Target */}
                      <div
                        onClick={() => handleAddPortion(item, 'fixed')}
                        className="cursor-pointer group/card pb-1.5"
                        title={isTa ? 'சேர்க்க தட்டவும்' : 'Tap to add'}
                      >
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight uppercase truncate">
                            {item.name}
                          </h4>

                          {fixedQty > 0 && (
                            <span className="inline-flex items-center gap-0.5 bg-blue-600 text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-xs shrink-0 animate-in fade-in zoom-in-95">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>{fixedQty}</span>
                            </span>
                          )}
                        </div>

                        {/* Price & Subtotal Line */}
                        <div className="flex items-baseline justify-between mt-1 px-0.5">
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              {isTa ? 'விலை' : 'Price'}
                            </span>
                            <span className="text-blue-700 font-black text-lg sm:text-xl font-mono">
                              {isTa ? 'ரூ.' : 'Rs.'} {item.price.toFixed(0)}
                            </span>
                          </div>

                          {fixedQty > 0 && (
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-mono shadow-2xs">
                              = {isTa ? 'ரூ.' : 'Rs.'} {itemSubtotal.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action: Add Button (if 0) or Tactile Stepper (if > 0) */}
                      <div className="pt-1.5 border-t border-slate-200/80 mt-0.5">
                        {fixedQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleAddPortion(item, 'fixed')}
                            className="w-full py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 border border-blue-200 hover:border-blue-600 transition-all cursor-pointer active:scale-98 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{isTa ? 'சேர்' : 'Add to Bill'}</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-slate-100 rounded-lg p-0.5 border border-slate-300">
                            {/* Minus Button */}
                            <button
                              type="button"
                              onClick={() => handleDecrementPortion(fixedEntry?.cartKey || `${item.id}_fixed`)}
                              className="w-8 h-8 rounded-md bg-white hover:bg-red-50 hover:text-red-700 active:scale-95 text-slate-800 font-black border border-slate-300 hover:border-red-300 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                              aria-label="Decrease quantity"
                              title={isTa ? 'குறைக்க' : 'Decrease'}
                            >
                              <Minus className="w-4 h-4 stroke-[3]" />
                            </button>

                            {/* Center Count Badge */}
                            <div className="flex flex-col items-center justify-center px-3">
                              <span className="text-center font-black font-mono text-lg text-slate-900 leading-none">
                                {fixedQty}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight">
                                {isTa ? 'பங்கு' : 'Qty'}
                              </span>
                            </div>

                            {/* Plus Button */}
                            <button
                              type="button"
                              onClick={() => handleAddPortion(item, 'fixed')}
                              className="w-8 h-8 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black flex items-center justify-center transition-all shadow-xs cursor-pointer"
                              aria-label="Increase quantity"
                              title={isTa ? 'அதிகரிக்க' : 'Increase'}
                            >
                              <Plus className="w-4 h-4 stroke-[3]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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

              {/* Items in Current Bill - Compact Rows */}
              <div className="flex-1 min-h-[120px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                {selectedCartItems.length === 0 ? (
                  <div className="h-full py-6 flex flex-col items-center justify-center text-center text-slate-400">
                    <Receipt className="w-6 h-6 stroke-[1.5] text-slate-300 mb-1" />
                    <span className="text-xs font-bold">{t.noItemsAdded}</span>
                    <span className="text-[11px] font-bold text-slate-400">{t.tapPlusToStart}</span>
                  </div>
                ) : (
                  selectedCartItems.map((entry) => (
                    <div
                      key={entry.cartKey}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-1.5"
                    >
                      <div className="min-w-0 flex-1 truncate pr-1">
                        <div className="font-black text-slate-900 text-xs uppercase truncate">
                          {entry.displayName}
                        </div>
                        <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                          {entry.quantity} &times; {isTa ? 'ரூ.' : 'Rs.'} {entry.unitPrice.toFixed(0)}
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
                          {isTa ? 'ரூ.' : 'Rs.'} {entry.lineTotal.toFixed(0)}
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
                    {isTa ? 'ரூ.' : 'Rs.'} {totalBillAmount.toFixed(0)}
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
                className="w-full mt-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-sm uppercase shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                {t.confirmAndSaveBill}
              </button>

              {/* Quick Share to Owner */}
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="w-full mt-1.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t.shareToOwner}</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ================= PAGE 2: BILL HISTORY ================= */}
      {currentPage === 'HISTORY' && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-2.5 space-y-1.5">
          {/* Employee Phone Storage Policy Banner & Share Button */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-blue-900 text-xs font-bold">
              <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t.savedOnPhoneNotice} ({displayedHistoryBills.length} {t.billsDate})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer uppercase shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t.shareToOwner}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white border border-blue-200 p-2 rounded-lg shadow-xs">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                {t.billHistoryAndReprint}
              </h2>
              <p className="text-[11px] font-bold text-slate-500">
                {t.searchBillsSub}
              </p>
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

      {/* ================= MODAL: PRINT / REPRINT DIALOG - Compact ================= */}
      {isPrintDialogOpen && confirmedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-sm bg-white border-2 border-blue-200 rounded-2xl p-3.5 text-slate-900 shadow-xl relative flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[3]" />
                <div>
                  <h3 className="font-black text-base text-slate-900 uppercase">{t.billSaved}</h3>
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
            <div className="flex-1 overflow-y-auto py-2">
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
          <div className="w-full max-w-sm bg-white border-2 border-blue-200 rounded-2xl p-3.5 text-slate-900 shadow-xl relative flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-black text-base text-slate-900 uppercase">{t.billSnapshot}</h3>
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
    </div>
  );
};
