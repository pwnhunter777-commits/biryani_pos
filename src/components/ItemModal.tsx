import React, { useState, useEffect } from 'react';
import { CatalogItem } from '../types';
import { addCatalogItem, updateCatalogItem, deleteCatalogItem } from '../db/storage';
import { translations, Language } from '../utils/translations';
import { X, Trash2 } from 'lucide-react';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingItem?: CatalogItem | null;
  lang?: Language;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  lang = 'en',
}) => {
  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';

  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setItemName(editingItem.name);
      setPrice(editingItem.price ? editingItem.price.toString() : '');
    } else {
      setItemName('');
      setPrice('');
    }
    setError(null);
  }, [isOpen, editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError(isTa ? 'சரியான உணவுப் பெயரை உள்ளிடவும்.' : 'Please enter a valid item name.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError(isTa ? '0-க்கு மேல் சரியான விற்பனை விலையை உள்ளிடவும்.' : 'Please enter a valid price greater than 0.');
      return;
    }

    if (editingItem) {
      updateCatalogItem(editingItem.id, itemName.trim(), priceNum, 1.0, 'fixed');
    } else {
      addCatalogItem(itemName.trim(), priceNum, 1.0, 'fixed');
    }

    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mb-3">
          {editingItem ? t.editItem : t.addFoodItem}
        </h3>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-black">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Item Name */}
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
              {t.itemNameLabel}
            </label>
            <input
              type="text"
              placeholder={isTa ? 'எ.கா. போன்லெஸ் (எலும்பில்லா) அல்லது பிரியாணி' : 'e.g. Boneless Chicken'}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm sm:text-base font-black text-slate-900 placeholder:text-slate-400 placeholder:font-bold focus:outline-none focus:border-blue-600 focus:bg-white shadow-2xs transition"
            />
          </div>

          {/* 2. Direct Price (Rs.) - All portion/pricing types removed */}
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
              {isTa ? 'விற்பனை விலை (ரூ.) *' : 'Selling Price (Rs.) *'}
            </label>
            <input
              type="number"
              step="any"
              min="1"
              placeholder={isTa ? 'எ.கா. 320' : 'e.g. 320'}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white shadow-2xs transition"
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-200">
            {editingItem && (
              <button
                type="button"
                onClick={async () => {
                  await deleteCatalogItem(editingItem.id);
                  onSave();
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider transition cursor-pointer border border-red-200 flex items-center gap-1 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.delete}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {editingItem ? t.save : t.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
