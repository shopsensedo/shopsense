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
    : 'Search by photo or Urdu query (e.g., kala joota, white kurta)...';

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
        className={`relative flex items-center bg-white dark:bg-[#131B2E] rounded-xl border transition-all duration-200 shadow-xs ${
          isFocused
            ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20 shadow-md'
            : 'border-[#CBD5E1] dark:border-[#283548] hover:border-[#94A3B8] dark:hover:border-slate-500'
        }`}
      >
        {/* Left Search Icon */}
        <div className="pl-3.5 pr-2 text-[#64748B] dark:text-[#94A3B8] flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder || defaultPlaceholder}
          className="w-full h-12 text-sm md:text-base text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent focus:outline-none"
        />

        {/* Clear Button */}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 mr-1 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            aria-label="Clear query"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Camera / Screenshot Upload Icon Button */}
        {onCameraClick && (
          <button
            type="button"
            onClick={onCameraClick}
            className="mx-1.5 px-3 h-9 rounded-lg bg-[#EEF2FF] dark:bg-[#1E1B4B] hover:bg-[#E0E7FF] dark:hover:bg-[#312E81] text-[#4F46E5] dark:text-[#A5B4FC] flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0 min-h-[36px]"
            title="Upload screenshot or take photo"
          >
            <Camera className="w-4 h-4 text-[#F97316]" />
            <span className="hidden sm:inline">Photo Search</span>
          </button>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!value.trim()}
          className="mr-1.5 px-4 h-9 rounded-lg bg-[#4F46E5] text-white hover:bg-[#3730A3] disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold transition-colors cursor-pointer shrink-0 min-h-[36px] flex items-center justify-center shadow-xs"
        >
          Search
        </button>
      </form>

      {/* Roman Urdu Quick Query Suggestions */}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] flex-wrap">
        <span className="font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#F97316]" />
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
            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-xs"
          >
            {item.en}
          </button>
        ))}
      </div>
    </div>
  );
};
