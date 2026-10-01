import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, Sparkles, Layers, X, Filter, ChevronDown } from 'lucide-react';
import { Product, PlatformType, FilterOptions } from '../../types';
import { ProductCard } from '../ui/ProductCard';
import { SourceBadge } from '../ui/SourceBadge';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { formatPKR } from '../ui/PriceTag';
import { handleImageError } from '../../utils/imageFallback';

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

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'similarity', label: 'Highest Similarity' },
];

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 10000,
    platforms: ['daraz', 'telemart', 'bagallery', 'priceoye', 'elo', 'shophive', 'gulahmed'],
    minSimilarity: 85,
    inStockOnly: false,
    sortBy: 'relevance',
  });

  const allPlatforms: PlatformType[] = ['daraz', 'telemart', 'bagallery', 'priceoye', 'elo', 'shophive', 'gulahmed'];

  // Category pills derived from the result set (Protech-style tabs)
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      if (p.category) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
  }, [products]);

  // Filter and sort computation
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
      if (filters.platforms.length > 0 && !filters.platforms.includes(p.platform)) return false;
      if (p.similarityScore < filters.minSimilarity) return false;
      if (filters.inStockOnly && !p.inStock) return false;
      if (activeCategory && p.category !== activeCategory) return false;
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
  }, [products, filters, activeCategory]);

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
    setActiveCategory(null);
  };

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label || 'Best Match';

  const filterSidebarContent = (
    <div className="flex flex-col gap-6 text-sm">
      {/* Price Range */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-smoke dark:text-fog">
            {isUrduMode ? 'Qeemat ki Had' : 'Price Range'}
          </span>
          <span className="text-xs text-void dark:text-lime font-bold tabular-nums">
            {formatPKR(filters.minPrice)} – {formatPKR(filters.maxPrice)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10000}
          step={250}
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-lime cursor-pointer"
        />
      </div>

      {/* Platform Checkboxes */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-smoke dark:text-fog mb-2.5">
          {isUrduMode ? 'Online Dukanein' : 'Store Platforms'}
        </div>
        <div className="flex flex-col gap-1.5">
          {allPlatforms.map((plat) => {
            const isChecked = filters.platforms.includes(plat);
            return (
              <label
                key={plat}
                className={`flex items-center gap-2.5 cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors select-none ${
                  isChecked
                    ? 'text-void dark:text-bone'
                    : 'text-smoke dark:text-fog hover:text-void dark:hover:text-bone'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => togglePlatform(plat)}
                  className="rounded-full accent-lime w-4 h-4 cursor-pointer"
                />
                <SourceBadge platform={plat} size="sm" />
              </label>
            );
          })}
        </div>
      </div>

      {/* Minimum Similarity */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-smoke dark:text-fog">
            {isUrduMode ? 'Similarity' : 'Min Visual Match'}
          </span>
          <span className="text-xs text-void dark:text-lime font-bold tabular-nums">
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
          className="w-full accent-lime cursor-pointer"
        />
      </div>

      {/* In Stock Only */}
      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-void dark:text-bone select-none">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => setFilters({ ...filters, inStockOnly: e.target.checked })}
          className="rounded-full accent-lime w-4 h-4 cursor-pointer"
        />
        <span>{isUrduMode ? 'Sirf Mojood (In Stock)' : 'In Stock Only'}</span>
      </label>

      {/* Reset */}
      <button
        type="button"
        onClick={resetFilters}
        className="w-full h-10 rounded-full text-xs font-bold text-smoke dark:text-fog hover:text-void dark:hover:text-bone border border-[#E5E5E1] dark:border-ash hover:border-lime transition-colors cursor-pointer"
      >
        {isUrduMode ? 'Filters Reset Karein' : 'Reset All Filters'}
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 animate-fade-up">
      {/* Breadcrumb */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-smoke dark:text-fog mb-3 flex items-center gap-2">
        <button type="button" onClick={onNewSearch} className="hover:text-void dark:hover:text-lime transition-colors cursor-pointer">
          Home
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-void dark:text-bone">Results</span>
      </div>

      {/* Page heading — Protech "Bestsellers" style */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-void dark:text-bone font-heading tracking-wide">
            {isUrduMode ? 'Nataij' : 'Results'}
          </h1>
          <p className="text-sm text-smoke dark:text-fog mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-void dark:text-void bg-lime px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              AI Visual Match
            </span>
            <span className="tabular-nums font-semibold text-void dark:text-bone">{filteredProducts.length}</span>
            <span>{isUrduMode ? 'cheezein mili hain' : 'products found'}</span>
            {queryText && <span className="truncate max-w-[220px] hidden sm:inline">for “{queryText}”</span>}
          </p>
        </div>

        {/* Sort — pill dropdown */}
        <div className="relative shrink-0">
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
            className="appearance-none h-11 pl-5 pr-10 rounded-full border border-[#E5E5E1] dark:border-ash bg-white dark:bg-carbon text-xs font-bold text-void dark:text-bone focus:outline-none focus:border-lime cursor-pointer"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="dark:bg-carbon">
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-smoke dark:text-fog absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Category pills — like the reference tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`h-10 px-5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeCategory === null
              ? 'bg-void text-white dark:bg-lime dark:text-void'
              : 'border border-[#E5E5E1] dark:border-ash text-void dark:text-bone hover:border-lime'
          }`}
        >
          {isUrduMode ? 'Sab' : 'All items'}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={`h-10 px-5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer capitalize ${
              activeCategory === cat
                ? 'bg-void text-white dark:bg-lime dark:text-void'
                : 'border border-[#E5E5E1] dark:border-ash text-void dark:text-bone hover:border-lime'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Query banner */}
      {(queryImage || queryText) && (
        <div className="bg-white dark:bg-carbon rounded-[20px] border border-[#E5E5E1] dark:border-graphite p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {queryImage && (
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-void shrink-0">
                <img src={queryImage} alt="Search query" onError={handleImageError} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-lime text-void p-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" />
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-void dark:text-bone font-heading truncate">
                {queryText || (isUrduMode ? 'Aap ka upload kardah screenshot' : 'Uploaded screenshot query')}
              </h2>
              <p className="text-xs text-smoke dark:text-fog">
                {isUrduMode ? 'Visual scan mukammal — neeche milti julti ashya' : 'Visual scan complete — matching items below'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filteredProducts.length > 0 && (
              <button
                type="button"
                onClick={() => onCompareProduct(filteredProducts[0])}
                className="h-10 px-4 rounded-full bg-limetint dark:bg-limedim hover:bg-[#E7EAB8] dark:hover:bg-[#33330A] text-void dark:text-limebright text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>{isUrduMode ? 'Muqabla' : 'Compare'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onNewSearch}
              className="h-10 px-4 rounded-full border border-[#E5E5E1] dark:border-ash hover:border-lime text-void dark:text-bone text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{isUrduMode ? 'Nayi Talash' : 'New Search'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Sidebar + Grid */}
      <div className="flex items-start gap-6">
        <aside className="hidden lg:block w-64 bg-white dark:bg-carbon rounded-[20px] border border-[#E5E5E1] dark:border-graphite p-5 shrink-0 sticky top-24">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E5E1] dark:border-graphite">
            <h3 className="font-bold text-void dark:text-bone text-sm flex items-center gap-2 font-heading tracking-wide">
              <SlidersHorizontal className="w-4 h-4 text-olive dark:text-lime" />
              <span>{isUrduMode ? 'Filters' : 'Refine'}</span>
            </h3>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-olive dark:text-lime hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>
          {filterSidebarContent}
        </aside>

        <div className="flex-1 min-w-0">
          {/* Mobile filter trigger */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-full border border-[#E5E5E1] dark:border-ash text-xs font-bold text-void dark:text-bone cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-olive dark:text-lime" />
              <span>Filters</span>
              {(filters.platforms.length < allPlatforms.length || activeCategory) && (
                <span className="w-2 h-2 rounded-full bg-lime" />
              )}
            </button>
            <span className="text-xs text-smoke dark:text-fog">
              <strong className="text-void dark:text-bone tabular-nums">{filteredProducts.length}</strong> items
            </span>
          </div>

          {/* Product Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
              {filteredProducts.map((product, i) => (
                <div key={product.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                  <ProductCard
                    product={product}
                    isSaved={savedItemIds.includes(product.id)}
                    onToggleSave={onToggleSave}
                    onSelect={onSelectProduct}
                    onCompare={onCompareProduct}
                  />
                </div>
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

      {/* Mobile Filter Bottom Sheet */}
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
          <div className="mt-6 pt-4 border-t border-[#E5E5E1] dark:border-graphite">
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              className="w-full h-12 rounded-full bg-void dark:bg-lime text-white dark:text-void font-bold text-sm transition-colors cursor-pointer"
            >
              Show {filteredProducts.length} Results
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
