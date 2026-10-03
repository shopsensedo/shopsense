import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { OutfitItem } from '../../lib/describeImage';

/**
 * Outfit item picker (Phase A UI, per Claude 2026-10-03).
 *
 * Flow: photo with tappable boxes + chips → tap item → "Find this" primary,
 * "Adjust" opens the cropper pre-snapped. The cropper is an EDIT state, not
 * the entry point. Boxes are suggestions the user can fix.
 */

interface OutfitItemPickerProps {
  isOpen: boolean;
  imageSrc: string;
  items: OutfitItem[];
  apparentGender: 'men' | 'women' | null;
  isUrduMode?: boolean;
  onFindItem: (item: OutfitItem) => void;
  onAdjustItem: (item: OutfitItem) => void;
  onClose: () => void;
  onSkipAll: () => void; // "search the whole photo" fallback
}

/** Roman Urdu labels for common item types (bilingual chips). */
const ITEM_URDU: Record<string, string> = {
  shoes: 'Joota',
  'running shoes': 'Joota',
  shirt: 'Qameez',
  kurta: 'Kurta',
  trousers: 'Pent',
  shalwar: 'Shalwar',
  watch: 'Ghari',
  'wrist watch': 'Ghari',
  sunglasses: 'Chashma',
  cap: 'Topi',
  hat: 'Topi',
  bag: 'Bag',
  handbag: 'Handbag',
  belt: 'Belt',
  jewellery: 'Zewar',
  jewelry: 'Zewar',
  handkerchief: 'Rumaal',
  'pocket square': 'Rumaal',
  dress: 'Libaas',
  gown: 'Gown',
  scarf: 'Dupatta',
};

function urduFor(type: string): string | null {
  const t = type.toLowerCase();
  for (const [k, v] of Object.entries(ITEM_URDU)) {
    if (t.includes(k)) return v;
  }
  return null;
}

export const OutfitItemPicker: React.FC<OutfitItemPickerProps> = ({
  isOpen,
  imageSrc,
  items,
  apparentGender,
  isUrduMode = false,
  onFindItem,
  onAdjustItem,
  onClose,
  onSkipAll,
}) => {
  const [selected, setSelected] = useState<number>(0);
  if (!isOpen || items.length === 0) return null;

  const item = items[selected];
  const urdu = urduFor(item.type);
  const box = item.box;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#262626] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#262626] flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#0C0C0C] dark:text-[#F5F5F5] font-heading">
              {isUrduMode ? 'Jo cheez chahiye us par tap karein' : 'Tap the item you want'}
            </h3>
            <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D] mt-0.5">
              {isUrduMode
                ? `${items.length} cheezein mili — suggested boxes, adjust kar sakte hain`
                : `${items.length} items found — boxes are suggestions you can adjust`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262626] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo with tappable boxes */}
        <div className="relative flex-1 bg-[#0C0C0C] flex items-center justify-center p-4 overflow-hidden min-h-[280px] select-none">
          <div className="relative max-h-[46vh] max-w-full">
            <img src={imageSrc} alt="Uploaded photo" className="max-h-[46vh] max-w-full object-contain rounded-lg" />
            {items.map((it, i) =>
              it.box ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`absolute border-2 rounded transition-colors ${
                    i === selected
                      ? 'border-[#B9C006] bg-[#B9C006]/10'
                      : 'border-white/60 bg-white/5 hover:border-white'
                  }`}
                  style={{
                    left: `${it.box.x / 10}%`,
                    top: `${it.box.y / 10}%`,
                    width: `${it.box.width / 10}%`,
                    height: `${it.box.height / 10}%`,
                    minWidth: 44,
                    minHeight: 44,
                  }}
                  aria-label={`Select ${it.type}`}
                />
              ) : null,
            )}
          </div>
        </div>

        {/* Item chips */}
        <div className="px-5 py-3 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-[#262626]">
          {items.map((it, i) => {
            const u = urduFor(it.type);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  i === selected
                    ? 'bg-[#0C0C0C] text-white dark:bg-[#B9C006] dark:text-black'
                    : 'bg-slate-100 dark:bg-[#262626] text-[#0C0C0C] dark:text-[#F5F5F5] hover:bg-slate-200'
                }`}
              >
                {u && isUrduMode ? `${u} / ` : ''}
                {it.type}
                {u && !isUrduMode ? ` (${u})` : ''}
              </button>
            );
          })}
        </div>

        {/* Selected item details */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold capitalize">{item.type}</span>
            {item.colours.length > 0 && (
              <span className="text-xs text-[#5F5F60] dark:text-[#9C9C9D]">
                {item.colours.join(', ')}
              </span>
            )}
            {item.brand && (
              <span className="text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                {item.brand}
              </span>
            )}
            {!box && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {isUrduMode ? 'suggested box nahi — Adjust se khud set karein' : 'no suggested box — use Adjust to frame it'}
              </span>
            )}
          </div>
          {item.attributes.length > 0 && (
            <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D] mt-1">
              {item.attributes.join(' · ')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-[#262626] flex gap-3">
          <button
            type="button"
            onClick={() => onAdjustItem(item)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#404040] text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#262626] transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {isUrduMode ? 'Adjust' : 'Adjust'}
          </button>
          <button
            type="button"
            onClick={() => onFindItem(item)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0C0C0C] dark:bg-[#B9C006] text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Search className="w-4 h-4" />
            {isUrduMode ? 'Yehi dhoondo' : 'Find this'}
          </button>
        </div>

        {/* Skip link */}
        <button
          type="button"
          onClick={onSkipAll}
          className="pb-4 text-xs text-[#5F5F60] dark:text-[#9C9C9D] underline hover:no-underline"
        >
          {isUrduMode ? 'Poori photo search karein' : 'Search the whole photo instead'}
        </button>
      </div>
    </div>
  );
};
