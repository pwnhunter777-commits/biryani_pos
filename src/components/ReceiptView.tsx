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
}) => {
  const is80mm = settings.paperWidth === '80mm';

  return (
    <div
      id="printable-receipt"
      className={`bg-white text-black font-mono px-2.5 py-2 shadow-md border-2 border-slate-400 mx-auto select-text font-black text-xs leading-tight ${
        is80mm ? 'w-full max-w-[68mm]' : 'w-full max-w-[48mm] sm:max-w-[50mm]'
      } ${className}`}
      style={{
        borderRadius: '4px',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Receipt Header - Compact & Bold */}
      <div className="text-center mb-1 space-y-0.5">
        <div className="font-black text-xs sm:text-sm tracking-wide uppercase leading-tight font-mono text-black">
          {settings.shopName && settings.shopName.trim() !== ''
            ? settings.shopName.toUpperCase()
            : 'BIRYANI SHOP'}
        </div>
        {settings.tagline && (
          <div className="text-[9px] font-black text-black leading-tight">
            {settings.tagline}
          </div>
        )}
        {settings.address && (
          <div className="text-[9px] font-black text-black leading-tight">
            {settings.address}
          </div>
        )}
        {settings.phone && (
          <div className="text-[9px] font-black text-black leading-tight font-mono">
            TEL: {settings.phone}
          </div>
        )}
      </div>

      <div className="border-t-2 border-dashed border-black my-1" />

      {/* Bill Meta - Bold */}
      <div className="text-[10px] font-black leading-tight space-y-0.5 font-mono text-black">
        <div className="flex justify-between items-center">
          <span className="font-black">BILL: #{bill.billNumber}</span>
          <span className="font-black">{bill.dateString}</span>
        </div>
        <div className="flex justify-between items-center text-black">
          <span className="font-black">TIME: {bill.timeString}</span>
          <span className="font-black">{bill.totalQuantity} ITEMS</span>
        </div>
      </div>

      <div className="border-t-2 border-dashed border-black my-1" />

      {/* Items List - Compact & Bold */}
      <div className="space-y-1 my-1 font-mono">
        {bill.items.map((item, idx) => (
          <div key={idx} className="flex flex-col text-[11px] leading-tight text-black">
            <div className="flex justify-between items-baseline gap-1">
              <span className="font-black uppercase break-words flex-1 text-black">
                {item.name}
              </span>
              <span className="font-black text-xs shrink-0 text-black">
                Rs. {item.lineTotal.toFixed(0)}
              </span>
            </div>
            {item.quantity > 1 || item.lineTotal !== item.unitPrice ? (
              <div className="text-[9px] font-black text-black pl-1">
                {item.quantity} x Rs. {item.unitPrice.toFixed(0)}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="border-t-2 border-dashed border-black my-1" />

      {/* Total Section - Bold */}
      <div className="flex justify-between items-baseline py-0.5 font-mono text-black">
        <span className="text-xs font-black uppercase tracking-wide text-black">
          TOTAL AMOUNT:
        </span>
        <span className="text-base sm:text-lg font-black text-black">
          Rs. {bill.totalAmount.toFixed(0)}
        </span>
      </div>

      <div className="border-t-2 border-dashed border-black my-1" />

      {/* Footer Notes - Bold */}
      <div className="text-center text-[9px] font-black mt-1 space-y-0.5 font-mono text-black">
        {settings.footerNote ? (
          <div className="font-black text-black leading-tight">
            {settings.footerNote}
          </div>
        ) : (
          <div className="font-black text-black leading-tight">
            Thank you! Visit again!
          </div>
        )}
        {bill.printCount > 0 && (
          <div className="text-[8px] font-black text-black mt-0.5">
            PRINT #{bill.printCount}
          </div>
        )}
      </div>
    </div>
  );
};
