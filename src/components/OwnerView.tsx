import React, { useState, useEffect } from 'react';
import {
  getCatalogItems,
  addCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  clearAllCatalogItems,
  resetToDefaultChickenItems,
  getTodayDateString,
  getSalesSummaryForDate,
  getItemSalesReportForDate,
  getAllTimeSalesSummary,
  getSavedBills,
  getShopSettings,
  subscribeToStore,
  clearDatabaseDailyData,
  getLast7DaysSalesData,
  DailySalesDataPoint,
  syncAllDataToFirebase,
  getThreeDayResetInfo,
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
  Smartphone,
  TrendingUp,
  Scale,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { ReceiptView } from './ReceiptView';
import { PinPad } from './PinPad';
import { Language, translations } from '../utils/translations';
import { LanguageToggle } from './LanguageToggle';
import { AppLogo } from './AppLogo';
import { ItemModal } from './ItemModal';

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

  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState<CatalogItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState<string | null>(null);
  const [isClearConfirmModalOpen, setIsClearConfirmModalOpen] = useState(false);
  const [isClearAllItemsModalOpen, setIsClearAllItemsModalOpen] = useState(false);

  const [dataClearedNotice, setDataClearedNotice] = useState(false);

  // Search in bills
  const [billSearchQuery, setBillSearchQuery] = useState('');

  // Firebase Cloud Sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAllDataToFirebase();
      setSyncMessage(
        isTa
          ? `Firebase-ல் வெற்றிகரமாக சேமிக்கப்பட்டது (${res.itemsCount} உணவுகள், ${res.billsCount} பில்கள்)`
          : `Saved to Firebase successfully (${res.itemsCount} items, ${res.billsCount} bills)`
      );
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setSyncMessage(isTa ? 'Firebase ஒத்திசைவு பிழை' : 'Firebase sync error');
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

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

  const handleOpenClearConfirm = () => {
    setIsClearConfirmModalOpen(true);
  };

  const handleExecuteClearDatabase = () => {
    clearDatabaseDailyData();
    setIsClearConfirmModalOpen(false);
    setDataClearedNotice(true);
    setTimeout(() => setDataClearedNotice(false), 3000);
    reloadData();
  };

  // Item Form Handlers
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteItemConfirm = async () => {
    if (itemToDelete) {
      const idToDelete = itemToDelete.id;
      const nameToDelete = itemToDelete.name;
      setIsDeletingItem(true);
      try {
        await deleteCatalogItem(idToDelete);
        setItemToDelete(null);
        reloadData();
        setDeleteSuccessNotice(
          isTa
            ? `"${nameToDelete}" உணவு டேட்டாபேஸிலிருந்து வெற்றிகரமாக நீக்கப்பட்டது.`
            : `"${nameToDelete}" was deleted from the database successfully.`
        );
        setTimeout(() => setDeleteSuccessNotice(null), 3500);
      } catch (err) {
        console.error('Failed to delete item:', err);
        reloadData();
      } finally {
        setIsDeletingItem(false);
      }
    }
  };

  const handleClearAllItemsConfirm = () => {
    clearAllCatalogItems();
    setIsClearAllItemsModalOpen(false);
    reloadData();
    setDeleteSuccessNotice(
      isTa
        ? 'டேட்டாபேஸிலிருந்து அனைத்து உணவுப் பொருட்களும் வெற்றிகரமாக நீக்கப்பட்டன.'
        : 'All items have been cleared from the database successfully.'
    );
    setTimeout(() => setDeleteSuccessNotice(null), 3500);
  };

  const handleResetChickenCuts = () => {
    resetToDefaultChickenItems();
    reloadData();
    setDeleteSuccessNotice(
      isTa
        ? 'தரநிலை கோழி பட்டியல் மீட்டமைக்கப்பட்டது.'
        : 'Standard chicken cuts restored successfully.'
    );
    setTimeout(() => setDeleteSuccessNotice(null), 3500);
  };

  // Calculations for Reports
  const todayDateStr = getTodayDateString();
  const isViewingToday = selectedDate === todayDateStr;
  const salesSummary = getSalesSummaryForDate(selectedDate);
  const itemSalesReport = getItemSalesReportForDate(selectedDate);
  const allTimeSummary = getAllTimeSalesSummary();
  const last7DaysData = getLast7DaysSalesData();
  const last7DaysTotal = last7DaysData.reduce((sum, d) => sum + d.totalSales, 0);
  const last7DaysBills = last7DaysData.reduce((sum, d) => sum + d.billCount, 0);

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
            {/* Firebase Cloud Sync Button */}
            <button
              onClick={handleSyncCloud}
              disabled={isSyncing}
              title={isTa ? 'எல்லா தரவையும் Firebase-ல் சேமிக்கவும்' : 'Save all data in Firebase'}
              className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs font-black flex items-center gap-1 transition cursor-pointer disabled:opacity-50 uppercase"
            >
              <Cloud className={`w-3.5 h-3.5 stroke-[2.5] ${isSyncing ? 'animate-pulse text-amber-600' : 'text-blue-600'}`} />
              <span className="hidden sm:inline">{isSyncing ? (isTa ? 'சேமிக்கிறது...' : 'Syncing...') : 'Firebase'}</span>
            </button>

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

        {/* Sync Toast Notification */}
        {syncMessage && (
          <div className="mt-1 px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
              <span>{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-emerald-100 hover:text-white p-0.5">
              <X className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        )}
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
            {/* Delete Success Notice Banner */}
            {deleteSuccessNotice && (
              <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-1.5 animate-in fade-in shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 stroke-[2.5]" />
                <span>{deleteSuccessNotice}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white border border-blue-200 p-2 rounded-xl shadow-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase">
                {t.foodItemsAndFixedPrices}
              </h2>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsClearAllItemsModalOpen(true)}
                  title={isTa ? 'டேட்டாபேஸிலிருந்து அனைத்து பொருட்களையும் நீக்கு' : 'Clear all items from database'}
                  className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition uppercase"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isTa ? 'அனைத்தும் நீக்கு' : 'Clear Database'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetChickenCuts}
                  title={isTa ? 'தரநிலை கோழி பட்டியல்' : 'Restore Standard Cuts'}
                  className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-black text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition uppercase"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isTa ? 'கோழி பட்டியல்' : 'Standard Cuts'}</span>
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition uppercase"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{t.addItem}</span>
                </button>
              </div>
            </div>

            {/* Items List - Compact Small Divs */}
            {items.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center flex flex-col items-center">
                <UtensilsCrossed className="w-8 h-8 text-blue-600 stroke-[2] mb-1.5" />
                <h3 className="font-black text-sm text-slate-900 uppercase mb-1">{t.noItemsInCatalog}</h3>
                <p className="text-xs font-bold text-slate-500 mb-3 max-w-xs">
                  {isTa ? 'டேட்டாபேஸ் காலியாக உள்ளது. புதிய உணவைச் சேர்க்கலாம் அல்லது தரநிலை பட்டியலை ஏற்றலாம்.' : 'Database is empty. Add a new item or load standard cuts.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetChickenCuts}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition uppercase"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isTa ? 'கோழி பட்டியல் ஏற்று' : 'Load Standard Cuts'}</span>
                  </button>
                  <button
                    onClick={handleOpenAddModal}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition uppercase"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    {t.addFirstItem}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-slate-200/90 hover:border-blue-500 rounded-xl p-2.5 flex flex-col justify-between shadow-xs hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4 className="font-black text-slate-900 text-base leading-tight uppercase truncate">
                          {item.name}
                        </h4>
                        {item.pricingType === 'gram' && (
                          <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                            {t.gramType}
                          </span>
                        )}
                        {item.pricingType === 'plate' && (
                          <span className="text-[10px] font-black uppercase text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded shrink-0">
                            {t.plateType}
                          </span>
                        )}
                        {(!item.pricingType || item.pricingType === 'fixed') && (
                          <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                            {t.fixedType}
                          </span>
                        )}
                      </div>

                      {/* Tiers display */}
                      {item.pricingType === 'gram' && item.gramPrices ? (
                        <div className="grid grid-cols-2 gap-1 my-1.5 p-1.5 rounded-lg bg-blue-50/50 border border-blue-100 text-[11px] font-mono">
                          <div className="flex justify-between px-1">
                            <span className="text-slate-500 font-bold">100gm:</span>
                            <span className="font-black text-blue-900">{currencySymbol} {item.gramPrices.p100g}</span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-slate-500 font-bold">{item.gramPrices.p250g !== undefined ? '250gm:' : '200gm:'}</span>
                            <span className="font-black text-blue-900">{currencySymbol} {item.gramPrices.p250g ?? item.gramPrices.p200g}</span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-slate-500 font-bold">500gm:</span>
                            <span className="font-black text-blue-900">{currencySymbol} {item.gramPrices.p500g}</span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-slate-500 font-bold">1 KG:</span>
                            <span className="font-black text-blue-900">{currencySymbol} {item.gramPrices.p1kg}</span>
                          </div>
                        </div>
                      ) : item.pricingType === 'plate' && item.platePrices ? (
                        <div className="grid grid-cols-2 gap-1 my-1.5 p-1.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] font-mono">
                          <div className="flex justify-between px-1">
                            <span className="text-slate-500 font-bold">1 Plt:</span>
                            <span className="font-black text-indigo-900">{currencySymbol} {item.platePrices.plate1}</span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-slate-500 font-bold">2 Plt:</span>
                            <span className="font-black text-indigo-900">{currencySymbol} {item.platePrices.plate2}</span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-slate-500 font-bold">3 Plt:</span>
                            <span className="font-black text-indigo-900">{currencySymbol} {item.platePrices.plate3}</span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-slate-500 font-bold">4 Plt:</span>
                            <span className="font-black text-indigo-900">{currencySymbol} {item.platePrices.plate4}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-between my-1.5 px-0.5">
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.fixedPrice}:</span>
                            <span className="text-xl font-black text-blue-700 font-mono">
                              {currencySymbol} {item.price.toFixed(0)}
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                            {item.weightKg ? `${item.weightKg} ${t.kgLabel}` : `0.5 ${t.kgLabel}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-100 text-blue-700 font-black text-xs border border-slate-300 transition cursor-pointer flex items-center gap-1"
                          title={t.editItem}
                        >
                          <Pencil className="w-3 h-3 stroke-[2.5]" />
                          <span>{t.edit}</span>
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs border border-red-200 transition cursor-pointer flex items-center gap-1"
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 uppercase">
                  {t.salesSummaryAndReports}
                </h2>
                {(() => {
                  const rInfo = getThreeDayResetInfo();
                  return (
                    <span className="text-[10px] sm:text-[11px] font-black text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      {isTa
                        ? `3-நாள் சுழற்சி: நாள் ${rInfo.daysElapsed}/3 (தானியங்கி நீக்கம்)`
                        : `3-Day Cycle: Day ${rInfo.daysElapsed} of 3 (Auto-clears)`}
                    </span>
                  );
                })()}
              </div>

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
                  onClick={handleOpenClearConfirm}
                  className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 text-xs font-black cursor-pointer uppercase flex items-center gap-1 transition"
                  title={t.clearDatabaseNow}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.clearDatabaseNow}</span>
                </button>
              </div>
            </div>

            {dataClearedNotice && (
              <div className="p-1.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                <span>{t.databaseCleared}</span>
              </div>
            )}

            {/* Top Stat Cards - 4 Compact Cards with Big Bold Text */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Bills Count */}
              <div className="bg-gradient-to-br from-white via-white to-blue-50/50 border-2 border-blue-200/80 hover:border-blue-400 rounded-xl p-2.5 flex flex-col justify-between shadow-xs transition-all">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  {isViewingToday ? t.todayBills : `${t.billsDate} (${selectedDate})`}
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono mt-1">
                  {salesSummary.billCount}
                </div>
              </div>

              {/* Total Sales Amount */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl p-2.5 flex flex-col justify-between shadow-md shadow-blue-500/20">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-100 mb-1">
                  {isViewingToday ? t.todayTotalSales : `${t.totalSales} (${selectedDate})`}
                </span>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 font-mono">
                  {currencySymbol} {salesSummary.totalSales.toLocaleString()}
                </div>
              </div>

              {/* Total Items Sold (Portions) */}
              <div className="bg-gradient-to-br from-white via-white to-slate-50 border-2 border-slate-200 hover:border-indigo-300 rounded-xl p-2.5 flex flex-col justify-between shadow-xs transition-all">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  {t.portionsSold}
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono mt-1">
                  {salesSummary.totalItemsSold}
                </div>
              </div>

              {/* Total KG Sold - Item by Item Breakdown */}
              <div className="col-span-2 lg:col-span-4 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 border-2 border-emerald-300 hover:border-emerald-500 rounded-xl p-3 flex flex-col shadow-xs transition-all">
                {/* Header with Total KG & Portions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                      <Scale className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-emerald-950">
                        {t.kgSold} ({isTa ? 'உணவு வாரியாக' : 'Item by Item'})
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 shrink-0 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      {isTa ? 'மொத்த எடை' : 'Total KG'}:
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-800 font-mono">
                      {salesSummary.totalKgSold.toFixed(2)}
                    </span>
                    <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {t.kgLabel}
                    </span>
                  </div>
                </div>

                {/* Item-by-Item Cards */}
                {itemSalesReport.length === 0 ? (
                  <div className="py-4 text-center text-xs font-bold text-slate-400 bg-white/70 rounded-lg border border-dashed border-emerald-200 mt-2.5">
                    {t.noItemsSoldOnDate}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2.5">
                    {itemSalesReport.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white border-2 border-emerald-200/90 hover:border-emerald-400 rounded-lg px-3 py-2 flex flex-row items-center justify-between gap-2 shadow-2xs transition hover:shadow-xs"
                      >
                        {/* Left: Item Name & Price/Portions */}
                        <div className="min-w-0 flex-1">
                          <h5 className="font-black text-slate-900 text-sm uppercase leading-tight truncate">
                            {item.name}
                          </h5>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                            <span className="font-bold">
                              {item.quantity} {isTa ? 'பங்கு' : 'qty'} &times; {currencySymbol} {item.unitPrice.toFixed(0)}
                            </span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="font-black text-blue-700 font-mono text-xs sm:text-sm">
                              {currencySymbol} {item.totalAmount.toFixed(0)}
                            </span>
                          </div>
                        </div>

                        {/* Right: Total KG Sold */}
                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md shrink-0">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                            {t.kgSold}:
                          </span>
                          <span className="text-sm sm:text-base font-black font-mono text-emerald-800">
                            {item.totalWeightKg.toFixed(2)} {t.kgLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Visual Bar Chart: Daily Sales Totals for Last 7 Days (using Recharts) */}
            <div className="bg-white border-2 border-slate-200 rounded-lg p-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <h3 className="font-black text-sm text-slate-900 uppercase">
                    {t.last7DaysSales}
                  </h3>
                </div>
              </div>

              {/* Responsive BarChart */}
              <div className="w-full h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={last7DaysData}
                    margin={{ top: 10, right: 6, left: -14, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dayLabel"
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val: number) =>
                        val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as DailySalesDataPoint;
                          return (
                            <div className="bg-slate-900 text-white rounded-lg p-2 shadow-xl border border-slate-700 text-xs font-bold pointer-events-none">
                              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-mono">
                                {data.dateString} {data.isToday ? '(Today)' : ''}
                              </div>
                              <div className="text-sm font-black text-emerald-400 mt-0.5">
                                {currencySymbol} {data.totalSales.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-300 font-bold">
                                {data.billCount} {data.billCount === 1 ? 'bill' : 'bills'}
                              </div>
                              <div className="text-[9px] text-blue-300 mt-1 italic">
                                Tap bar to filter table
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="totalSales"
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => {
                        if (data && (data as any).dateString) {
                          setSelectedDate((data as any).dateString);
                        }
                      }}
                    >
                      {last7DaysData.map((entry) => {
                        const isSelected = entry.dateString === selectedDate;
                        let fillColor = '#3b82f6';
                        if (isSelected) {
                          fillColor = '#1d4ed8';
                        } else if (entry.isToday) {
                          fillColor = '#2563eb';
                        } else if (entry.totalSales === 0) {
                          fillColor = '#cbd5e1';
                        }
                        return (
                          <Cell
                            key={entry.dateString}
                            fill={fillColor}
                            stroke={isSelected ? '#1e3a8a' : 'transparent'}
                            strokeWidth={isSelected ? 2 : 0}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & quick helper */}
              <div className="flex items-center text-[10px] text-slate-500 font-bold pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                    <span>{t.revenue}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-900 border border-blue-950 inline-block" />
                    <span>Selected Date</span>
                  </span>
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
                        <th className="py-1 px-1.5 text-center">{t.totalKg}</th>
                        <th className="py-1 px-1.5 text-right">{t.unitPrice}</th>
                        <th className="py-1 px-1.5 text-right">{t.totalAmount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemSalesReport.map((item, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/50">
                          <td className="py-1 px-1.5 text-slate-900 font-black text-sm uppercase">
                            <div>{item.name}</div>
                            <span className="text-[10px] text-slate-400 font-bold lowercase">
                              ({item.weightKg} {t.kgLabel} / {isTa ? 'பங்கு' : 'portion'})
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-center text-blue-800 font-black text-base font-mono">
                            {item.quantity}
                          </td>
                          <td className="py-1 px-1.5 text-center font-mono">
                            <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-300 font-black px-1.5 py-0.5 rounded text-xs">
                              {item.totalWeightKg.toFixed(2)} {t.kgLabel}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-right text-slate-700 font-bold text-xs font-mono">
                            {currencySymbol} {item.unitPrice.toFixed(0)}
                          </td>
                          <td className="py-1 px-1.5 text-right text-blue-700 font-black text-base font-mono">
                            {currencySymbol} {item.totalAmount.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-400 bg-blue-50 text-slate-900 font-black">
                        <td className="py-1.5 px-1.5 uppercase text-sm">{t.total}</td>
                        <td className="py-1.5 px-1.5 text-center text-blue-800 text-base font-mono">
                          {salesSummary.totalItemsSold}
                        </td>
                        <td className="py-1.5 px-1.5 text-center font-mono">
                          <span className="inline-block bg-emerald-600 text-white font-black px-2 py-0.5 rounded text-xs shadow-2xs">
                            {salesSummary.totalKgSold.toFixed(2)} {t.kgLabel}
                          </span>
                        </td>
                        <td className="py-1.5 px-1.5 text-right text-slate-400 font-mono">-</td>
                        <td className="py-1.5 px-1.5 text-right text-blue-800 text-lg font-mono">
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

            {/* Storage Policy Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs font-bold text-blue-900 flex items-center gap-1.5 shadow-2xs">
              <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t.savedOnPhoneNotice} ({allBills.length} {t.billsDate})</span>
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

      {/* ================= MODAL: ADD / EDIT ITEM ================= */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={reloadData}
        editingItem={editingItem}
        lang={lang}
      />

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
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeletingItem}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase cursor-pointer disabled:opacity-50"
              >
                {t.keepItem}
              </button>
              <button
                type="button"
                onClick={handleDeleteItemConfirm}
                disabled={isDeletingItem}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase shadow-sm cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isDeletingItem ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isTa ? 'நீக்குகிறது...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{t.deleteItem}</span>
                  </>
                )}
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
      {/* ================= MODAL: CLEAR DAILY DATA CONFIRMATION ================= */}
      {isClearConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="w-full max-w-xs bg-white border-2 border-red-300 rounded-2xl p-4 text-slate-900 shadow-xl relative animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-2">
              <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            </div>

            <h3 className="text-base font-black text-slate-900 mb-1 uppercase">
              {t.clearDatabaseNow}?
            </h3>
            <p className="text-xs font-bold text-slate-600 mb-3 leading-snug">
              {t.clearDatabaseConfirm}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmModalOpen(false)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase cursor-pointer transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteClearDatabase}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black uppercase shadow-sm cursor-pointer transition"
              >
                {t.clearDatabaseNow}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CLEAR ALL CATALOG ITEMS CONFIRMATION ================= */}
      {isClearAllItemsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="w-full max-w-xs bg-white border-2 border-red-300 rounded-2xl p-4 text-slate-900 shadow-xl relative animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-2">
              <Trash2 className="w-5 h-5 stroke-[2.5]" />
            </div>

            <h3 className="text-base font-black text-slate-900 mb-1 uppercase">
              {isTa ? 'அனைத்து பொருட்களையும் நீக்கவா?' : 'Clear All Items from Database?'}
            </h3>
            <p className="text-xs font-bold text-slate-600 mb-3.5 leading-relaxed">
              {isTa
                ? 'டேட்டாபேஸ் மற்றும் Firebase-ல் உள்ள அனைத்து உணவுப் பொருட்களும் முழுமையாக நீக்கப்படும். எப்போது வேண்டுமானாலும் புதிய பொருட்களைச் சேர்க்கலாம் அல்லது தரநிலை பட்டியலை மீட்டெடுக்கலாம்.'
                : 'All items will be permanently cleared from the database and Firebase. You can add new items or restore standard cuts at any time.'}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsClearAllItemsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase cursor-pointer transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleClearAllItemsConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black uppercase shadow-sm cursor-pointer transition"
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
