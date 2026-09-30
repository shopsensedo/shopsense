import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, ArrowUpDown, Sparkles, Layers, X, Filter } from 'lucide-react';
import { Product, PlatformType, FilterOptions } from '../../types';
import { ProductCard } from '../ui/ProductCard';
import { SourceBadge } from '../ui/SourceBadge';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { formatPKR } from '../ui/PriceTag';
import { PLATFORMS_INFO } from '../../lib/mockData';

interface ResultsScreenProps {
  products: Product[];
  queryImage?: string;
  queryText?: string;
  savedItemIds: string[];
  onToggleSave: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onCompareProduct: (product: Product) => void;
  onNewSearch: () => void;
  isUrduMode?: boolean;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  products,
  queryImage,
  queryText,
  savedItemIds,
  onToggleSave,
  onSelectProduct,
  onCompareProduct,
  onNewSearch,
  isUrduMode = false,
}) => {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 10000,
    platforms: ['daraz', 'telemart', 'bagallery', 'priceoye', 'elo', 'shophive', 'gulahmed'],
    minSimilarity: 85,
    inStockOnly: false,
    sortBy: 'relevance',
  });

  const allPlatforms: PlatformType[] = ['daraz', 'telemart', 'bagallery', 'priceoye', 'elo', 'shophive', 'gulahmed'];

  // Filter and sort computation
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
      if (filters.platforms.length > 0 && !filters.platforms.includes(p.platform)) return false;
      if (p.similarityScore < filters.minSimilarity) return false;
      if (filters.inStockOnly && !p.inStock) return false;
      return true;
    });

    switch (filters.sortBy) {
      case 'price_low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'similarity':
        list.sort((a, b) => b.similarityScore - a.similarityScore);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'relevance':
      default:
        list.sort((a, b) => b.similarityScore - a.similarityScore);
        break;
    }

    return list;
  }, [products, filters]);

  const togglePlatform = (p: PlatformType) => {
    setFilters((prev) => {
      const exists = prev.platforms.includes(p);
      const newPlatforms = exists
        ? prev.platforms.filter((item) => item !== p)
        : [...prev.platforms, p];
      return { ...prev, platforms: newPlatforms };
    });
  };

  const resetFilters = () => {
    setFilters({
      minPrice: 0,
      maxPrice: 10000,
      platforms: allPlatforms,
      minSimilarity: 85,
      inStockOnly: false,
      sortBy: 'relevance',
    });
  };

  const filterSidebarContent = (
    <div className="flex flex-col gap-6 text-sm">
      {/* Price Range */}
      <div>
        <div className="flex items-center justify-between font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
          <span>{isUrduMode ? 'Qeemat ki Had' : 'Price Range'}</span>
          <span className="text-xs text-[#4F46E5] dark:text-[#818CF8] font-bold tabular-nums">
            {formatPKR(filters.minPrice)} - {formatPKR(filters.maxPrice)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={10000}
            step={250}
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
            className="w-full accent-[#4F46E5] dark:accent-[#818CF8] cursor-pointer"
          />
        </div>
      </div>

      {/* Platform Checkboxes */}
      <div>
        <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2.5">
          {isUrduMode ? 'Online Dukanein' : 'Store Platforms'}
        </div>
        <div className="flex flex-col gap-2">
          {allPlatforms.map((plat) => {
            const isChecked = filters.platforms.includes(plat);
            const info = PLATFORMS_INFO[plat];
            return (
              <label
                key={plat}
                className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => togglePlatform(plat)}
                  className="rounded border-slate-300 dark:border-slate-600 text-[#4F46E5] focus:ring-[#4F46E5] w-4 h-4 cursor-pointer"
                />
                <SourceBadge platform={plat} size="sm" />
              </label>
            );
          })}
        </div>
      </div>

      {/* Minimum Similarity */}
      <div>
        <div className="flex items-center justify-between font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
          <span>{isUrduMode ? 'Similarity' : 'Min Visual Match'}</span>
          <span className="text-xs text-[#4F46E5] dark:text-[#818CF8] font-bold tabular-nums">
            {filters.minSimilarity}%+
          </span>
        </div>
        <input
          type="range"
          min={70}
          max={98}
          step={2}
          value={filters.minSimilarity}
          onChange={(e) => setFilters({ ...filters, minSimilarity: Number(e.target.value) })}
          className="w-full accent-[#4F46E5] dark:accent-[#818CF8] cursor-pointer"
        />
      </div>

      {/* In Stock Only */}
      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] select-none">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => setFilters({ ...filters, inStockOnly: e.target.checked })}
          className="rounded border-slate-300 dark:border-slate-600 text-[#4F46E5] focus:ring-[#4F46E5] w-4 h-4 cursor-pointer"
        />
        <span>{isUrduMode ? 'Sirf Mojood (In Stock)' : 'In Stock Only'}</span>
      </label>

      {/* Reset */}
      <button
        type="button"
        onClick={resetFilters}
        className="w-full py-2 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white border border-slate-200 dark:border-[#283548] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors"
      >
        {isUrduMode ? 'Filters Reset Karein' : 'Reset All Filters'}
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Search Header Banner */}
      <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-4 md:p-5 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Query Preview */}
        <div className="flex items-center gap-3.5 min-w-0">
          {queryImage && (
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
              <img
                src={queryImage}
                alt="Search Query Screenshot"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 bg-[#4F46E5] text-white p-0.5 rounded-tl-md">
                <Sparkles className="w-2.5 h-2.5" />
              </span>
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#A5B4FC] bg-[#EEF2FF] dark:bg-[#1E1B4B] px-2 py-0.5 rounded-full">
                AI Visual Match
              </span>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {filteredProducts.length} {isUrduMode ? 'cheezein mili hain' : 'products found'}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading truncate mt-0.5">
              {queryText || (isUrduMode ? 'Aap ka Upload kardah Screenshot' : 'Uploaded Screenshot Query')}
            </h2>
          </div>
        </div>

        {/* Right: Quick Actions (Compare Mode / Change Query) */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {filteredProducts.length > 0 && (
            <button
              type="button"
              onClick={() => onCompareProduct(filteredProducts[0])}
              className="h-10 px-3.5 rounded-xl bg-[#EEF2FF] dark:bg-[#1E1B4B] hover:bg-[#E0E7FF] dark:hover:bg-[#312E81] text-[#4F46E5] dark:text-[#A5B4FC] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>{isUrduMode ? 'Tamam Dukaano ka Muqabla' : 'Multi-Store Comparison'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewSearch}
            className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#283548] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>{isUrduMode ? 'Nayi Talash' : 'New Search'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Sidebar on Desktop + Grid */}
      <div className="flex items-start gap-6">
        {/* Desktop Sidebar (hidden on mobile/tablet) */}
        <aside className="hidden lg:block w-64 bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-5 shadow-xs shrink-0 sticky top-20">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#1E293B]">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>{isUrduMode ? 'Filters' : 'Refine Results'}</span>
            </h3>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[#4F46E5] dark:text-[#818CF8] hover:underline"
            >
              Reset
            </button>
          </div>
          {filterSidebarContent}
        </aside>

        {/* Products Grid Column */}
        <div className="flex-1 min-w-0">
          {/* Controls Bar: Mobile filter button + Sort dropdown */}
          <div className="flex items-center justify-between mb-4 bg-white dark:bg-[#131B2E] p-3 rounded-xl border border-slate-200 dark:border-[#1E293B] shadow-2xs">
            {/* Mobile Filter Sheet Trigger */}
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#283548] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-xs font-semibold text-slate-700 dark:text-slate-200 min-h-[36px]"
            >
              <Filter className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>Filters</span>
              {filters.platforms.length < allPlatforms.length && (
                <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              )}
            </button>

            <span className="hidden sm:inline text-xs text-[#64748B] dark:text-[#94A3B8]">
              Showing <strong className="text-[#0F172A] dark:text-[#F8FAFC]">{filteredProducts.length}</strong> matching items
            </span>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sort:</span>
              </span>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="h-8 rounded-lg border border-slate-200 dark:border-[#283548] bg-white dark:bg-[#131B2E] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] px-2 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] cursor-pointer"
              >
                <option value="relevance" className="dark:bg-[#131B2E]">Best Match (AI)</option>
                <option value="price_low" className="dark:bg-[#131B2E]">Price: Low to High</option>
                <option value="price_high" className="dark:bg-[#131B2E]">Price: High to Low</option>
                <option value="similarity" className="dark:bg-[#131B2E]">Highest Similarity</option>
                <option value="rating" className="dark:bg-[#131B2E]">Top Rated</option>
              </select>
            </div>
          </div>

          {/* Product Cards Grid: Mobile 2 col, Tablet 3, Desktop 4 (or 3 with sidebar) */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={savedItemIds.includes(product.id)}
                  onToggleSave={onToggleSave}
                  onSelect={onSelectProduct}
                  onCompare={onCompareProduct}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              type="no_results"
              title={isUrduMode ? 'Koi milti julti cheez nahi mili' : 'No matching products with current filters'}
              description={isUrduMode ? 'Filters thora kam karein ya qeemat ki had barhayein.' : 'Try widening your price range or enabling more store platforms.'}
              actionText={isUrduMode ? 'Filters Reset Karein' : 'Reset Filters'}
              onAction={resetFilters}
            />
          )}
        </div>
      </div>

      {/* Mobile Filter Modal Bottom Sheet */}
      <Modal
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title={isUrduMode ? 'Filters' : 'Filter Products'}
        subtitle="Filter by PKR price range and store platforms"
        maxWidth="md"
        isBottomSheetOnMobile={true}
      >
        <div className="py-2">
          {filterSidebarContent}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              className="w-full h-11 rounded-xl bg-[#4F46E5] hover:bg-[#3730A3] text-white font-semibold text-sm transition-colors"
            >
              Show {filteredProducts.length} Results
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
