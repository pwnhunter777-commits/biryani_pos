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
  updateShopSettings,
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
  Settings,
  Save,
  Store,
  Shield,
  Printer,
  Check,
  Phone,
  FileText,
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

  const [activeTab, setActiveTab] = useState<'ITEMS' | 'REPORTS' | 'BILLS_READONLY' | 'SETTINGS'>('ITEMS');
  
  // Data states
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(getShopSettings());
  const [settingsForm, setSettingsForm] = useState<ShopSettings>(() => getShopSettings());
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);
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
    const s = getShopSettings();
    setSettings(s);
    setSettingsForm(s);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateShopSettings(settingsForm);
    setSettings(updated);
    setSettingsSavedNotice(true);
    setTimeout(() => setSettingsSavedNotice(false), 3500);
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-bold w-full max-w-full overflow-x-hidden">
      {/* Top Navigation Bar - Small & Compact */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-blue-200 px-2 sm:px-3 py-1.5 shadow-xs w-full max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <AppLogo size="sm" />
            <div className="min-w-0">
              <h1 className="font-black text-xs sm:text-sm tracking-wide text-slate-900 uppercase truncate">
                {t.ownerPortal}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Firebase Cloud Sync Button */}
            <button
              onClick={handleSyncCloud}
              disabled={isSyncing}
              title={isTa ? 'எல்லா தரவையும் Firebase-ல் சேமிக்கவும்' : 'Save all data in Firebase'}
              className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs font-black flex items-center gap-1 transition cursor-pointer disabled:opacity-50 uppercase"
            >
              <Cloud className={`w-3.5 h-3.5 stroke-[2.5] ${isSyncing ? 'animate-pulse text-amber-600' : 'text-blue-600'}`} />
              <span className="hidden sm:inline">{isSyncing ? (isTa ? 'சேமிக்கிறது...' : 'Syncing...') : 'Firebase'}</span>
            </button>

            {onLanguageChange && (
              <LanguageToggle currentLang={lang} onLanguageChange={onLanguageChange} />
            )}
            <button
              onClick={() => setIsExitPinModalOpen(true)}
              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-300 text-xs font-black flex items-center gap-1 transition cursor-pointer uppercase"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline sm:inline">{t.exit}</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Notification */}
        {syncMessage && (
          <div className="mt-1 px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[3] shrink-0" />
              <span className="truncate">{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-emerald-100 hover:text-white p-0.5 shrink-0">
              <X className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        )}
      </header>

      {/* Tabs - Small Compact Bar with Bold Labels */}
      <div className="bg-white border-b border-slate-200 px-2 py-1 shadow-xs w-full max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto flex overflow-x-auto gap-1 py-0.5">
          <button
            onClick={() => setActiveTab('ITEMS')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center transition cursor-pointer whitespace-nowrap uppercase shrink-0 ${
              activeTab === 'ITEMS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.itemsAndPrices}</span>
          </button>

          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center transition cursor-pointer whitespace-nowrap uppercase shrink-0 ${
              activeTab === 'REPORTS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.salesReports}</span>
          </button>

          <button
            onClick={() => setActiveTab('BILLS_READONLY')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center transition cursor-pointer whitespace-nowrap uppercase shrink-0 ${
              activeTab === 'BILLS_READONLY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>{t.billsArchive}</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition cursor-pointer whitespace-nowrap uppercase shrink-0 ${
              activeTab === 'SETTINGS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t.shopSettings}</span>
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
                <h3 className="font-black text-sm text-slate-900 uppercase mb-3">{t.noItemsInCatalog}</h3>
                <button
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition uppercase"
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
                    className="bg-white border-2 border-slate-200/90 hover:border-blue-500 rounded-xl p-2.5 flex flex-col justify-between shadow-xs hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <h4 className="font-black text-slate-900 text-base sm:text-lg leading-tight uppercase truncate">
                          {item.name}
                        </h4>
                      </div>

                      <div className="flex items-baseline justify-between my-2 px-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{isTa ? 'விற்பனை விலை:' : 'Selling Price:'}</span>
                          <span className="text-2xl font-black text-blue-700 font-mono">
                            {currencySymbol} {item.price.toFixed(0)}
                          </span>
                        </div>
                      </div>
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
              </div>

              {/* Date Filter */}
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
                    className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-black text-xs shrink-0">
                        {bill.billNumber}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                          <span>{bill.dateString}</span>
                          <span>&bull;</span>
                          <span>{bill.timeString}</span>
                        </div>
                        <div className="text-[11px] font-black text-slate-700 truncate">
                          {bill.items.length} {isTa ? 'உணவுகள்' : 'items'} &bull; {bill.totalQuantity} {isTa ? 'எண்ணிக்கை' : 'portions'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-black text-blue-700 font-mono">
                          {currencySymbol} {bill.totalAmount.toFixed(0)}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedBillForView(bill)}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-100 text-blue-700 font-black text-xs border border-slate-300 flex items-center gap-1 cursor-pointer uppercase transition"
                      >
                        <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{t.view}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: SHOP & BILLING SETTINGS ================= */}
        {activeTab === 'SETTINGS' && (
          <div className="space-y-3 pb-8">
            {/* Header Banner */}
            <div className="bg-white border border-blue-200 p-2.5 sm:p-3 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Settings className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight truncate">
                    {t.shopConfiguration}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-500">
                    {isTa ? 'கடை பெயர், ரசீது மற்றும் பிரிண்டர் அமைப்புகளை நிர்வகிக்கவும்.' : 'Manage shop details, thermal receipts, and security PINs.'}
                  </p>
                </div>
              </div>

              {settingsSavedNotice && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-1.5 shadow-2xs animate-in fade-in shrink-0">
                  <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                  <span>{t.settingsSaved}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              {/* Card 1: Shop Information */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
                  <Store className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                    {isTa ? 'கடை & முகவரி விவரங்கள்' : 'Shop & Address Details'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Shop Name */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                      {t.shopNameLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={isTa ? 'எ.கா. சுவையான பிரியாணி கடை' : 'e.g. Star Biryani & Fast Food'}
                      value={settingsForm.shopName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                      {t.taglineLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={isTa ? 'எ.கா. சுவையான மற்றும் பாரம்பரிய பிரியாணி' : 'e.g. Traditional & Authentic Taste'}
                      value={settingsForm.tagline || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                      {t.phoneLabel}
                    </label>
                    <input
                      type="text"
                      placeholder="9876543210"
                      value={settingsForm.phone || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                      {isTa ? 'முகவரி' : 'Address'}
                    </label>
                    <input
                      type="text"
                      placeholder={isTa ? 'எ.கா. மெயின் ரோடு, சென்னை' : 'e.g. Main Road, City'}
                      value={settingsForm.address || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>

                  {/* Receipt Footer Note */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                      {t.footerNoteLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={isTa ? 'மீண்டும் வருக! நன்றி!' : 'Thank you for your visit!'}
                      value={settingsForm.footerNote || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, footerNote: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Thermal Printer Paper Width */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
                  <Printer className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                    {t.paperWidthLabel}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, paperWidth: '58mm' })}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-center justify-between ${
                      settingsForm.paperWidth === '58mm'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-200'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-black text-xs sm:text-sm uppercase">{t.pocketPos}</div>
                      <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                        {isTa ? 'சிறிய புளூடூத் பிரிண்டர் (2 அங்குலம்)' : 'Standard handheld Bluetooth printer'}
                      </div>
                    </div>
                    {settingsForm.paperWidth === '58mm' && (
                      <Check className="w-5 h-5 text-blue-600 stroke-[3] shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, paperWidth: '80mm' })}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-center justify-between ${
                      settingsForm.paperWidth === '80mm'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-200'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-black text-xs sm:text-sm uppercase">{t.widePos}</div>
                      <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                        {isTa ? 'பெரிய டெஸ்க்டாப் பிரிண்டர் (3 அங்குலம்)' : 'Wide counter desktop printer'}
                      </div>
                    </div>
                    {settingsForm.paperWidth === '80mm' && (
                      <Check className="w-5 h-5 text-blue-600 stroke-[3] shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card 3: Security & PINs */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
                  <Shield className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                    {isTa ? 'பாதுகாப்பு & பின் எண்கள்' : 'Security & PIN Access'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Owner PIN */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                      {t.ownerPinLabel}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      inputMode="numeric"
                      value={settingsForm.ownerPin}
                      onChange={(e) => setSettingsForm({ ...settingsForm, ownerPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white tracking-widest text-center transition"
                    />
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                      {isTa ? 'இயல்புநிலை: 8888' : 'Default: 8888'}
                    </span>
                  </div>

                  {/* Employee PIN */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                      {t.employeePinLabel}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      inputMode="numeric"
                      value={settingsForm.employeePin}
                      onChange={(e) => setSettingsForm({ ...settingsForm, employeePin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white tracking-widest text-center transition"
                    />
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                      {isTa ? 'இயல்புநிலை: 1234' : 'Default: 1234'}
                    </span>
                  </div>

                  {/* Owner WhatsApp Number for daily reports */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                      {isTa ? 'உரிமையாளர் WhatsApp எண் (அறிக்கைகள் பெற)' : 'Owner WhatsApp Number (To receive reports)'}
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 stroke-[2.5]" />
                      <input
                        type="tel"
                        placeholder="919876543210"
                        value={settingsForm.ownerWhatsApp || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, ownerWhatsApp: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs sm:text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Database & Cloud Synchronization */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-2">
                  <Cloud className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                    {isTa ? 'டேட்டாபேஸ் & மேகக்கணி ஒத்திசைவு' : 'Database & Cloud Storage'}
                  </h3>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1 mb-3">
                  <div className="font-black text-blue-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{t.dailyDataResetLabel}</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                    {t.dailyResetNotice}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleSyncCloud}
                    disabled={isSyncing}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                  >
                    <Cloud className={`w-3.5 h-3.5 stroke-[2.5] ${isSyncing ? 'animate-pulse' : ''}`} />
                    <span>{isSyncing ? (isTa ? 'ஒத்திசைக்கிறது...' : 'Syncing...') : (isTa ? 'Firebase-ல் உடனடியாக சேமிக்க' : 'Sync to Firebase Now')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenClearConfirm}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{t.clearAllBillsDataNow}</span>
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-sm sm:text-base uppercase tracking-wide flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>{t.saveConfiguration}</span>
                </button>
              </div>
            </form>
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
                ? 'டேட்டாபேஸ் மற்றும் Firebase-ல் உள்ள அனைத்து உணவுப் பொருட்களும் முழுமையாக நீக்கப்படும். எப்போது வேண்டுமானாலும் புதிய பொருட்களைச் சேர்க்கலாம்.'
                : 'All items will be permanently cleared from the database and Firebase. You can add new items at any time.'}
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
