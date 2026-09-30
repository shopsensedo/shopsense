import React, { useState } from 'react';
import { Camera, Sparkles, ArrowRight, ShieldCheck, Zap, Heart, Search, CheckCircle2 } from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { Dropzone } from '../ui/Dropzone';
import { SourceBadge } from '../ui/SourceBadge';
import { SearchHistoryItem, PlatformType } from '../../types';
import { PLATFORMS_INFO } from '../../lib/mockData';

interface HomeScreenProps {
  onImageSelected: (imageDataUrl: string, sourceName?: string) => void;
  onTextSearch: (query: string) => void;
  recentSearches: SearchHistoryItem[];
  onRerunHistory: (item: SearchHistoryItem) => void;
  isUrduMode?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onImageSelected,
  onTextSearch,
  recentSearches,
  onRerunHistory,
  isUrduMode = false,
}) => {
  const [textQuery, setTextQuery] = useState('');

  const platforms: PlatformType[] = ['daraz', 'telemart', 'bagallery', 'priceoye', 'elo', 'shophive', 'gulahmed'];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10 animate-in fade-in duration-150">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
        {/* Subtle kicker without pill badge */}
        <div className="text-xs font-semibold text-[#4F46E5] tracking-wide uppercase mb-2 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
          <span>{isUrduMode ? 'Pakistan ka Pehla AI Price Scanner' : "Pakistan's #1 AI Visual Price Comparison"}</span>
        </div>

        {/* Display Headline with balanced wrap */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] font-heading tracking-tight leading-tight mb-4 text-balance">
          {isUrduMode ? (
            <>
              Screenshot upload karein,{' '}
              <span className="text-[#4F46E5] dark:text-[#818CF8]">Pakistan ki sasti tareen</span> qeemat payein
            </>
          ) : (
            <>
              Upload a screenshot, find the{' '}
              <span className="text-[#4F46E5] dark:text-[#818CF8]">lowest price in Pakistan</span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] max-w-2xl mx-auto leading-relaxed mb-6">
          {isUrduMode
            ? 'Instagram ya TikTok par koi kapra, joota ya gadget pasand aya? ShopSense Daraz, Telemart aur local stores se foran sasti tareen qeemat nikal kar deta hai.'
            : 'Saw a fashion piece, sneakers, or gadget on Instagram or TikTok? Upload the screenshot to scan Daraz, Telemart, Bagallery, and local sellers in seconds.'}
        </p>

        {/* Text Search Bar with Roman Urdu Hints */}
        <div className="max-w-xl mx-auto mb-8">
          <SearchBar
            value={textQuery}
            onChange={setTextQuery}
            onSubmit={onTextSearch}
            onCameraClick={() => {
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              fileInput?.click();
            }}
            isUrduMode={isUrduMode}
          />
        </div>
      </section>

      {/* Primary Focal Anchor: Large Image Upload Dropzone */}
      <section className="max-w-2xl mx-auto mb-14">
        <Dropzone
          onImageSelected={onImageSelected}
          isUrduMode={isUrduMode}
        />
      </section>

      {/* Supported Stores Strip */}
      <section className="mb-14 text-center">
        <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-4">
          {isUrduMode ? 'Pakistan ki In Dukaano se Live Qeemat Check Hoti Hai:' : 'Live Price Comparison Across Verified Pakistani Platforms:'}
        </p>
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {platforms.map((plat) => (
            <SourceBadge key={plat} platform={plat} size="md" showTrustScore />
          ))}
        </div>
      </section>

      {/* 3-Step "How It Works" Section */}
      <section className="mb-14">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading">
            {isUrduMode ? 'ShopSense Kaise Kaam Karta Hai' : 'How ShopSense Works'}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
            {isUrduMode ? '3 asaan marhalay jin se aap hazaron rupay bacha saktay hain' : 'Find visual matches and save Pakistani Rupees in 3 simple steps'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-6 shadow-xs flex flex-col">
            <div className="text-xs font-mono font-bold text-[#4F46E5] dark:text-[#818CF8] mb-3">01.</div>
            <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center mb-4">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 font-heading">
              {isUrduMode ? '1. Screenshot Lein' : '1. Screenshot the Product'}
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              {isUrduMode
                ? 'Instagram reel, TikTok video ya WhatsApp story se kisi bhi cheez ka screenshot lein. Product ka naam janne ki zaroorat nahi.'
                : 'Take a screenshot of any dress, shoe, or electronic gadget on Instagram, TikTok, or WhatsApp. You do not need to know the name.'}
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-6 shadow-xs flex flex-col">
            <div className="text-xs font-mono font-bold text-[#4F46E5] dark:text-[#818CF8] mb-3">02.</div>
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-[#431407] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 font-heading">
              {isUrduMode ? '2. ShopSense pe Upload Karein' : '2. Instant Visual Matching'}
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              {isUrduMode
                ? 'Hamara AI image recognition system silhouette aur details pehchan kar Daraz, Telemart, Bagallery aur local inventory scan karta hai.'
                : 'Our neural vision engine extracts colors, cuts, and materials to locate identical and similar stock across Pakistani e-commerce stores.'}
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-6 shadow-xs flex flex-col">
            <div className="text-xs font-mono font-bold text-[#4F46E5] dark:text-[#818CF8] mb-3">03.</div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-[#052E16] text-emerald-600 dark:text-[#4ADE80] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 font-heading">
              {isUrduMode ? '3. Qeemat Compare & Bachat' : '3. Compare & Buy at Lowest Price'}
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              {isUrduMode
                ? 'Dekhein kahan sab se kam qeemat aur free delivery hai, target price alert lagayein aur seedha dukan se kharidein.'
                : 'See a side-by-side PKR price breakdown, delivery charges, cash-on-delivery options, and link straight to the checkout.'}
            </p>
          </div>
        </div>
      </section>

      {/* Recent Visual Searches (if available) */}
      {recentSearches.length > 0 && (
        <section className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-6 shadow-xs mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading">
                {isUrduMode ? 'Aap ki Haaliyah Talash' : 'Your Recent Searches'}
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Tap to re-scan prices in 1 click</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentSearches.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onRerunHistory(item)}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#283548] hover:border-[#4F46E5] dark:hover:border-[#6366F1] hover:bg-[#EEF2FF]/30 dark:hover:bg-[#1E1B4B]/30 transition-all text-left cursor-pointer group"
              >
                {item.queryImage && (
                  <img
                    src={item.queryImage}
                    alt={item.queryText || 'Search preview'}
                    className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8]">
                    {item.queryText || 'Screenshot search'}
                  </p>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">
                    {item.category} · {item.timestamp}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Footer Trust Guarantee */}
      <section className="border-t border-slate-200 dark:border-[#1E293B] pt-8 pb-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>100% Genuine Pakistani Retailers</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Cash on Delivery (COD) Supported</span>
          <span aria-hidden="true">·</span>
          <span>No Login Required to Search</span>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          ShopSense Pakistan © 2026. Built with cross-platform Flutter parity.
        </p>
      </section>
    </div>
  );
};
