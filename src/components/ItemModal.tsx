import React, { useState, useEffect } from 'react';
import { CatalogItem, ItemPricingType } from '../types';
import { addCatalogItem, updateCatalogItem } from '../db/storage';
import { translations, Language } from '../utils/translations';
import { X, Scale, Utensils, Tag, Sparkles } from 'lucide-react';

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
  const [pricingType, setPricingType] = useState<ItemPricingType>('fixed');

  // Gram pricing: 100gm, 250gm, 500gm, 1kg
  const [p100g, setP100g] = useState('');
  const [p250g, setP250g] = useState('');
  const [p500g, setP500g] = useState('');
  const [p1kg, setP1kg] = useState('');

  // Plate pricing
  const [plate1, setPlate1] = useState('');
  const [plate2, setPlate2] = useState('');
  const [plate3, setPlate3] = useState('');
  const [plate4, setPlate4] = useState('');

  // Fixed pricing
  const [fixedPrice, setFixedPrice] = useState('');
  const [fixedWeightKg, setFixedWeightKg] = useState('0.5');

  const [error, setError] = useState<string | null>(null);

  // Initialize or reset when modal opens / editing item changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setItemName(editingItem.name);
      const type = editingItem.pricingType || 'fixed';
      setPricingType(type);

      if (type === 'gram' && editingItem.gramPrices) {
        setP100g(editingItem.gramPrices.p100g?.toString() || '');
        setP250g(editingItem.gramPrices.p250g?.toString() || (editingItem.gramPrices.p200g ? Math.round(editingItem.gramPrices.p200g * 1.25).toString() : ''));
        setP500g(editingItem.gramPrices.p500g?.toString() || '');
        setP1kg(editingItem.gramPrices.p1kg?.toString() || '');
      } else {
        // Defaults if converting
        const base = editingItem.price || 50;
        setP100g(base.toString());
        setP250g(Math.round(base * 2.5).toString());
        setP500g(Math.round(base * 5).toString());
        setP1kg(Math.round(base * 10).toString());
      }

      if (type === 'plate' && editingItem.platePrices) {
        setPlate1(editingItem.platePrices.plate1?.toString() || '');
        setPlate2(editingItem.platePrices.plate2?.toString() || '');
        setPlate3(editingItem.platePrices.plate3?.toString() || '');
        setPlate4(editingItem.platePrices.plate4?.toString() || '');
      } else {
        const base = editingItem.price || 150;
        setPlate1(base.toString());
        setPlate2((base * 2).toString());
        setPlate3((base * 3).toString());
        setPlate4((base * 4).toString());
      }

      setFixedPrice(editingItem.price?.toString() || '');
      setFixedWeightKg(editingItem.weightKg ? editingItem.weightKg.toString() : '0.5');
    } else {
      setItemName('');
      setPricingType('fixed');
      setFixedPrice('');
      setFixedWeightKg('0.5');

      setP100g('');
      setP250g('');
      setP500g('');
      setP1kg('');

      setPlate1('');
      setPlate2('');
      setPlate3('');
      setPlate4('');
    }
    setError(null);
  }, [isOpen, editingItem]);

  // Auto-calculation handlers for 100gm, 250gm, 500gm, 1kg
  const handleP100gChange = (val: string) => {
    setP100g(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setP250g(Math.round(num * 2.5).toString());
      setP500g(Math.round(num * 5).toString());
      setP1kg(Math.round(num * 10).toString());
    }
  };

  const handleP250gChange = (val: string) => {
    setP250g(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setP100g(Math.round(num / 2.5).toString());
      setP500g(Math.round(num * 2).toString());
      setP1kg(Math.round(num * 4).toString());
    }
  };

  const handleP500gChange = (val: string) => {
    setP500g(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setP100g(Math.round(num / 5).toString());
      setP250g(Math.round(num / 2).toString());
      setP1kg(Math.round(num * 2).toString());
    }
  };

  const handleP1kgChange = (val: string) => {
    setP1kg(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setP100g(Math.round(num / 10).toString());
      setP250g(Math.round(num / 4).toString());
      setP500g(Math.round(num / 2).toString());
    }
  };

  // Handler when 2 Plate price changes: auto-calculate 1 Plate, 3 Plate, 4 Plate
  const handlePlate2Change = (val: string) => {
    setPlate2(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setPlate1(Math.round(num / 2).toString());
      setPlate3(Math.round(num * 1.5).toString());
      setPlate4(Math.round(num * 2).toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError(isTa ? 'சரியான உணவுப் பெயரை உள்ளிடவும்.' : 'Please enter a valid food item name.');
      return;
    }

    if (pricingType === 'gram') {
      const v100 = parseFloat(p100g);
      const v250 = parseFloat(p250g);
      const v500 = parseFloat(p500g);
      const v1k = parseFloat(p1kg);

      const base100 = v100 > 0 ? v100 : (v250 > 0 ? v250 / 2.5 : (v500 > 0 ? v500 / 5 : (v1k > 0 ? v1k / 10 : 0)));

      if (base100 <= 0) {
        setError(isTa ? 'கிராம் விலையை 0-க்கு மேல் உள்ளிடவும்.' : 'Please enter a valid price greater than 0.');
        return;
      }

      const calculated100 = Math.round(base100);
      const calculated250 = v250 > 0 ? v250 : Math.round(calculated100 * 2.5);
      const calculated500 = v500 > 0 ? v500 : Math.round(calculated100 * 5);
      const calculated1k = v1k > 0 ? v1k : Math.round(calculated100 * 10);

      const gramPrices = {
        p100g: calculated100,
        p200g: Math.round(calculated100 * 2),
        p250g: calculated250,
        p500g: calculated500,
        p1kg: calculated1k,
      };

      if (editingItem) {
        updateCatalogItem(editingItem.id, itemName.trim(), calculated100, 0.1, 'gram', gramPrices, undefined);
      } else {
        addCatalogItem(itemName.trim(), calculated100, 0.1, 'gram', gramPrices, undefined);
      }
    } else if (pricingType === 'plate') {
      const p2 = parseFloat(plate2);
      const p3 = parseFloat(plate3);
      const p4 = parseFloat(plate4);
      const p1 = parseFloat(plate1) || (p2 ? p2 / 2 : (p3 ? p3 / 3 : (p4 ? p4 / 4 : 0)));

      if ((!p2 || p2 <= 0) && (!p1 || p1 <= 0)) {
        setError(isTa ? 'விலையை உள்ளிடவும்.' : 'Please enter a valid price.');
        return;
      }

      const calculatedP1 = p1 > 0 ? p1 : (p2 ? p2 / 2 : 0);
      const platePrices = {
        plate1: calculatedP1,
        plate2: p2 > 0 ? p2 : calculatedP1 * 2,
        plate3: p3 > 0 ? p3 : calculatedP1 * 3,
        plate4: p4 > 0 ? p4 : calculatedP1 * 4,
      };

      if (editingItem) {
        updateCatalogItem(editingItem.id, itemName.trim(), calculatedP1, 0.5, 'plate', undefined, platePrices);
      } else {
        addCatalogItem(itemName.trim(), calculatedP1, 0.5, 'plate', undefined, platePrices);
      }
    } else {
      // Fixed price
      const priceNum = parseFloat(fixedPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        setError(isTa ? '0-க்கு மேல் சரியான விற்பனை விலையை உள்ளிடவும்.' : 'Please enter a valid fixed price greater than 0.');
        return;
      }
      const weightNum = fixedWeightKg ? parseFloat(fixedWeightKg) : 0.5;

      if (editingItem) {
        updateCatalogItem(editingItem.id, itemName.trim(), priceNum, weightNum, 'fixed');
      } else {
        addCatalogItem(itemName.trim(), priceNum, weightNum, 'fixed');
      }
    }

    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 text-slate-900 shadow-2xl relative my-auto max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mb-2.5">
          {editingItem ? t.editItem : t.addFoodItem}
        </h3>

        {error && (
          <div className="mb-2.5 p-2 rounded-lg bg-red-100 border border-red-300 text-red-900 text-xs font-black">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* 1. Item Name */}
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wide mb-1">
              {t.itemNameLabel}
            </label>
            <input
              type="text"
              placeholder={isTa ? 'எ.கா. சிக்கன் பிரியாணி' : 'e.g. Chicken Dum Biryani'}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-black text-slate-900 placeholder:text-slate-400 placeholder:font-bold focus:outline-none focus:border-blue-600 focus:bg-white shadow-2xs transition"
            />
          </div>

          {/* 2. Pricing & Portion Type Selector */}
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wide mb-1">
              {t.pricingTypeLabel}
            </label>

            <div className="grid grid-cols-3 gap-1.5">
              {/* Option A: Gram / KG Type */}
              <button
                type="button"
                onClick={() => setPricingType('gram')}
                className={`py-1.5 px-2 rounded-lg border-2 text-left transition flex items-center justify-between cursor-pointer active:scale-98 ${
                  pricingType === 'gram'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100/60 text-slate-800'
                }`}
              >
                <span className="font-black text-[11px] sm:text-xs leading-tight tracking-tight truncate">
                  {isTa ? 'கிராம் / KG' : t.gramType}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ml-1 ${pricingType === 'gram' ? 'bg-blue-600' : 'bg-slate-300'}`} />
              </button>

              {/* Option B: Plate / Servings Type */}
              <button
                type="button"
                onClick={() => setPricingType('plate')}
                className={`py-1.5 px-2 rounded-lg border-2 text-left transition flex items-center justify-between cursor-pointer active:scale-98 ${
                  pricingType === 'plate'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100/60 text-slate-800'
                }`}
              >
                <span className="font-black text-[11px] sm:text-xs leading-tight tracking-tight truncate">
                  {isTa ? 'தட்டுகள்' : t.plateType}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ml-1 ${pricingType === 'plate' ? 'bg-blue-600' : 'bg-slate-300'}`} />
              </button>

              {/* Option C: Fixed Price Type */}
              <button
                type="button"
                onClick={() => setPricingType('fixed')}
                className={`py-1.5 px-2 rounded-lg border-2 text-left transition flex items-center justify-between cursor-pointer active:scale-98 ${
                  pricingType === 'fixed'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100/60 text-slate-800'
                }`}
              >
                <span className="font-black text-[11px] sm:text-xs leading-tight tracking-tight truncate">
                  {isTa ? 'நிலையான விலை' : t.fixedType}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ml-1 ${pricingType === 'fixed' ? 'bg-blue-600' : 'bg-slate-300'}`} />
              </button>
            </div>
          </div>

          {/* 3. Conditional Pricing Inputs */}

          {/* TYPE A: Grams Pricing (100gm, 250gm, 500gm, 1kg) */}
          {pricingType === 'gram' && (
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {/* 100gm */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-900 uppercase mb-0.5">
                    100gm {isTa ? 'விலை' : 'Price'} *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 50"
                    value={p100g}
                    onChange={(e) => handleP100gChange(e.target.value)}
                    className="w-full bg-white border-2 border-blue-400 focus:border-blue-600 rounded-lg px-2 py-1 text-sm font-mono font-black text-slate-900 focus:outline-none shadow-2xs"
                  />
                </div>

                {/* 250gm */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-900 uppercase mb-0.5">
                    250gm {isTa ? 'விலை' : 'Price'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Auto 2.5x"
                    value={p250g}
                    onChange={(e) => handleP250gChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-lg px-2 py-1 text-sm font-mono font-black text-slate-900 focus:outline-none"
                  />
                </div>

                {/* 500gm */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-900 uppercase mb-0.5">
                    500gm {isTa ? 'விலை' : 'Price'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Auto 5x"
                    value={p500g}
                    onChange={(e) => handleP500gChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-lg px-2 py-1 text-sm font-mono font-black text-slate-900 focus:outline-none"
                  />
                </div>

                {/* 1kg (1000gm) */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-900 uppercase mb-0.5">
                    1 KG (Rs.)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Auto 10x"
                    value={p1kg}
                    onChange={(e) => handleP1kgChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-lg px-2 py-1 text-sm font-mono font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TYPE B: Plates / Servings Pricing (2 Plate, 3 Plate, 4 Plate) */}
          {pricingType === 'plate' && (
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
              <div className="grid grid-cols-3 gap-1.5">
                {/* 2 Plate */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-900 uppercase mb-0.5">
                    2 {isTa ? 'தட்டு' : 'Plate'} *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 150"
                    value={plate2}
                    onChange={(e) => handlePlate2Change(e.target.value)}
                    className="w-full bg-white border-2 border-blue-400 focus:border-blue-600 rounded-lg px-2 py-1 text-sm font-mono font-black text-slate-900 focus:outline-none shadow-2xs"
                  />
                </div>

                {/* 3 Plate */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-900 uppercase mb-0.5">
                    3 {isTa ? 'தட்டு' : 'Plate'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Auto 1.5x"
                    value={plate3}
                    onChange={(e) => setPlate3(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-lg px-2 py-1 text-sm font-mono font-black text-slate-900 focus:outline-none"
                  />
                </div>

                {/* 4 Plate */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-900 uppercase mb-0.5">
                    4 {isTa ? 'தட்டு' : 'Plate'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Auto 2x"
                    value={plate4}
                    onChange={(e) => setPlate4(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-lg px-2 py-1 text-sm font-mono font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TYPE C: Fixed Pricing */}
          {pricingType === 'fixed' && (
            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wide mb-1">
                {t.priceLabel}
              </label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="e.g. 180"
                value={fixedPrice}
                onChange={(e) => setFixedPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-base font-mono font-black text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white shadow-2xs"
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {editingItem ? t.save : t.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
