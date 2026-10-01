import React, { useState } from 'react';
import { Search, Camera, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onSubmit: (query: string) => void;
  onCameraClick?: () => void;
  placeholder?: string;
  isUrduMode?: boolean;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  onCameraClick,
  placeholder,
  isUrduMode = false,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const defaultPlaceholder = isUrduMode
    ? 'Roman Urdu mein likhein (kala joota, lal suit, smartwatch)...'
    : 'Search products, brands or paste a screenshot...';

  const quickPrompts = [
    { en: 'kala joota', ur: 'کالا جوتا' },
    { en: 'lawn kurta', ur: 'لان کرتا' },
    { en: 'smartwatch', ur: 'سمارٹ واچ' },
    { en: 'ladies bag', ur: 'لیڈیز بیگ' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center gap-1.5 bg-white dark:bg-carbon rounded-full border p-1.5 pl-2 transition-all duration-200 ${
          isFocused
            ? 'border-lime ring-2 ring-lime/25 shadow-[0_8px_32px_-12px_rgba(185,192,6,0.4)]'
            : 'border-[#E5E5E1] dark:border-ash hover:border-[#9C9C9D] dark:hover:border-[#55554F]'
        }`}
      >
        {/* Left Search Icon */}
        <div className="pl-3 pr-1 text-smoke dark:text-fog flex items-center pointer-events-none shrink-0">
          <Search className="w-5 h-5" />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder || defaultPlaceholder}
          className="w-full h-11 text-sm md:text-[15px] text-void dark:text-bone placeholder:text-smoke/70 dark:placeholder:text-fog/70 bg-transparent focus:outline-none min-w-0"
        />

        {/* Clear Button */}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-2 text-smoke dark:text-fog hover:text-void dark:hover:text-bone rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] shrink-0 flex items-center justify-center cursor-pointer"
            aria-label="Clear query"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Camera / Screenshot Upload */}
        {onCameraClick && (
          <button
            type="button"
            onClick={onCameraClick}
            className="h-11 px-3.5 rounded-full border border-[#E5E5E1] dark:border-ash hover:border-lime text-void dark:text-bone flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="Upload screenshot or take photo"
          >
            <Camera className="w-4 h-4 text-olive dark:text-lime" />
            <span className="hidden sm:inline">Photo</span>
          </button>
        )}

        {/* Submit Button — lime pill */}
        <button
          type="submit"
          disabled={!value.trim()}
          className="h-11 px-5 md:px-7 rounded-full bg-void text-white hover:bg-graphite dark:bg-lime dark:hover:bg-limedeep dark:text-void disabled:opacity-40 disabled:pointer-events-none text-xs md:text-sm font-bold transition-colors cursor-pointer shrink-0"
        >
          Search
        </button>
      </form>

      {/* Roman Urdu Quick Query Suggestions */}
      <div className="mt-3 flex items-center gap-2 text-xs text-smoke dark:text-fog flex-wrap">
        <span className="font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-olive dark:text-lime" />
          {isUrduMode ? 'Koshish karein:' : 'Try:'}
        </span>
        {quickPrompts.map((item) => (
          <button
            key={item.en}
            type="button"
            onClick={() => {
              onChange(item.en);
              onSubmit(item.en);
            }}
            className="px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-lime hover:text-void dark:hover:bg-lime dark:hover:text-void text-void dark:text-bone font-semibold transition-colors cursor-pointer text-xs"
          >
            {item.en}
          </button>
        ))}
      </div>
    </div>
  );
};
