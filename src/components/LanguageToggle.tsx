import React from 'react';
import { Language } from '../utils/translations';
import { Languages } from 'lucide-react';

interface LanguageToggleProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  currentLang,
  onLanguageChange,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 font-black text-xs ${className}`}>
      <button
        type="button"
        onClick={() => onLanguageChange('en')}
        className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
          currentLang === 'en'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-700 hover:text-blue-700'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onLanguageChange('ta')}
        className={`px-2 py-0.5 rounded-md transition cursor-pointer font-bold ${
          currentLang === 'ta'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-700 hover:text-blue-700'
        }`}
      >
        தமிழ்
      </button>
    </div>
  );
};
