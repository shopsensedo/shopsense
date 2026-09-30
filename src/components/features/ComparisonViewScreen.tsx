import React, { useMemo } from 'react';
import { ArrowLeft, Check, Sparkles, TrendingDown, Bell, ShieldCheck, ExternalLink } from 'lucide-react';
import { Product } from '../../types';
import { ComparisonCard } from '../ui/ComparisonCard';
import { formatPKR } from '../ui/PriceTag';

interface ComparisonViewScreenProps {
  selectedProduct: Product;
  allProducts: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onOpenPriceAlert: (product: Product) => void;
  isUrduMode?: boolean;
}

export const ComparisonViewScreen: React.FC<ComparisonViewScreenProps> = ({
  selectedProduct,
  allProducts,
  onBack,
  onSelectProduct,
  onOpenPriceAlert,
  isUrduMode = false,
}) => {
  // Find all items in the same category / similar products
  const comparisonItems = useMemo(() => {
    const items = allProducts.filter(
      (p) => p.category === selectedProduct.category || p.similarityScore >= 85
    );
    return items.sort((a, b) => a.price - b.price);
  }, [allProducts, selectedProduct]);

  const lowestProduct = comparisonItems[0] || selectedProduct;
  const highestProduct = comparisonItems[comparisonItems.length - 1] || selectedProduct;
  const maxSavings = highestProduct.price - lowestProduct.price;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-150">
      {/* Back button & Title bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#4F46E5] dark:text-[#818CF8] hover:text-[#3730A3] transition-colors p-2 rounded-lg hover:bg-[#EEF2FF] dark:hover:bg-[#1E1B4B] -ml-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isUrduMode ? 'Wapas Nataij Par' : 'Back to Results Grid'}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenPriceAlert(lowestProduct)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#283548] hover:border-slate-300 dark:hover:border-slate-600 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors shadow-2xs cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5 text-[#F97316]" />
          <span>{isUrduMode ? 'Alert Set Karein' : 'Track Price Alerts'}</span>
        </button>
      </div>

      {/* Savings Highlight Banner */}
      <div className="bg-gradient-to-r from-[#4F46E5] to-[#3730A3] dark:from-[#4338CA] dark:to-[#1E1B4B] text-white rounded-2xl p-5 md:p-6 mb-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Multi-Store PKR Comparison</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-heading">
            {isUrduMode ? (
              <>Daraz aur local stores mein {formatPKR(maxSavings)} tak ki bachat!</>
            ) : (
              <>Save up to {formatPKR(maxSavings)} on identical products!</>
            )}
          </h2>
          <p className="text-xs md:text-sm text-indigo-100 mt-1 max-w-xl">
            We compared verified inventory from Daraz PK, Telemart, Bagallery, and top Karachi & Lahore stores.
          </p>
        </div>

        {/* Highlight Lowest Price Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3.5 text-center shrink-0 min-w-[200px]">
          <span className="text-xs text-indigo-200 block uppercase tracking-wider font-medium">Lowest Available Price</span>
          <div className="text-2xl font-bold text-white mt-0.5">{formatPKR(lowestProduct.price)}</div>
          <span className="text-[11px] font-semibold text-[#4ADE80] mt-1 inline-block">
            on {lowestProduct.platform.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Comparison Grid Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading">
          {comparisonItems.length} {isUrduMode ? 'Milte jultay results (Kam qeemat pehle)' : 'Similar Items (Ranked by Lowest Price)'}
        </h3>
        <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Updated today · Live stock check
        </span>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="flex flex-col gap-3">
        {comparisonItems.map((item, index) => {
          const isLowest = index === 0;
          const diff = item.price - lowestProduct.price;

          return (
            <ComparisonCard
              key={item.id}
              product={item}
              isLowestPrice={isLowest}
              lowestPriceDifference={diff}
              onSelect={onSelectProduct}
            />
          );
        })}
      </div>

      {/* Delivery & Security Note */}
      <div className="mt-8 p-4 bg-slate-50 dark:bg-[#131B2E] rounded-xl border border-slate-200 dark:border-[#1E293B] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>All store purchase buttons open directly on the verified retailer website.</span>
        </div>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          ShopSense does not mark up prices or charge buyer commissions.
        </span>
      </div>
    </div>
  );
};
