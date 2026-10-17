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
} from 'lucide-react';
import { ReceiptView } from './ReceiptView';
import { BluetoothModal } from './BluetoothModal';
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

  // Page 1: Current Bill Cart State (Item ID -> Quantity)
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  
  // Confirmed & Saved Bill Modal / Print Dialog
  const [confirmedBill, setConfirmedBill] = useState<Bill | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatusMessage, setPrintStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Page 2: History Search & Selected Bill for Details / Reprint
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedHistoryBill, setSelectedHistoryBill] = useState<Bill | null>(null);

  // Bluetooth Modal State
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
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

  // Cart operations (Quantity modification)
  const handleQuantityChange = (itemId: string, newQty: number) => {
    setCartQuantities((prev) => {
      const next = { ...prev };
      if (newQty <= 0) {
        delete next[itemId];
      } else {
        next[itemId] = newQty;
      }
      return next;
    });
  };

  const handleIncrement = (itemId: string) => {
    const current = cartQuantities[itemId] || 0;
    handleQuantityChange(itemId, current + 1);
  };

  const handleDecrement = (itemId: string) => {
    const current = cartQuantities[itemId] || 0;
    if (current > 0) {
      handleQuantityChange(itemId, current - 1);
    }
  };

  const handleClearCart = () => {
    setCartQuantities({});
  };

  // Build cart item list with calculated line totals
  const selectedCartItems = Object.entries(cartQuantities)
    .map(([itemId, qty]) => {
      const item = items.find((it) => it.id === itemId);
      if (!item || qty <= 0) return null;
      return {
        item,
        quantity: qty,
        unitPrice: item.price,
        lineTotal: item.price * qty,
      };
    })
    .filter(Boolean) as {
    item: CatalogItem;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];

  const totalBillAmount = selectedCartItems.reduce((sum, entry) => sum + entry.lineTotal, 0);
  const totalBillItemsCount = selectedCartItems.reduce((sum, entry) => sum + entry.quantity, 0);

  // Bill Confirmation and Saving
  const handleConfirmAndSaveBill = () => {
    if (selectedCartItems.length === 0) {
      return;
    }

    try {
      const snapshots: BillItemSnapshot[] = selectedCartItems.map((entry) => ({
        itemId: entry.item.id,
        name: entry.item.name,
        unitPrice: entry.unitPrice,
        quantity: entry.quantity,
        lineTotal: entry.lineTotal,
      }));

      const savedBill = createAndSaveBill(snapshots, employeePin);

      setCartQuantities({});
      setConfirmedBill(savedBill);
      setPrintStatusMessage(null);
      setIsPrintDialogOpen(true);
      reloadData();
    } catch (err: any) {
      alert(`Could not save bill: ${err?.message || 'Database error'}`);
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
            </div>

            {/* If no items configured by owner */}
            {items.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-lg p-3 text-center flex flex-col items-center">
                <AlertCircle className="w-6 h-6 text-blue-600 stroke-[2.5] mb-1" />
                <h3 className="font-black text-sm text-slate-900 uppercase">{t.noItemsConfigured}</h3>
                <p className="text-xs font-bold text-slate-500 max-w-xs mt-0.5">
                  {t.askOwnerToAddItems}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {items.map((item) => {
                  const qtyInCart = cartQuantities[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className={`p-2 rounded-lg border-2 transition-all flex flex-col justify-between shadow-xs ${
                        qtyInCart > 0
                          ? 'bg-blue-50/70 border-blue-600 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="mb-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-black text-slate-900 text-base leading-tight uppercase">
                            {item.name}
                          </h4>
                          {qtyInCart > 0 && (
                            <span className="bg-blue-600 text-white font-black text-xs px-1.5 py-0.5 rounded shadow-xs shrink-0">
                              {t.qty}: {qtyInCart}
                            </span>
                          )}
                        </div>
                        <div className="text-blue-700 font-black text-xl mt-0.5">
                          {isTa ? 'ரூ.' : 'Rs.'} {item.price.toFixed(0)}
                        </div>
                      </div>

                      {/* Quantity Stepper - Compact Small Div, Big Bold Numbers */}
                      <div className="flex items-center justify-between bg-slate-100 rounded-md p-0.5 border border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item.id)}
                          disabled={qtyInCart === 0}
                          className="w-7 h-7 rounded bg-white hover:bg-slate-200 active:scale-95 text-slate-900 font-black border border-slate-300 flex items-center justify-center transition disabled:opacity-30 disabled:hover:bg-white cursor-pointer shadow-xs"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <div className="text-center font-black font-mono text-lg text-slate-900 px-2">
                          {qtyInCart}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleIncrement(item.id)}
                          className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black flex items-center justify-center transition shadow-xs cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
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
              <div className="flex-1 min-h-[120px] max-h-[220px] overflow-y-auto space-y-1 pr-1">
                {selectedCartItems.length === 0 ? (
                  <div className="h-full py-6 flex flex-col items-center justify-center text-center text-slate-400">
                    <Receipt className="w-6 h-6 stroke-[1.5] text-slate-300 mb-1" />
                    <span className="text-xs font-bold">{t.noItemsAdded}</span>
                    <span className="text-[11px] font-bold text-slate-400">{t.tapPlusToStart}</span>
                  </div>
                ) : (
                  selectedCartItems.map((entry) => (
                    <div
                      key={entry.item.id}
                      className="bg-slate-50 border border-slate-200 rounded-md p-1.5 flex items-center justify-between"
                    >
                      <div className="truncate pr-1">
                        <div className="font-black text-slate-900 text-xs uppercase truncate">
                          {entry.item.name}
                        </div>
                        <div className="text-[11px] font-bold text-slate-600">
                          {entry.quantity} &times; {isTa ? 'ரூ.' : 'Rs.'} {entry.unitPrice.toFixed(0)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-blue-700 text-sm">
                          {isTa ? 'ரூ.' : 'Rs.'} {entry.lineTotal.toFixed(0)}
                        </div>
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

            {/* Print action buttons */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrintViaBluetooth(confirmedBill)}
                  disabled={isPrinting}
                  className="py-2.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase flex items-center justify-center gap-1 transition shadow-xs cursor-pointer disabled:opacity-50"
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

                <button
                  type="button"
                  onClick={() => handleBrowserPrint(confirmedBill)}
                  className="py-2.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-black text-xs uppercase flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                  {t.systemPrint}
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsBluetoothModalOpen(true)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase transition cursor-pointer"
                >
                  {t.bluetoothSetup}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintDialogOpen(false)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase transition cursor-pointer"
                >
                  {t.doneNext}
                </button>
              </div>
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
    </div>
  );
};
