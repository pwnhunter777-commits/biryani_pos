import React from 'react';
import { Bill, ShopSettings } from '../types';
import { Language } from '../utils/translations';

interface ReceiptViewProps {
  bill: Bill;
  settings: ShopSettings;
  className?: string;
  lang?: Language;
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  bill,
  settings,
  className = '',
  lang = 'en',
}) => {
  const is80mm = settings.paperWidth === '80mm';
  const isTa = lang === 'ta';

  return (
    <div
      id="printable-receipt"
      className={`bg-white text-black font-mono text-xs p-3 shadow-md border-2 border-slate-300 mx-auto select-text font-black ${
        is80mm ? 'w-full max-w-[80mm]' : 'w-full max-w-[58mm]'
      } ${className}`}
      style={{
        borderRadius: '4px',
      }}
    >
      {/* Receipt Header - Bold & Big */}
      <div className="text-center mb-1.5">
        {settings.shopName && settings.shopName.trim() !== '' ? (
          <div className="font-black text-base tracking-wide uppercase mb-0.5">
            {settings.shopName}
          </div>
        ) : (
          <div className="font-black text-sm uppercase tracking-wide text-black mb-0.5">
            {isTa ? 'ரசீது / பில்' : 'CASH BILL / INVOICE'}
          </div>
        )}
        {settings.tagline && <div className="text-xs font-bold text-slate-700">{settings.tagline}</div>}
        {settings.address && <div className="text-xs font-bold text-slate-700">{settings.address}</div>}
        {settings.phone && (
          <div className="text-xs font-bold text-slate-700">
            {isTa ? 'தொலைபேசி' : 'TEL'}: {settings.phone}
          </div>
        )}
      </div>

      <div className="border-t-2 border-dashed border-black my-1" />

      {/* Bill Meta */}
      <div className="text-xs font-black leading-tight space-y-0.5">
        <div className="flex justify-between">
          <span className="font-black">{isTa ? 'பில்' : 'BILL'}: {bill.billNumber}</span>
          <span>{isTa ? 'தேதி' : 'DATE'}: {bill.dateString}</span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>{isTa ? 'நேரம்' : 'TIME'}: {bill.timeString}</span>
          <span>{isTa ? 'எண்ணிக்கை' : 'ITEMS'}: {bill.totalQuantity}</span>
        </div>
      </div>

      <div className="border-t-2 border-dashed border-black my-1" />

      {/* Item Table Header */}
      <div className="flex justify-between font-black text-xs uppercase pb-1 border-b-2 border-black">
        <span className="w-1/2 text-left">{isTa ? 'உணவு' : 'ITEM'}</span>
        <span className="w-1/6 text-center">{isTa ? 'எண்' : 'QTY'}</span>
        <span className="w-1/6 text-right">{isTa ? 'விலை' : 'PRICE'}</span>
        <span className="w-1/6 text-right">{isTa ? 'தொகை' : 'TOTAL'}</span>
      </div>

      {/* Item Rows - Big & Bold */}
      <div className="space-y-1 my-1">
        {bill.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start text-xs font-black leading-tight">
            <span className="w-1/2 text-left uppercase truncate pr-1" title={item.name}>
              {item.name}
            </span>
            <span className="w-1/6 text-center">{item.quantity}</span>
            <span className="w-1/6 text-right">{item.unitPrice.toFixed(0)}</span>
            <span className="w-1/6 text-right font-black">{item.lineTotal.toFixed(0)}</span>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-dashed border-black my-1" />

      {/* Total Section - Very Big & Bold */}
      <div className="flex justify-between items-center text-sm font-black py-1">
        <span>{isTa ? 'மொத்தம்' : 'TOTAL'}:</span>
        <span className="text-lg font-black">
          {isTa ? 'ரூ.' : 'Rs.'} {bill.totalAmount.toFixed(0)}
        </span>
      </div>

      <div className="border-t-2 border-dashed border-black my-1" />

      {/* Footer */}
      <div className="text-center text-xs font-black text-slate-800 mt-1.5 space-y-0.5">
        {settings.footerNote && <div>{settings.footerNote}</div>}
        <div className="font-black">
          {isTa ? '*** நன்றி மீண்டும் வருக ***' : '*** THANK YOU ***'}
        </div>
        {bill.printCount > 0 && (
          <div className="text-[10px] text-slate-500">
            {isTa ? 'பிரிண்ட்' : 'PRINT'} #{bill.printCount}
          </div>
        )}
      </div>
    </div>
  );
};
