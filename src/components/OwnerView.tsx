import React, { useState, useEffect } from 'react';
import {
  getCatalogItems,
  addCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  getTodayDateString,
  getSalesSummaryForDate,
  getItemSalesReportForDate,
  getAllTimeSalesSummary,
  getSavedBills,
  getShopSettings,
  updateShopSettings,
  subscribeToStore,
  clearAllBillsData,
} from '../db/storage';
import { CatalogItem, ShopSettings, Bill } from '../types';
import {
  UtensilsCrossed,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
} from 'lucide-react';
import { ReceiptView } from './ReceiptView';
import { PinPad } from './PinPad';
import { Language, translations } from '../utils/translations';
import { LanguageToggle } from './LanguageToggle';
import { AppLogo } from './AppLogo';

interface OwnerViewProps {
  onLogout: () => void;
  lang?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const OwnerView: React.FC<OwnerViewProps> = ({
  onLogout,
  lang = 'en',
  onLanguageChange,
}) => {
  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';
  const currencySymbol = isTa ? 'ரூ.' : 'Rs.';

  const [activeTab, setActiveTab] = useState<'ITEMS' | 'REPORTS' | 'BILLS_READONLY'>('ITEMS');
  
  // Data states
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(getShopSettings());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedBillForView, setSelectedBillForView] = useState<Bill | null>(null);

  // Exit PIN verification modal state
  const [isExitPinModalOpen, setIsExitPinModalOpen] = useState(false);

  // Item form modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemFormError, setItemFormError] = useState<string | null>(null);

  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState<CatalogItem | null>(null);

  const [dataClearedNotice, setDataClearedNotice] = useState(false);

  // Search in bills
  const [billSearchQuery, setBillSearchQuery] = useState('');

  // Reload data from storage
  const reloadData = () => {
    setItems(getCatalogItems());
    setSettings(getShopSettings());
  };

  useEffect(() => {
    reloadData();
    const unsub = subscribeToStore(reloadData);
    return unsub;
  }, []);

  // Item Form Handlers
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemPrice('');
    setItemFormError(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.price.toString());
    setItemFormError(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setItemFormError(isTa ? 'சரியான உணவுப் பெயரை உள்ளிடவும்.' : 'Please enter a valid item name.');
      return;
    }
    const priceNum = parseFloat(itemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setItemFormError(isTa ? '0-க்கு மேல் சரியான விற்பனை விலையை உள்ளிடவும்.' : 'Please enter a valid selling price greater than 0.');
      return;
    }

    if (editingItem) {
      updateCatalogItem(editingItem.id, itemName.trim(), priceNum);
    } else {
      addCatalogItem(itemName.trim(), priceNum);
    }

