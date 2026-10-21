import React, { useState, useEffect } from 'react';
import {
  getCatalogItems,
  getSavedBills,
  createAndSaveBill,
  getShopSettings,
  subscribeToStore,
  searchBills,
  incrementBillPrintCount,
  deleteCatalogItem,
  resetToDefaultChickenItems,
  clearAllCatalogItems,
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
  X,
  Scale,
  RotateCcw,
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

  // Page 1: Billing Rows State (ItemId -> { kg: string, price: string })
  // Exactly matching the screenshot: KG input, PRICE (₹) input, and calculated total box
  const [rowMap, setRowMap] = useState<Record<string, { kg: string; price?: string }>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [billingSearchQuery, setBillingSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<CatalogItem | null>(null);
  const [isClearAllItemsModalOpen, setIsClearAllItemsModalOpen] = useState(false);

  // Add Item modal state
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

  // Update KG for an item row
  const handleKgChange = (itemId: string, val: string) => {
    // Only allow numbers and decimal point
    const clean = val.replace(/[^0-9.]/g, '');
    setActiveItemId(itemId);
    setRowMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        kg: clean,
      },
    }));
  };

  // Update Price (₹) for an item row
  const handlePriceChange = (itemId: string, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setActiveItemId(itemId);
    setRowMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        kg: prev[itemId]?.kg || '',
        price: clean,
      },
    }));
  };

  // Toggle item by clicking Box 3 (default to 1 KG if empty, or clear if already active)
  const handleToggleItem = (itemId: string) => {
    setActiveItemId(itemId);
    setRowMap((prev) => {
      const currentKg = prev[itemId]?.kg || '';
      const num = parseFloat(currentKg);
      if (num > 0) {
        // Toggle off
        return {
          ...prev,
          [itemId]: {
            ...prev[itemId],
            kg: '',
          },
        };
      } else {
        // Toggle on with 1 KG
        return {
          ...prev,
          [itemId]: {
            ...prev[itemId],
            kg: '1',
          },
        };
      }
    });
  };

  // DEL button handler:
  // If KG is typed or row is active -> clears the row from the current bill.
  // If already empty -> opens prompt to delete from catalog.
  const handleDelClick = (item: CatalogItem) => {
    const current = rowMap[item.id];
    const kgNum = parseFloat(current?.kg || '0');
    if (kgNum > 0 || (current?.kg && current.kg.trim() !== '') || (current?.price && current.price.trim() !== '')) {
      // Clear inputs for this item in current bill
      setRowMap((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      if (activeItemId === item.id) {
        setActiveItemId(null);
      }
    } else {
      // Prompt to delete item from catalog
      setItemToDelete(item);
    }
  };

  // Confirm deletion from catalog
  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    deleteCatalogItem(itemToDelete.id);
    setRowMap((prev) => {
      const next = { ...prev };
      delete next[itemToDelete.id];
      return next;
    });
    setItemToDelete(null);
    reloadData();
  };

  // Clear all active bill rows
  const handleClearCart = () => {
    setRowMap({});
    setActiveItemId(null);
  };

  // Restore standard chicken cuts matching the screenshot
  const handleResetChickenItems = () => {
    resetToDefaultChickenItems();
    reloadData();
  };

  // Clear all items from database (localStorage & Firestore)
  const handleConfirmClearAllItems = () => {
    clearAllCatalogItems();
    setRowMap({});
    setActiveItemId(null);
    setIsClearAllItemsModalOpen(false);
    reloadData();
  };

  // Build active bill items
  const activeBillItems: BillItemSnapshot[] = [];
  for (const item of items) {
    const entry = rowMap[item.id];
    const kgStr = entry?.kg?.trim() || '';
    const kgNum = parseFloat(kgStr);
    if (!kgStr || isNaN(kgNum) || kgNum <= 0) continue;

    const priceNum = parseFloat(entry?.price || item.price.toString()) || item.price;
    const lineTotal = Math.round(kgNum * priceNum);

    activeBillItems.push({
      itemId: item.id,
      name: item.name,
      unitPrice: priceNum,
      quantity: 1,
      lineTotal,
      weightKg: kgNum,
      totalWeightKg: kgNum,
      variantKey: 'weight',
      variantLabel: `${kgNum} KG`,
    });
  }

  const totalBillAmount = activeBillItems.reduce((sum, it) => sum + it.lineTotal, 0);
  const totalBillItemsCount = activeBillItems.length;
  const totalBillWeightKg = Number(
    activeBillItems.reduce((sum, it) => sum + (it.weightKg || 0), 0).toFixed(2)
  );

  // Bill Confirmation and Saving
  const handleConfirmAndSaveBill = () => {
    if (activeBillItems.length === 0) {
      return;
    }

    try {
      const savedBill = createAndSaveBill(activeBillItems, employeePin);

      setRowMap({});
      setActiveItemId(null);
      setConfirmedBill(savedBill);
      setPrintStatusMessage(null);
      setIsPrintDialogOpen(true);
      setBillSaveError(null);
      reloadData();
    } catch (err: any) {
      setBillSaveError(
        err?.message ||
          (isTa ? 'பில் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Could not save bill. Please try again.')
      );
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
        text:
          result.error ||
          (isTa
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

  // Filter items for Page 1
  const displayedItems = items.filter((it) =>
    it.name.toLowerCase().includes(billingSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-bold">
      {/* Top App Bar - Clean & Compact */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-blue-200 px-2.5 py-1.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AppLogo size="sm" />
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-sm sm:text-base tracking-wide text-slate-900 uppercase">
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
              className={`px-2 py-1 rounded-md border text-xs font-black flex items-center gap-1 transition cursor-pointer uppercase ${
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

            {/* Logout / Lock Button */}
            <button
              onClick={() => setIsLogoutPinModalOpen(true)}
              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-300 text-xs font-black flex items-center gap-1 transition cursor-pointer uppercase"
              title={t.lock}
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">{t.lock}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Navigation: BILLING and BILL HISTORY */}
      <nav className="bg-white border-b border-slate-200 px-2.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex gap-1.5 py-1">
          <button
            onClick={() => setCurrentPage('BILLING')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs sm:text-sm font-black uppercase flex items-center justify-center transition cursor-pointer ${
              currentPage === 'BILLING'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.page1Billing}</span>
          </button>

          <button
            onClick={() => setCurrentPage('HISTORY')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs sm:text-sm font-black uppercase flex items-center justify-center transition cursor-pointer ${
              currentPage === 'HISTORY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.page2History}</span>
          </button>
        </div>
      </nav>

      {/* ================= PAGE 1: BILLING (EXACTLY MATCHING USER SCREENSHOT) ================= */}
      {currentPage === 'BILLING' && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 pb-24 lg:pb-4">
          {/* Left Column: Items List matching the screenshot (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-2">
            {/* Toolbar: Search, Add Item, Reset standard cuts */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 stroke-[2.5]" />
                <input
                  type="text"
                  placeholder={isTa ? 'உணவு தேட...' : 'Search items...'}
                  value={billingSearchQuery}
                  onChange={(e) => setBillingSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsClearAllItemsModalOpen(true)}
                  title={isTa ? 'தரவுத்தளத்திலிருந்து அனைத்து பொருட்களையும் நீக்கு' : 'Clear all items from database'}
                  className="px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black uppercase flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">{isTa ? 'அனைத்தும் நீக்கு' : 'Clear All'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetChickenItems}
                  title={isTa ? 'தரநிலை கோழி பொருட்கள்' : 'Reset Chicken Cuts'}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black uppercase flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">{isTa ? 'கோழி பட்டியல்' : 'Standard Cuts'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{t.addItem}</span>
                </button>
              </div>
            </div>

            {/* If no items found */}
            {displayedItems.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center flex flex-col items-center">
                <AlertCircle className="w-7 h-7 text-blue-600 stroke-[2.5] mb-1.5" />
                <h3 className="font-black text-sm text-slate-900 uppercase">
                  {items.length === 0 ? t.noItemsConfigured : (isTa ? 'பொருட்கள் காணப்படவில்லை' : 'No items match')}
                </h3>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleResetChickenItems}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase flex items-center gap-1 shadow-xs cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isTa ? 'தரநிலை கோழி பட்டியல் ஏற்று' : 'Load Standard Cuts'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase flex items-center gap-1 shadow-xs cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{t.addItem}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* The Exact Cards as shown in the uploaded screenshot */
              <div className="space-y-2.5 max-h-[calc(100vh-170px)] overflow-y-auto pr-1">
                {displayedItems.map((item) => {
                  const entry = rowMap[item.id];
                  const rowKg = entry?.kg !== undefined ? entry.kg : '';
                  const rowPrice = entry?.price !== undefined ? entry.price : '';
                  const kgNum = parseFloat(rowKg);
                  const isKgValid = !isNaN(kgNum) && kgNum > 0;

                  const unitPrice =
                    rowPrice.trim() !== '' && !isNaN(parseFloat(rowPrice))
                      ? parseFloat(rowPrice)
                      : item.price;

                  // Box 3 display value:
                  // When KG is entered, calculate total = KG * Price
                  // When KG is empty, show base price (as seen in Card 1: 320, Card 2: 200, Card 3: 160)
                  const displayedTotal = isKgValid
                    ? Math.round(kgNum * unitPrice)
                    : unitPrice;

                  // Active highlight:
                  // If item has valid KG (> 0) OR is currently focused/selected (like Card 3 in screenshot with green border)
                  const isItemActive = isKgValid || activeItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveItemId(item.id)}
                      className={`rounded-2xl p-3 sm:p-3.5 transition bg-white select-none ${
                        isItemActive
                          ? 'border border-emerald-400 ring-2 ring-emerald-100 shadow-sm'
                          : 'border border-gray-200 hover:border-gray-300 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Bullet + Name in bold + DEL button on right */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Circular bullet dot matching screenshot */}
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block shrink-0" />
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                            {item.name}
                          </h3>
                        </div>

                        {/* DEL button with red trash icon and DEL text */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelClick(item);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100 active:scale-95 text-red-600 font-bold text-xs uppercase flex items-center gap-1.5 transition cursor-pointer shrink-0"
                          title={isKgValid ? (isTa ? 'பட்டியலிலிருந்து நீக்கு' : 'Remove from bill') : (isTa ? 'நீக்கு' : 'Delete item')}
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>DEL</span>
                        </button>
                      </div>

                      {/* Bottom Row: 3 Boxes: [ KG ] | [ PRICE (₹) ] | [ 320 ] */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2.5">
                        {/* Box 1: KG Input */}
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="KG"
                            value={rowKg}
                            onChange={(e) => handleKgChange(item.id, e.target.value)}
                            onFocus={() => setActiveItemId(item.id)}
                            className="w-full text-center py-2 sm:py-2.5 px-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-sm sm:text-base transition"
                          />
                        </div>

                        {/* Box 2: PRICE (₹) Input */}
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="PRICE (₹)"
                            value={rowPrice}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            onFocus={() => setActiveItemId(item.id)}
                            className="w-full text-center py-2 sm:py-2.5 px-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-sm sm:text-base transition"
                          />
                        </div>

                        {/* Box 3: Total Amount Display Box */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleItem(item.id);
                          }}
                          className={`w-full text-center py-2 sm:py-2.5 px-2 rounded-xl font-black text-slate-900 text-base sm:text-lg flex items-center justify-center cursor-pointer select-none transition ${
                            isKgValid
                              ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 font-black'
                              : 'bg-slate-50/70 border border-slate-200 hover:bg-slate-100'
                          }`}
                          title={isTa ? 'பில்லில் சேர்க்க/நீக்க தட்டவும்' : 'Tap to toggle 1 KG in bill'}
                        >
                          {displayedTotal}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Current Bill Summary (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white border-2 border-blue-200 rounded-2xl p-3 sticky top-14 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <h3 className="font-black text-sm text-slate-900 uppercase">{t.currentBill}</h3>
                </div>
                {activeBillItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs font-black text-red-600 hover:text-red-800 flex items-center gap-1 transition cursor-pointer uppercase"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    {t.clear}
                  </button>
                )}
              </div>

              {/* Items in Current Bill */}
              <div className="flex-1 min-h-[140px] max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
                {activeBillItems.length === 0 ? (
                  <div className="h-full py-8 flex flex-col items-center justify-center text-center text-slate-400">
                    <Receipt className="w-8 h-8 stroke-[1.5] text-slate-300 mb-1" />
                    <span className="text-xs font-black text-slate-600 uppercase">
                      {isTa ? 'பொருட்கள் சேர்க்கப்படவில்லை' : t.noItemsAdded}
                    </span>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 max-w-[200px]">
                      {isTa ? 'பொருளின் KG அல்லது தொகையை உள்ளிடவும்' : 'Enter KG or tap item box to add'}
                    </p>
                  </div>
                ) : (
                  activeBillItems.map((entry) => (
                    <div
                      key={entry.itemId}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1 truncate pr-1">
                        <div className="font-black text-slate-900 text-xs sm:text-sm uppercase truncate">
                          {entry.name}
                        </div>
                        <div className="text-[11px] font-black text-slate-600 mt-0.5">
                          {entry.weightKg} KG &times; {isTa ? 'ரூ.' : 'Rs.'} {entry.unitPrice}
                        </div>
                      </div>

                      {/* Line Total & Remove */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="font-black text-blue-700 text-sm sm:text-base font-mono min-w-[55px] text-right">
                          {isTa ? 'ரூ.' : 'Rs.'} {entry.lineTotal}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRowMap((prev) => {
                              const next = { ...prev };
                              delete next[entry.itemId];
                              return next;
                            });
                          }}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 cursor-pointer"
                          title={isTa ? 'நீக்கு' : 'Remove'}
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Calculations Box - Bold & Clear */}
              <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                <div className="flex justify-between text-xs font-black text-slate-600 uppercase">
                  <span>{isTa ? 'மொத்த எடை' : 'Total Weight'}</span>
                  <span className="text-xs text-slate-900 font-mono">{totalBillWeightKg} KG</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-600 uppercase">
                  <span>{isTa ? 'பொருட்கள் எண்ணிக்கை' : t.totalPortions}</span>
                  <span className="text-xs text-slate-900">{totalBillItemsCount}</span>
                </div>

                <div className="flex justify-between items-baseline pt-1.5 border-t border-dashed border-slate-300">
                  <span className="text-sm font-black text-slate-800 uppercase">{t.billTotal}</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight font-mono">
                    {isTa ? 'ரூ.' : 'Rs.'} {totalBillAmount}
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {billSaveError && (
                <div className="mt-2 p-2 rounded-lg bg-red-100 border border-red-300 text-red-700 text-xs font-black flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 stroke-[2.5]" />
                  <span>{billSaveError}</span>
                </div>
              )}

              {/* Action Button: Confirm & Print Bill */}
              <button
                type="button"
                onClick={handleConfirmAndSaveBill}
                disabled={activeBillItems.length === 0}
                className="w-full mt-2.5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-base sm:text-lg uppercase shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-5 h-5 stroke-[2.5]" />
                <span>{isTa ? 'பில் அச்சிடு' : t.confirmAndSaveBill}</span>
              </button>
            </div>
          </div>

          {/* Floating Mobile Sticky Bottom Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t-2 border-blue-200 p-2.5 px-3 shadow-lg flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-black uppercase text-slate-500">
                {totalBillItemsCount} {isTa ? 'பொருட்கள்' : 'items'} &bull; {totalBillWeightKg} KG
              </div>
              <div className="text-xl font-black text-blue-700 font-mono leading-none">
                {isTa ? 'ரூ.' : 'Rs.'} {totalBillAmount}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeBillItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-red-600 text-xs font-black uppercase transition cursor-pointer"
                >
                  {t.clear}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirmAndSaveBill}
                disabled={activeBillItems.length === 0}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm uppercase shadow-sm disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>{isTa ? 'பிரிண்ட்' : t.print}</span>
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

      {/* ================= MODAL: DELETE ITEM FROM MENU CONFIRMATION ================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs bg-white rounded-2xl p-4 shadow-xl border-2 border-red-200">
            <div className="flex items-center gap-2 mb-2 text-red-600">
              <Trash2 className="w-5 h-5 stroke-[2.5]" />
              <h3 className="font-black text-sm uppercase text-slate-900">
                {isTa ? 'உணவு நீக்கு' : 'Delete Item'}
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-600 mb-3">
              {isTa
                ? `"${itemToDelete.name}" உணவை பட்டியலிலிருந்து நீக்க விரும்புகிறீர்களா?`
                : `Are you sure you want to remove "${itemToDelete.name}" from the menu?`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase transition cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase transition shadow-xs cursor-pointer"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CLEAR ALL ITEMS FROM DATABASE CONFIRMATION ================= */}
      {isClearAllItemsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs bg-white rounded-2xl p-4 shadow-xl border-2 border-red-300">
            <div className="flex items-center gap-2 mb-2 text-red-600">
              <Trash2 className="w-5 h-5 stroke-[2.5]" />
              <h3 className="font-black text-sm uppercase text-slate-900">
                {isTa ? 'அனைத்து பொருட்களையும் நீக்கவா?' : 'Clear All Items from Database?'}
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-600 mb-3.5 leading-relaxed">
              {isTa
                ? 'தரவுத்தளத்தில் உள்ள அனைத்து உணவுப் பொருட்களும் முழுமையாக நீக்கப்படும். எப்போது வேண்டுமானாலும் புதிய பொருட்களைச் சேர்க்கலாம் அல்லது தரநிலை பட்டியலை மீட்டெடுக்கலாம்.'
                : 'All items will be permanently cleared from the database. You can add new items or restore standard cuts at any time.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsClearAllItemsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase transition cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllItems}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase transition shadow-xs cursor-pointer"
              >
                {isTa ? 'ஆம், நீக்கு' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
