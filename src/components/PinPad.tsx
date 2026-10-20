import React, { useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { Language, translations } from '../utils/translations';

interface PinPadProps {
  title: string;
  subtitle?: string;
  expectedPin?: string | string[];
  onSuccess: () => void;
  onCancel?: () => void;
  maxDigits?: number;
  lang?: Language;
}

export const PinPad: React.FC<PinPadProps> = ({
  title,
  subtitle,
  expectedPin,
  onSuccess,
  onCancel,
  maxDigits = 4,
  lang = 'en',
}) => {
  const t = translations[lang] || translations.en;
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDigit = (digit: string) => {
    if (pin.length >= maxDigits) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(null);

    if (nextPin.length === maxDigits) {
      if (expectedPin) {
        const isValid = Array.isArray(expectedPin)
          ? expectedPin.includes(nextPin)
          : nextPin === expectedPin;

        if (isValid) {
          setTimeout(() => {
            onSuccess();
          }, 150);
        } else {
          setTimeout(() => {
            setError(t.invalidPin);
            setPin('');
          }, 200);
        }
      } else {
        setTimeout(() => {
          onSuccess();
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  return (
    <div className="w-full max-w-[280px] mx-auto p-3 bg-white border-2 border-blue-200 rounded-xl shadow-lg flex flex-col items-center select-none">
      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
        <Lock className="w-4 h-4 stroke-[2.5]" />
      </div>

      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight text-center leading-tight">{title}</h2>
      {subtitle && <p className="text-xs font-black text-slate-500 mt-0.5 text-center">{subtitle}</p>}

      {/* Pin dots */}
      <div className="flex gap-2.5 my-2">
        {Array.from({ length: maxDigits }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-150 ${
              i < pin.length
                ? 'bg-blue-600 scale-125 shadow-sm'
                : 'bg-slate-200 border-2 border-slate-300'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="text-red-700 text-xs sm:text-sm font-black mb-1.5 text-center bg-red-100 border border-red-300 px-2 py-0.5 rounded-md animate-shake">
          {error}
        </div>
      )}

      {/* Keypad Grid - Small Compact Buttons with Big Bold Text */}
      <div className="grid grid-cols-3 gap-1.5 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-10 rounded-lg bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-900 hover:text-blue-700 font-black text-2xl border-2 border-slate-200 active:border-blue-500 transition-all flex items-center justify-center select-none shadow-xs cursor-pointer"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          className="h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs sm:text-sm border-2 border-slate-200 transition-all flex items-center justify-center select-none cursor-pointer uppercase"
        >
          {t.clear}
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-10 rounded-lg bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-900 hover:text-blue-700 font-black text-2xl border-2 border-slate-200 active:border-blue-500 transition-all flex items-center justify-center select-none shadow-xs cursor-pointer"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-200 transition-all flex items-center justify-center select-none cursor-pointer"
          aria-label="Delete"
        >
          <Delete className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2.5 text-sm font-black text-slate-600 hover:text-blue-700 transition-colors cursor-pointer uppercase"
        >
          {t.cancel}
        </button>
      )}
    </div>
  );
};
