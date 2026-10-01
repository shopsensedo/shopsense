import React from 'react';
import { ExternalLink, Check, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { Product } from '../../types';
import { SourceBadge } from './SourceBadge';
import { PriceTag, formatPKR } from './PriceTag';
import { handleImageError } from '../../utils/imageFallback';

interface ComparisonCardProps {
  product: Product;
  isLowestPrice?: boolean;
  lowestPriceDifference?: number;
  onSelect?: (product: Product) => void;
  className?: string;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  product,
  isLowestPrice = false,
  lowestPriceDifference = 0,
  onSelect,
  className = '',
}) => {
  return (
    <div
      onClick={() => onSelect?.(product)}
      className={`relative bg-white dark:bg-[#1A1A1A] rounded-2xl border p-4 md:p-5 transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer ${
        isLowestPrice
          ? 'border-[#16A34A] dark:border-[#22C55E] ring-2 ring-[#16A34A]/15 shadow-sm bg-gradient-to-r from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-[#1A1A1A]'
          : 'border-slate-200 dark:border-[#262626] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
      } ${className}`}
    >
      {/* Left Column: Image + Store info + Title */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-50 dark:bg-[#0C0C0C] border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-1.5">
          <img
            onError={handleImageError}
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <SourceBadge platform={product.platform} size="sm" showTrustScore />
            {isLowestPrice && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#16A34A] text-white shadow-2xs">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Lowest Price</span>
              </span>
            )}
            <span className="text-xs text-[#5F5F60] dark:text-[#9C9C9D]">
              ★ {product.rating} ({product.reviewsCount} reviews)
            </span>
          </div>

          <h4 className="text-sm font-semibold text-[#0C0C0C] dark:text-[#F5F5F5] truncate md:max-w-md">
            {product.title}
          </h4>

          <div className="flex items-center gap-3 text-xs text-[#5F5F60] dark:text-[#9C9C9D] mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{product.deliveryTime}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {product.deliveryCost === 0 ? (
                <strong className="text-[#16A34A] dark:text-[#22C55E] font-semibold">Free Delivery</strong>
              ) : (
                `Delivery: ${formatPKR(product.deliveryCost)}`
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Verified Seller</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Price + Difference + Buy CTA */}
      <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#262626]">
        <div className="text-left md:text-right">
          <PriceTag
            price={product.price}
            originalPrice={product.originalPrice}
            size="lg"
            showDropBadge={false}
          />
          {isLowestPrice ? (
            <span className="text-xs font-semibold text-[#16A34A] dark:text-[#4ADE80] block">
              Best price available in Pakistan
            </span>
          ) : (
            <span className="text-xs text-[#5F5F60] dark:text-[#9C9C9D] block tabular-nums">
              +{formatPKR(lowestPriceDifference)} vs lowest
            </span>
          )}
        </div>

        <a
          href={product.platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`h-11 px-4 md:px-5 rounded-xl font-semibold text-xs md:text-sm flex items-center gap-2 transition-all duration-150 shadow-sm shrink-0 min-h-[44px] ${
            isLowestPrice
              ? 'bg-[#16A34A] hover:bg-[#15803D] text-white focus-visible:ring-2 focus-visible:ring-[#16A34A]'
              : 'bg-[#0C0C0C] hover:bg-[#262626] text-white focus-visible:ring-2 focus-visible:ring-[#0C0C0C]'
          }`}
        >
          <span>Buy on {product.platform.toUpperCase()}</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
