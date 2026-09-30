import React from 'react';
import { Heart, ExternalLink, Sparkles, Check } from 'lucide-react';
import { Product } from '../../types';
import { SourceBadge } from './SourceBadge';
import { PriceTag } from './PriceTag';

interface ProductCardProps {
  product: Product;
  isSaved?: boolean;
  onToggleSave?: (product: Product) => void;
  onSelect?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSaved = false,
  onToggleSave,
  onSelect,
  onCompare,
  className = '',
}) => {
  return (
    <div
      onClick={() => onSelect?.(product)}
      className={`group relative flex flex-col bg-white dark:bg-[#131B2E] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-xs hover:shadow-md dark:hover:border-indigo-500/50 transition-all duration-200 overflow-hidden cursor-pointer ${className}`}
    >
      {/* Visual Image Slot */}
      <div className="relative aspect-[4/3] w-full bg-[#F8FAFC] dark:bg-[#0B0F19] overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
        />

        {/* Top Badges Bar */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <SourceBadge platform={product.platform} size="sm" />

          {/* Similarity Score Indicator */}
          <div className="flex items-center gap-1 bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs text-[11px] font-semibold text-[#4F46E5] dark:text-[#818CF8] tabular-nums">
            <Sparkles className="w-3 h-3 text-[#F97316]" />
            <span>{product.similarityScore}% match</span>
          </div>
        </div>

        {/* Floating Save Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(product);
          }}
          className={`absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 shadow-sm min-h-[36px] min-w-[36px] cursor-pointer ${
            isSaved
              ? 'bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#A5B4FC] ring-2 ring-[#4F46E5]'
              : 'bg-white/90 dark:bg-[#1E293B]/90 text-[#64748B] dark:text-[#94A3B8] hover:text-[#DC2626] hover:bg-white dark:hover:bg-[#1E293B]'
          }`}
          aria-label={isSaved ? 'Remove from saved' : 'Save item'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#4F46E5] dark:fill-[#A5B4FC]' : ''}`} />
        </button>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Unboxed Metadata Line */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] mb-1.5">
            <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{product.seller}</span>
            <span aria-hidden="true">·</span>
            <span>★ {product.rating} ({product.reviewsCount})</span>
          </div>

          {/* Product Title */}
          <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-2 leading-snug group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors mb-2">
            {product.title}
          </h3>

          {/* Price Component */}
          <PriceTag
            price={product.price}
            originalPrice={product.originalPrice}
            size="md"
          />

          {/* Delivery Note */}
          <div className="mt-2 text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
            {product.deliveryCost === 0 ? (
              <span className="text-[#16A34A] dark:text-[#22C55E] font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Free delivery
              </span>
            ) : (
              <span>Delivery: Rs. {product.deliveryCost}</span>
            )}
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.deliveryTime}</span>
          </div>
        </div>

        {/* Bottom Actions Row */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center gap-2">
          {onCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCompare(product);
              }}
              className="flex-1 h-9 rounded-lg bg-[#EEF2FF] dark:bg-[#1E1B4B] hover:bg-[#E0E7FF] dark:hover:bg-[#312E81] text-[#4F46E5] dark:text-[#A5B4FC] text-xs font-semibold flex items-center justify-center gap-1 transition-colors min-h-[36px]"
            >
              Compare Stores
            </button>
          )}

          <a
            href={product.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-[#283548] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
            title={`Open on ${product.platform}`}
          >
            <span>Store</span>
            <ExternalLink className="w-3 h-3 text-slate-500 dark:text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
