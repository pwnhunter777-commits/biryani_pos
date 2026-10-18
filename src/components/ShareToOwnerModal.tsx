import React, { useState } from 'react';
import {
  X,
  Share2,
  CheckCircle2,
  Database,
  Smartphone,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react';
import { ShopSettings } from '../types';
import {
  getTodayDateString,
  getSalesSummaryForDate,
  getItemSalesReportForDate,
  saveOwnerSharedDailyReport,
  getEmployeePhoneBillsCount,
} from '../db/storage';
import { Language, translations } from '../utils/translations';

interface ShareToOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  employeePin: string;
  lang?: Language;
}

export const ShareToOwnerModal: React.FC<ShareToOwnerModalProps> = ({
  isOpen,
  onClose,
  settings,
  employeePin,
  lang = 'en',
}) => {
  const [copied, setCopied] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [customPhone, setCustomPhone] = useState(settings.ownerWhatsApp || '');

  if (!isOpen) return null;

  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';
  const currencySymbol = isTa ? 'ரூ.' : 'Rs.';
  const todayStr = getTodayDateString();
  const summary = getSalesSummaryForDate(todayStr);
  const itemsBreakdown = getItemSalesReportForDate(todayStr);
  const localBillsCount = getEmployeePhoneBillsCount();

  const shopName = settings.shopName && settings.shopName.trim() !== ''
    ? settings.shopName
    : (isTa ? 'பிரியாணி கடை' : 'Biryani Shop');

  // Build formatted text message for WhatsApp / Share
  const generateReportText = () => {
    const lines: string[] = [
      `*🍛 ${shopName.toUpperCase()} - DAILY SALES REPORT*`,
      `📅 Date: ${todayStr}`,
      `🕒 Time: ${new Date().toLocaleTimeString()}`,
      `👤 Cashier/Pin: ${employeePin}`,
      `--------------------------------`,
      `🧾 Total Bills: *${summary.billCount}*`,
      `💰 Total Sales: *${currencySymbol} ${summary.totalSales.toLocaleString()}*`,
      `🍽️ Items Sold: *${summary.totalItemsSold}* portions`,
      `⚖️ Total Weight Sold: *${summary.totalKgSold.toFixed(2)} KG*`,
      `--------------------------------`,
      `*ITEM BREAKDOWN:*`,
    ];

    if (itemsBreakdown.length === 0) {
      lines.push(`(No items sold yet today)`);
    } else {
      itemsBreakdown.forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.name}: ${item.quantity} qty (${item.totalWeightKg.toFixed(2)} KG) @ ${currencySymbol}${item.unitPrice} = *${currencySymbol}${item.totalAmount}*`);
      });
    }

    lines.push(`--------------------------------`);
    lines.push(`📱 Raw bills preserved on employee phone: ${localBillsCount} bills.`);
    lines.push(`☁️ Shared to Owner Database (clears daily).`);

    return lines.join('\n');
  };

  const handleSyncToDatabase = () => {
    saveOwnerSharedDailyReport({
      dateString: todayStr,
      totalBills: summary.billCount,
      totalSales: summary.totalSales,
      totalItemsSold: summary.totalItemsSold,
      itemsBreakdown: itemsBreakdown.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalAmount: i.totalAmount,
        weightKg: i.weightKg,
        totalWeightKg: i.totalWeightKg,
      })),
      employeePinUsed: employeePin,
    });
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 3500);
  };

  const handleWhatsAppShare = () => {
    // Save to database first
    handleSyncToDatabase();

    const text = generateReportText();
    const encoded = encodeURIComponent(text);
    const targetPhone = (customPhone || settings.ownerWhatsApp || '').trim().replace(/[^\d+]/g, '');

    let whatsappUrl = '';
    if (targetPhone) {
      const cleanNumber = targetPhone.startsWith('+') ? targetPhone.substring(1) : targetPhone;
      whatsappUrl = `https://wa.me/${cleanNumber}?text=${encoded}`;
    } else {
      whatsappUrl = `https://wa.me/?text=${encoded}`;
    }

    try {
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.href = whatsappUrl;
    }
  };

  const handleNativeShare = async () => {
    handleSyncToDatabase();
    const text = generateReportText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${shopName} Daily Sales Report - ${todayStr}`,
          text: text,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    } else {
      handleCopyText();
    }
  };

  const handleCopyText = async () => {
    const text = generateReportText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh] border-2 border-blue-500">
        {/* Header - Compact Phone Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">
                {t.shareDailyReport}
              </h3>
              <p className="text-[10px] text-blue-100 font-bold">
                {isTa ? 'உரிமையாளருக்கு தினசரி அறிக்கை அனுப்புதல்' : 'Share daily summary to Owner'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white cursor-pointer transition"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Data Policy Badge */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-900 font-black text-[11px]">
              <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t.savedOnPhoneNotice}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[10px]">
              <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{t.dbClearedDailyNotice}</span>
            </div>
          </div>

          {/* Today's Sales Preview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
              <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                {shopName}
              </span>
              <span className="font-mono font-bold text-slate-600 text-[11px]">
                {todayStr}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center py-1">
              <div className="bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                <span className="text-[9px] uppercase font-black text-slate-600 block">
                  {t.todayBills}
                </span>
                <span className="text-base font-black text-blue-700">
                  {summary.billCount}
                </span>
              </div>
              <div className="bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                <span className="text-[9px] uppercase font-black text-slate-600 block">
                  {t.portionsSold}
                </span>
                <span className="text-base font-black text-indigo-700">
                  {summary.totalItemsSold}
                </span>
              </div>
              <div className="bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                <span className="text-[9px] uppercase font-black text-slate-600 block">
                  {t.todayTotalSales}
                </span>
                <span className="text-base font-black text-emerald-700">
                  {currencySymbol}{summary.totalSales}
                </span>
              </div>
            </div>

            {/* Compact Item Breakdown */}
            <div className="mt-2.5 pt-2 border-t border-slate-200">
              <div className="text-[10px] font-black uppercase text-slate-700 mb-1 flex justify-between">
                <span>{t.itemSalesBreakdown}</span>
                <span>{itemsBreakdown.length} items</span>
              </div>
              {itemsBreakdown.length === 0 ? (
                <p className="text-[10px] text-slate-600 italic py-1 text-center">
                  {t.noItemsSoldOnDate}
                </p>
              ) : (
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {itemsBreakdown.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-[10px] py-0.5 border-b border-slate-100 last:border-none font-bold"
                    >
                      <span className="text-slate-800 truncate pr-2">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-slate-900 font-mono font-black shrink-0">
                        {currencySymbol}{item.totalAmount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Owner WhatsApp Number Input (Optional) */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
              {t.ownerWhatsAppLabel}
            </label>
            <input
              type="tel"
              placeholder="+919876543210"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Sync Success Alert */}
          {syncSuccess && (
            <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-2 text-emerald-800 text-[11px] font-black animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.reportSharedSuccess}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Primary Action 1: WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition"
            >
              <MessageCircle className="w-4 h-4 stroke-[2.5]" />
              <span>{t.whatsappToOwner}</span>
            </button>

            {/* Action 2: Direct Save/Sync to Owner Database */}
            <button
              type="button"
              onClick={handleSyncToDatabase}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
            >
              <Database className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t.syncToOwnerDb}</span>
            </button>

            {/* Action 3: Native Share / Copy */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 border border-slate-300 font-black text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t.phoneShare}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 border border-slate-300 font-black text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600 font-bold">
          <span>{t.localPhoneBillsCount} {localBillsCount}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-white border border-slate-300 text-slate-800 font-black text-[11px] hover:bg-slate-50 cursor-pointer"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};
