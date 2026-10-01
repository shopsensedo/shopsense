import React, { useState } from 'react';
import { Camera, Sparkles, ArrowRight, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import { SearchBar } from '../ui/SearchBar';
import { Dropzone } from '../ui/Dropzone';
import { SourceBadge } from '../ui/SourceBadge';
import { SearchHistoryItem, PlatformType } from '../../types';
import { handleImageError } from '../../utils/imageFallback';

interface HomeScreenProps {
  onImageSelected: (imageDataUrl: string, sourceName?: string) => void;
  onTextSearch: (query: string) => void;
  recentSearches: SearchHistoryItem[];
  onRerunHistory: (item: SearchHistoryItem) => void;
  isUrduMode?: boolean;
}

const CATEGORY_PILLS = [
  { label: 'Footwear', query: 'shoes' },
  { label: 'Ethnic Wear', query: 'lawn kurta' },
  { label: 'Smartwatches', query: 'smartwatch' },
  { label: 'Bags', query: 'ladies bag' },
  { label: 'Sale', query: 'sale' },
];

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-14 animate-fade-up">
      {/* Hero Section — Protech style */}
      <section className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
        <div className="text-[11px] md:text-xs font-bold text-olive dark:text-lime display-wide uppercase mb-4 flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isUrduMode ? 'Pakistan ka Pehla AI Price Scanner' : "Pakistan's AI Visual Price Comparison"}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-void dark:text-bone font-heading tracking-wide leading-[1.1] mb-5">
          {isUrduMode ? (
            <>
              Screenshot upload karein, <span className="text-olive dark:text-lime">sasti tareen</span> qeemat payein
            </>
          ) : (
            <>
              Snap it. Find it. <span className="text-olive dark:text-lime">Own the price.</span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-smoke dark:text-fog max-w-2xl mx-auto leading-relaxed mb-8">
          {isUrduMode
            ? 'Instagram ya TikTok par koi kapra, joota ya gadget pasand aya? ShopSense Daraz, Telemart aur local stores se foran sasti tareen qeemat nikal kar deta hai.'
            : 'Saw it on Instagram or TikTok? Upload the screenshot and scan Daraz, Telemart, Bagallery and local sellers for the lowest price in seconds.'}
        </p>

        {/* Text Search Bar */}
        <div className="max-w-xl mx-auto">
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

        {/* Category pills — like the reference's category tabs */}
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          {CATEGORY_PILLS.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => onTextSearch(cat.query)}
              className="h-10 px-5 rounded-full border border-[#E5E5E1] dark:border-ash text-xs font-bold text-void dark:text-bone hover:border-lime hover:bg-lime hover:text-void dark:hover:bg-lime dark:hover:text-void transition-all cursor-pointer"
            >
              {cat.label}
            </button>
          ))}
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
        <p className="text-[11px] font-bold text-smoke dark:text-fog uppercase display-wide mb-5">
          {isUrduMode ? 'Pakistan ki In Dukaano se Live Qeemat:' : 'Live Prices Across Verified Pakistani Platforms'}
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
          <h2 className="text-2xl sm:text-3xl font-bold text-void dark:text-bone font-heading tracking-wide">
            {isUrduMode ? 'ShopSense Kaise Kaam Karta Hai' : 'How ShopSense Works'}
          </h2>
          <p className="text-xs sm:text-sm text-smoke dark:text-fog mt-2">
            {isUrduMode ? '3 asaan marhalay jin se aap hazaron rupay bacha saktay hain' : 'Find visual matches and save Pakistani Rupees in 3 simple steps'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Step 1 */}
          <div className="bg-white dark:bg-carbon rounded-[20px] border border-[#E5E5E1] dark:border-graphite p-6 card-lift">
            <div className="text-xs font-bold text-olive dark:text-lime display-wide mb-4">01</div>
            <div className="w-12 h-12 rounded-2xl bg-limetint dark:bg-limedim text-void dark:text-lime flex items-center justify-center mb-4">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-void dark:text-bone mb-2 font-heading">
              {isUrduMode ? '1. Screenshot Lein' : '1. Screenshot the Product'}
            </h3>
            <p className="text-xs sm:text-sm text-smoke dark:text-fog leading-relaxed">
              {isUrduMode
                ? 'Instagram reel, TikTok video ya WhatsApp story se kisi bhi cheez ka screenshot lein. Product ka naam janne ki zaroorat nahi.'
                : 'Take a screenshot of any dress, shoe, or electronic gadget on Instagram, TikTok, or WhatsApp. You do not need to know the name.'}
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-carbon rounded-[20px] border border-[#E5E5E1] dark:border-graphite p-6 card-lift">
            <div className="text-xs font-bold text-olive dark:text-lime display-wide mb-4">02</div>
            <div className="w-12 h-12 rounded-2xl bg-limetint dark:bg-limedim text-void dark:text-lime flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-void dark:text-bone mb-2 font-heading">
              {isUrduMode ? '2. ShopSense pe Upload Karein' : '2. Instant Visual Matching'}
            </h3>
            <p className="text-xs sm:text-sm text-smoke dark:text-fog leading-relaxed">
              {isUrduMode
                ? 'Hamara AI image recognition system silhouette aur details pehchan kar Daraz, Telemart, Bagallery aur local inventory scan karta hai.'
                : 'Our neural vision engine extracts colors, cuts, and materials to locate identical and similar stock across Pakistani e-commerce stores.'}
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-carbon rounded-[20px] border border-[#E5E5E1] dark:border-graphite p-6 card-lift">
            <div className="text-xs font-bold text-olive dark:text-lime display-wide mb-4">03</div>
            <div className="w-12 h-12 rounded-2xl bg-limetint dark:bg-limedim text-void dark:text-lime flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-void dark:text-bone mb-2 font-heading">
              {isUrduMode ? '3. Qeemat Compare & Bachat' : '3. Compare & Buy at Lowest Price'}
            </h3>
            <p className="text-xs sm:text-sm text-smoke dark:text-fog leading-relaxed">
              {isUrduMode
                ? 'Dekhein kahan sab se kam qeemat aur free delivery hai, target price alert lagayein aur seedha dukan se kharidein.'
                : 'See a side-by-side PKR price breakdown, delivery charges, cash-on-delivery options, and link straight to the checkout.'}
            </p>
          </div>
        </div>
      </section>

      {/* Recent Visual Searches (if available) */}
      {recentSearches.length > 0 && (
        <section className="bg-white dark:bg-carbon rounded-[20px] border border-[#E5E5E1] dark:border-graphite p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-void dark:text-bone font-heading tracking-wide">
                {isUrduMode ? 'Aap ki Haaliyah Talash' : 'Your Recent Searches'}
              </h3>
              <p className="text-xs text-smoke dark:text-fog">Tap to re-scan prices in 1 click</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentSearches.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onRerunHistory(item)}
                className="flex items-center gap-3 p-3 rounded-2xl border border-[#E5E5E1] dark:border-ash hover:border-lime transition-all text-left cursor-pointer group"
              >
                {item.queryImage && (
                  <img
                    onError={handleImageError}
                    src={item.queryImage}
                    alt={item.queryText || 'Search preview'}
                    className="w-12 h-12 rounded-xl object-cover bg-void shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-void dark:text-bone truncate group-hover:text-olive dark:group-hover:text-lime">
                    {item.queryText || 'Screenshot search'}
                  </p>
                  <span className="text-[11px] text-smoke dark:text-fog block">
                    {item.category} · {item.timestamp}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-smoke dark:text-fog group-hover:text-olive dark:group-hover:text-lime shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Footer Trust Guarantee */}
      <section className="border-t border-[#E5E5E1] dark:border-graphite pt-8 pb-4 text-center text-xs text-smoke dark:text-fog">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80]" />
            <span>100% Genuine Pakistani Retailers</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Cash on Delivery (COD) Supported</span>
          <span aria-hidden="true">·</span>
          <span>No Login Required to Search</span>
        </div>
        <p className="text-[11px] opacity-70">
          ShopSense Pakistan © 2026. Built with cross-platform Flutter parity.
        </p>
      </section>
    </div>
  );
};
