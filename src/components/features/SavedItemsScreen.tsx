import React from 'react';
import { Trash2, ExternalLink, ArrowRight, TrendingDown, Layers, Sparkles } from 'lucide-react';
import { SavedItem, Product } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { SourceBadge } from '../ui/SourceBadge';
import { PriceTag, formatPKR } from '../ui/PriceTag';
import { Button } from '../ui/Button';

interface SavedItemsScreenProps {
  items: SavedItem[];
  onRemoveItem: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onCompareProduct: (product: Product) => void;
  onExplore: () => void;
  isUrduMode?: boolean;
}

export const SavedItemsScreen: React.FC<SavedItemsScreenProps> = ({
  items,
  onRemoveItem,
  onSelectProduct,
  onCompareProduct,
  onExplore,
  isUrduMode = false,
}) => {
  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          type="empty_saved"
          title={isUrduMode ? 'Koi cheez mehfooz nahi ki' : 'Your saved list is empty'}
          description={isUrduMode ? 'Kisi bhi product par dil (heart) daba kar usay yahan mehfooz karein.' : 'Tap the heart icon on any product to watch its price and buy whenever the price drops.'}
          actionText={isUrduMode ? 'Cheezein Dekhein' : 'Explore Products'}
          onAction={onExplore}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-150">
      {/* Page Title Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0C0C0C] dark:text-[#F5F5F5] font-heading">
            {isUrduMode ? 'Mehfooz Shuda Cheezein' : 'Saved Items & Price Watch'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5F5F60] dark:text-[#9C9C9D] mt-1">
            {items.length} {isUrduMode ? 'cheezein nazar mein hain' : 'products saved for price drop monitoring'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onExplore}
        >
          {isUrduMode ? 'Mazeed Dhoondein' : 'Find More Items'}
        </Button>
      </div>

      {/* Items List */}
      <div className="flex flex-col gap-3">
        {items.map((saved) => {
          const product = saved.product;
          const hasPriceDrop = saved.priceChange < 0;

          return (
            <div
              key={saved.id}
              onClick={() => onSelectProduct(product)}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-[#262626] p-4 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
            >
              {/* Product Info */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 dark:bg-[#0C0C0C] border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-2">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <SourceBadge platform={product.platform} size="sm" />
                    <span className="text-[11px] text-[#5F5F60] dark:text-[#9C9C9D]">
                      Saved {saved.savedAt}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#0C0C0C] dark:text-[#F5F5F5] truncate">
                    {product.title}
                  </h3>

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <PriceTag
                      price={saved.currentPrice}
                      originalPrice={product.originalPrice}
                      size="sm"
                      showDropBadge={false}
                    />

                    {/* Price Difference Since Saved */}
                    {hasPriceDrop && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#052E16] px-2 py-0.5 rounded-md border border-[#BBF7D0] dark:border-[#166534]">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>{formatPKR(Math.abs(saved.priceChange))} cheaper since saved!</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-[#262626] justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompareProduct(product);
                  }}
                  className="h-10 px-3 rounded-xl bg-[#F2F4D6] dark:bg-[#2B2F0C] hover:bg-[#E7EAB8] dark:hover:bg-[#2B2F0C] text-[#0C0C0C] dark:text-[#CDD835] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Compare across stores"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Compare</span>
                </button>

                <a
                  href={product.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="h-10 px-3.5 rounded-xl bg-[#0C0C0C] hover:bg-[#262626] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Buy</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(saved.id);
                  }}
                  className="w-10 h-10 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-[#DC2626] flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove from saved"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
