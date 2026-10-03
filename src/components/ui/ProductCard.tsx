import React from 'react';
import { Heart, ExternalLink, Star, Check, ImageOff } from 'lucide-react';
import { Product } from '../../types';
import { SourceBadge } from './SourceBadge';
import { formatPKR } from './PriceTag';
import { formatPriceOrUnavailable, liveWasDiscount } from '../../lib/liveNormalize';
import { handleImageError } from '../../utils/imageFallback';
import { similarityLabel, textSimilarityLabel } from '../../lib/liveSearch';

interface ProductCardProps {
  product: Product;
  isSaved?: boolean;
  onToggleSave?: (product: Product) => void;
  onSelect?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  className?: string;
  /** 'text' uses the text-to-image label band (Strong/Good/Possible match). */
  labelKind?: 'image' | 'text';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSaved = false,
  onToggleSave,
  onSelect,
  onCompare,
  className = '',
  labelKind = 'image',
}) => {
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <div
      data-testid="product-card"
      onClick={() => onSelect?.(product)}
      className={`group relative flex flex-col bg-white dark:bg-carbon rounded-[20px] border border-[#E5E5E1] dark:border-graphite overflow-hidden card-lift cursor-pointer ${className}`}
    >
      {/* Image well — deep black like the Protech reference. When the live
          thumbnail failed to load, show an honest placeholder instead of a
          broken image. */}
      <div className="relative aspect-[4/3] w-full bg-void overflow-hidden">
        {product.imageUnavailable ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
            <ImageOff className="w-8 h-8 text-fog/60" aria-hidden />
            <span className="text-xs font-semibold text-fog/80">Image unavailable</span>
            <span className="text-[10px] text-fog/50 leading-snug">
              Scored by title match — open the product page to see photos
            </span>
          </div>
        ) : (
          <img
            onError={handleImageError}
            src={product.imageUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* Sale badge — lime pill, top-left */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-lime text-void text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums">
            Sale {discountPercent}%
          </span>
        )}

        {/* Platform badge — bottom-left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <SourceBadge platform={product.platform} size="sm" />
          {product.isLive && (
            <span className="bg-lime text-void text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-void animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {/* Match pill — bottom-right, subtle. A title-scored listing (image
            unavailable) never claims visual similarity: it shows the
            title-derived label instead. */}
        <span
          data-testid="match-label-pill"
          className="absolute bottom-3 right-3 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full text-[11px] font-semibold text-white/90 tabular-nums"
        >
          {product.imageUnavailable && product.textLabel
            ? product.textLabel
            : labelKind === 'text'
              ? (product.textLabel ?? textSimilarityLabel((product.cosineSimilarity ?? product.similarityScore / 100)))
              : similarityLabel(product.similarityScore)}
        </span>

        {/* Heart — circular, top-right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(product);
          }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
            isSaved
              ? 'bg-lime text-void'
              : 'bg-white/10 backdrop-blur-sm text-white/80 hover:bg-lime hover:text-void'
          }`}
          aria-label={isSaved ? 'Remove from saved' : 'Save item'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-void' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Brand + rating — rating is hidden for live items: it is not scraped */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-smoke dark:text-fog truncate">
            {product.brand || product.category}
          </span>
          {!product.isLive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-void dark:text-bone shrink-0 tabular-nums">
              <Star className="w-3.5 h-3.5 text-lime fill-lime" />
              {product.rating}
            </span>
          )}
        </div>

        {/* Price — "Price unavailable" when the parsed price is missing,
            below Rs 50, or the source text carries no currency marker.
            Live items with raw originalPrice+discount show "was Rs 999 · 81% off".
            PriceOye "from" prices show "from Rs X" (lowest across merchants).
            fetchedAt renders as "checked X ago" for price-accuracy transparency. */}
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          {(() => {
            const priceStr = formatPriceOrUnavailable(product.price, product.priceText);
            const was =
              priceStr && product.isLive
                ? liveWasDiscount(product.rawPrice, product.price)
                : null;
            // "checked X ago" from fetchedAt
            let checkedAgo: string | null = null;
            if (product.fetchedAt) {
              const mins = Math.max(0, Math.round((Date.now() - new Date(product.fetchedAt).getTime()) / 60000));
              checkedAgo = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
            }
            return (
              <>
                {priceStr ? (
                  <span className="text-xl font-bold text-void dark:text-bone tracking-tight tabular-nums font-heading">
                    {product.priceIsFrom ? 'from ' : ''}{priceStr}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-smoke dark:text-fog">
                    Price unavailable
                  </span>
                )}
                {was && (
                  <span className="text-xs font-medium text-smoke dark:text-fog tabular-nums">
                    was {was.was} · {was.off}
                  </span>
                )}
                {checkedAgo && priceStr && (
                  <span className="text-[11px] text-smoke/70 dark:text-fog/70 tabular-nums" title={`Price fetched at ${product.fetchedAt}`}>
                    · checked {checkedAgo}
                  </span>
                )}
              </>
            );
          })()}
          {hasDiscount && (
            <span className="text-sm line-through text-smoke dark:text-fog tabular-nums">
              {formatPKR(product.originalPrice!)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm text-smoke dark:text-fog line-clamp-1 leading-snug mb-2">
          {product.title}
        </h3>

        {/* Delivery — hidden for live items: delivery info is not scraped */}
        {!product.isLive && (
          <div className="text-[11px] text-smoke dark:text-fog flex items-center gap-1 mb-3 whitespace-nowrap overflow-hidden">
            {product.deliveryCost === 0 ? (
              <span className="text-[#16A34A] dark:text-[#4ADE80] font-medium flex items-center gap-1 shrink-0">
                <Check className="w-3 h-3" /> Free delivery
              </span>
            ) : (
              <span className="shrink-0">Rs. {product.deliveryCost} delivery</span>
            )}
            <span aria-hidden="true" className="shrink-0">·</span>
            <span className="truncate">{product.deliveryTime}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2">
          {onCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCompare(product);
              }}
              className="flex-1 h-10 rounded-full bg-limetint dark:bg-limedim hover:bg-[#E7EAB8] dark:hover:bg-[#33330A] text-void dark:text-limebright text-xs font-bold transition-colors cursor-pointer"
            >
              Compare Stores
            </button>
          )}
          <a
            href={product.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="h-10 px-4 rounded-full border border-[#E5E5E1] dark:border-ash hover:border-void dark:hover:border-lime text-void dark:text-bone text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            title={`Open on ${product.platform}`}
          >
            <span>Store</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