    setIsItemModalOpen(false);
    reloadData();
  };

  const handleDeleteItemConfirm = () => {
    if (itemToDelete) {
      deleteCatalogItem(itemToDelete.id);
      setItemToDelete(null);
      reloadData();
    }
  };



  const handleClearAllBills = () => {
    if (window.confirm(t.clearAllConfirm)) {
      clearAllBillsData();
      setDataClearedNotice(true);
      setTimeout(() => setDataClearedNotice(false), 3000);
      reloadData();
    }
  };

  // Calculations for Reports
  const todayDateStr = getTodayDateString();
  const isViewingToday = selectedDate === todayDateStr;
  const salesSummary = getSalesSummaryForDate(selectedDate);
  const itemSalesReport = getItemSalesReportForDate(selectedDate);
  const allTimeSummary = getAllTimeSalesSummary();

  // Filter bills for read-only view
  const allBills = getSavedBills();
  const filteredBills = allBills.filter((b) => {
    const q = billSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.billNumber.toLowerCase().includes(q) ||
      b.dateString.includes(q) ||
      b.items.some((i) => i.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-bold">
      {/* Top Navigation Bar - Small & Compact */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-blue-200 px-2.5 py-1 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppLogo size="sm" />
            <div>
              <h1 className="font-black text-sm tracking-wide text-slate-900 uppercase">
                {t.ownerPortal}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onLanguageChange && (
              <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />
            )}
            <button
              onClick={() => setIsExitPinModalOpen(true)}
              className="px-2.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-300 text-xs font-black flex items-center gap-1 transition cursor-pointer uppercase"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t.exit}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs - Small Compact Bar with Bold Labels */}
      <div className="bg-white border-b border-slate-200 px-2 py-0.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex overflow-x-auto gap-1 py-0.5">
          <button
            onClick={() => setActiveTab('ITEMS')}
            className={`px-2.5 py-1 rounded-md text-xs font-black flex items-center transition cursor-pointer whitespace-nowrap uppercase ${
              activeTab === 'ITEMS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.itemsAndPrices}</span>
          </button>

          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-2.5 py-1 rounded-md text-xs font-black flex items-center transition cursor-pointer whitespace-nowrap uppercase ${
              activeTab === 'REPORTS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.salesReports}</span>
          </button>

          <button
            onClick={() => setActiveTab('BILLS_READONLY')}
            className={`px-2.5 py-1 rounded-md text-xs font-black flex items-center transition cursor-pointer whitespace-nowrap uppercase ${
              activeTab === 'BILLS_READONLY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.billsArchive}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area - Compact Small Cards with Big Bold Text */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-1.5 sm:p-2">
        {/* ================= TAB 1: ITEM & PRICE MANAGEMENT ================= */}
        {activeTab === 'ITEMS' && (
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-white border border-blue-200 p-1.5 rounded-lg shadow-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase">
                {t.foodItemsAndFixedPrices}
              </h2>
              <button
                onClick={handleOpenAddModal}
                className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition shrink-0 uppercase"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>{t.addItem}</span>
              </button>
            </div>

            {/* Items List - Compact Small Divs */}
            {items.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-3 text-center flex flex-col items-center">
                <UtensilsCrossed className="w-6 h-6 text-blue-600 stroke-[2] mb-1" />
                <h3 className="font-black text-sm text-slate-900 uppercase mb-1.5">{t.noItemsInCatalog}</h3>
                <button
                  onClick={handleOpenAddModal}
                  className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition uppercase"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  {t.addFirstItem}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-lg p-2 flex flex-col justify-between shadow-xs transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <h4 className="font-black text-slate-900 text-base leading-tight uppercase">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-mono font-black text-slate-400 shrink-0">
                          #{item.id.slice(-4)}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 my-1">
                        <span className="text-[11px] font-black text-slate-500 uppercase">{t.fixedPrice}:</span>
                        <span className="text-xl font-black text-blue-700">
                          {currencySymbol} {item.price.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 font-black text-xs border border-slate-300 transition cursor-pointer flex items-center gap-0.5"
                          title={t.editItem}
                        >
                          <Pencil className="w-3 h-3 stroke-[2.5]" />
                          <span>{t.edit}</span>
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs border border-red-200 transition cursor-pointer flex items-center gap-0.5"
                          title={t.deleteItem}
                        >
                          <Trash2 className="w-3 h-3 stroke-[2.5]" />
                          <span>{t.delete}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: TODAY'S BILLING SUMMARY & SALES REPORTS ================= */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-2">
            {/* Header & Date Selector - Compact */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white border border-blue-200 p-2 rounded-lg shadow-xs">
              <h2 className="text-base font-black text-slate-900 uppercase">
                {t.salesSummaryAndReports}
              </h2>

              {/* Date Filter & Clear Daily Data */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-md px-2 py-0.5 text-xs text-slate-900 font-black focus:outline-none focus:border-blue-600 cursor-pointer"
                />
                {!isViewingToday && (
                  <button
                    onClick={() => setSelectedDate(todayDateStr)}
                    className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-black cursor-pointer uppercase"
                  >
                    {t.today}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAllBills}
                  className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 text-xs font-black cursor-pointer uppercase flex items-center gap-1 transition"
                  title={t.clearAllBillsDataNow}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.clearAllBillsDataNow}</span>
                </button>
              </div>
            </div>

            {dataClearedNotice && (
              <div className="p-1.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                {t.dataClearedAlert}
              </div>
            )}

            {/* Top Stat Cards - Compact Divs with Big Bold Text */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Bills Count */}
              <div className="bg-white border-2 border-slate-200 rounded-lg p-2 flex flex-col justify-between shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-0.5">
                  {isViewingToday ? t.todayBills : `${t.billsDate} (${selectedDate})`}
                </span>
                <div className="text-2xl font-black text-slate-900">
                  {salesSummary.billCount}
                </div>
              </div>

              {/* Total Sales Amount */}
              <div className="bg-blue-600 text-white rounded-lg p-2 flex flex-col justify-between shadow-md">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-100 mb-0.5">
                  {isViewingToday ? t.todayTotalSales : `${t.totalSales} (${selectedDate})`}
                </span>
                <div className="text-2xl font-black text-white">
                  {currencySymbol} {salesSummary.totalSales.toFixed(0)}
                </div>
              </div>

              {/* Total Items Sold */}
              <div className="bg-white border-2 border-slate-200 rounded-lg p-2 flex flex-col justify-between shadow-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-0.5">
                  {t.portionsSold}
                </span>
                <div className="text-2xl font-black text-slate-900">
                  {salesSummary.totalItemsSold}
                </div>
              </div>
            </div>

            {/* Item Sales Report Table - Compact Small Table, Big Bold Text */}
            <div className="bg-white border-2 border-slate-200 rounded-lg p-2 shadow-xs">
              <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-200">
                <h3 className="font-black text-sm text-slate-900 uppercase">
                  {t.itemSalesBreakdown}
                </h3>
                <span className="text-[11px] font-black text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                  {itemSalesReport.length} {t.itemsSoldPill}
                </span>
              </div>

              {itemSalesReport.length === 0 ? (
                <div className="py-3 text-center text-xs font-bold text-slate-400">
                  {t.noItemsSoldOnDate}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700 text-xs uppercase font-black">
                        <th className="py-1 px-1.5">{t.itemName}</th>
                        <th className="py-1 px-1.5 text-center">{t.qty}</th>
                        <th className="py-1 px-1.5 text-right">{t.unitPrice}</th>
                        <th className="py-1 px-1.5 text-right">{t.totalAmount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemSalesReport.map((item, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/50">
                          <td className="py-1 px-1.5 text-slate-900 font-black text-sm uppercase">
                            {item.name}
                          </td>
                          <td className="py-1 px-1.5 text-center text-blue-800 font-black text-base">
                            {item.quantity}
                          </td>
                          <td className="py-1 px-1.5 text-right text-slate-600 font-bold text-xs">
                            {currencySymbol} {item.unitPrice.toFixed(0)}
                          </td>
                          <td className="py-1 px-1.5 text-right text-blue-700 font-black text-base">
                            {currencySymbol} {item.totalAmount.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-400 bg-blue-50 text-slate-900 font-black">
                        <td className="py-1 px-1.5 uppercase text-sm">{t.total}</td>
                        <td className="py-1 px-1.5 text-center text-blue-800 text-base">
                          {salesSummary.totalItemsSold}
                        </td>
                        <td className="py-1 px-1.5 text-right text-slate-400">-</td>
                        <td className="py-1 px-1.5 text-right text-blue-800 text-lg">
                          {currencySymbol} {salesSummary.totalSales.toFixed(0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* All-time Summary card - Compact */}
            <div className="bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-xs font-bold text-slate-600">
              <div>
                <span className="text-slate-900 font-black uppercase">{t.allTime}</span>{' '}
                {allTimeSummary.billCount} {t.totalLifetimeBills}
              </div>
              <div className="text-blue-700 font-black text-sm">
                {t.lifetimeRevenue} {currencySymbol} {allTimeSummary.totalSales.toFixed(0)}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BILLS ARCHIVE (READ-ONLY) ================= */}
        {activeTab === 'BILLS_READONLY' && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white border border-blue-200 p-2 rounded-lg shadow-xs">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5 uppercase">
                  <Receipt className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  {t.savedBillsReadOnly}
                </h2>
                <p className="text-[11px] font-bold text-slate-500">
                  {isTa ? 'முந்தைய பில் பதிவுகளின் பார்வை மட்டும்.' : 'Read-only view of historical billing records.'}
                </p>
              </div>

              {/* Search box */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400 stroke-[2.5]" />
                <input
                  type="text"
                  placeholder={t.searchBillPlaceholder}
                  value={billSearchQuery}
                  onChange={(e) => setBillSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md pl-7 pr-2 py-1 text-xs text-slate-900 font-black focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Bills List - Compact Small Divs */}
            {filteredBills.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center text-slate-400 text-xs font-bold">
                {t.noBillingRecordsFound}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-lg p-2 flex items-center justify-between gap-1.5 transition shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-black text-xs shrink-0">
                        {bill.billNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                          <span>{bill.dateString}</span>
                          <span>&bull;</span>
                          <span>{bill.timeString}</span>
                        </div>
                        <div className="text-[11px] font-black text-slate-700">
                          {bill.items.length} {isTa ? 'உணவுகள்' : 'items'} &bull; {bill.totalQuantity} {isTa ? 'எண்ணிக்கை' : 'portions'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-base font-black text-blue-700">
                          {currencySymbol} {bill.totalAmount.toFixed(0)}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedBillForView(bill)}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 font-black text-xs border border-slate-300 flex items-center gap-0.5 cursor-pointer uppercase"
                      >
                        <Eye className="w-3 h-3 stroke-[2.5]" />
                        <span>{t.view}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </main>

      {/* ================= MODAL: ADD / EDIT ITEM - Compact ================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-sm bg-white border-2 border-blue-200 rounded-2xl p-4 text-slate-900 shadow-xl relative">
            <button
              onClick={() => setIsItemModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-0.5 uppercase">
              {editingItem ? t.editItem : t.addFoodItem}
            </h3>
            <p className="text-xs font-bold text-slate-500 mb-3">
              {t.itemNameLabel} &amp; {t.priceLabel}
            </p>

            {itemFormError && (
              <div className="mb-2.5 p-2 rounded-md bg-red-100 border border-red-300 text-red-800 text-xs font-black">
                {itemFormError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-2.5">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase mb-0.5">
                  {t.itemNameLabel}
                </label>
                <input
                  type="text"
                  placeholder={isTa ? 'எ.கா. சிக்கன் தம் பிரியாணி' : 'e.g. Chicken Dum Biryani'}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-base font-black text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase mb-0.5">
                  {t.priceLabel}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 180"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-lg font-mono font-black text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase transition shadow-sm cursor-pointer"
                >
                  {editingItem ? t.save : t.add}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION - Compact ================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs bg-white border-2 border-red-300 rounded-2xl p-4 text-slate-900 shadow-xl relative">
            <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-2">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>

            <h3 className="text-base font-black text-slate-900 mb-1 uppercase">
              {t.deleteItemConfirmTitle} &ldquo;{itemToDelete.name}&rdquo;?
            </h3>
            <p className="text-xs font-bold text-slate-600 mb-3 leading-snug">
              {t.deleteItemConfirmText}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase cursor-pointer"
              >
                {t.keepItem}
              </button>
              <button
                onClick={handleDeleteItemConfirm}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase shadow-sm cursor-pointer"
              >
                {t.deleteItem}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: READ-ONLY BILL RECEIPT VIEWER - Compact ================= */}
      {selectedBillForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-sm bg-white border-2 border-blue-200 rounded-2xl p-3 text-slate-900 shadow-xl relative flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                <span className="font-black text-sm uppercase">{t.billReceiptReadOnly}</span>
              </div>
              <button
                onClick={() => setSelectedBillForView(null)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              <ReceiptView bill={selectedBillForView} settings={settings} lang={lang} />
            </div>

            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedBillForView(null)}
                className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase cursor-pointer"
              >
                {t.closeView}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXIT CONFIRMATION WITH PIN ================= */}
      {isExitPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xs">
            <PinPad
              title={t.exitOwnerPortal}
              subtitle={t.enterPinToConfirmExit}
              expectedPin={settings.ownerPin}
              onSuccess={() => {
                setIsExitPinModalOpen(false);
                onLogout();
              }}
              onCancel={() => setIsExitPinModalOpen(false)}
              lang={lang}
            />
          </div>
        </div>
      )}
    </div>
  );
};
