import React from 'react';
import { ExternalLink, Heart, Bell, Check, Truck, ShieldCheck, Share2, Star } from 'lucide-react';
import { Product } from '../../types';
import { Modal } from '../ui/Modal';
import { SourceBadge } from '../ui/SourceBadge';
import { formatPKR } from '../ui/PriceTag';
import { PriceChart } from '../ui/PriceChart';
import { useToast } from '../ui/Toast';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved?: boolean;
  onToggleSave?: (product: Product) => void;
  onOpenPriceAlert?: (product: Product) => void;
  isUrduMode?: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  isSaved = false,
  onToggleSave,
  onOpenPriceAlert,
  isUrduMode = false,
}) => {
  const { showToast } = useToast();

  if (!product) return null;

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'info');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      isBottomSheetOnMobile={true}
    >
      <div className="flex flex-col gap-6">
        {/* Detail layout — Protech product page style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Image */}
          <div className="relative aspect-square w-full rounded-[20px] bg-void overflow-hidden flex items-center justify-center p-6">
            <img
              src={product.imageUrl}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <SourceBadge platform={product.platform} size="md" showTrustScore />
            </div>
            {hasDiscount && (
              <span className="absolute top-4 right-4 bg-lime text-void text-xs font-bold px-3 py-1.5 rounded-full tabular-nums">
                Sale {discountPercent}%
              </span>
            )}
            <span className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-white tabular-nums">
              {product.similarityScore}% Visual Match
            </span>
            <button
              type="button"
              onClick={() => onToggleSave?.(product)}
              className={`absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isSaved ? 'bg-lime text-void' : 'bg-white/10 backdrop-blur-sm text-white/80 hover:bg-lime hover:text-void'
              }`}
              aria-label={isSaved ? 'Remove from saved' : 'Save item'}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-void' : ''}`} />
            </button>
          </div>

          {/* Info column */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="bg-lime text-void text-[11px] font-bold uppercase tracking-[0.14em] px-3 py-1.5 rounded-full">
                {isUrduMode ? 'Behtareen' : 'Bestseller'}
              </span>
              <button
                type="button"
                onClick={handleShare}
                className="w-9 h-9 rounded-full border border-[#E5E5E1] dark:border-ash text-smoke dark:text-fog hover:text-void dark:hover:text-bone hover:border-lime flex items-center justify-center transition-colors cursor-pointer"
                title="Share product"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-smoke dark:text-fog mb-1.5">
              {product.brand || product.category}
            </p>

            <h2 className="text-xl md:text-2xl font-bold text-void dark:text-bone font-heading tracking-wide leading-snug mb-3">
              {product.title}
            </h2>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= Math.round(product.rating) ? 'text-lime fill-lime' : 'text-[#D8D8D2] dark:text-ash'}`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-void dark:text-bone tabular-nums">{product.rating}</span>
              <span className="text-xs text-smoke dark:text-fog tabular-nums">({product.reviewsCount} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-3xl md:text-4xl font-bold text-void dark:text-bone font-heading tracking-tight tabular-nums">
                {formatPKR(product.price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg line-through text-smoke dark:text-fog tabular-nums">
                    {formatPKR(product.originalPrice!)}
                  </span>
                  <span className="bg-lime text-void text-xs font-bold px-2.5 py-1 rounded-full tabular-nums">
                    −{discountPercent}%
                  </span>
                </>
              )}
            </div>

            {/* Feature bullets */}
            <ul className="space-y-2.5 py-4 border-y border-[#E5E5E1] dark:border-graphite text-[13px] text-smoke dark:text-fog mb-5">
              <li className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-olive dark:text-lime shrink-0" />
                <span>
                  Delivery <strong className="text-void dark:text-bone">{product.deliveryTime}</strong>
                  {' '}· {product.deliveryCost === 0 ? 'Free COD' : formatPKR(product.deliveryCost)}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-olive dark:text-lime shrink-0" />
                <span>
                  Verified seller: <strong className="text-void dark:text-bone">{product.seller || 'Official Store'}</strong>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-olive dark:text-lime shrink-0" />
                <span>
                  Status:{' '}
                  <strong className={product.inStock ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#EF4444]'}>
                    {product.inStock ? (isUrduMode ? 'Mojood (Pakistan)' : 'In Stock (Pakistan)') : 'Out of Stock'}
                  </strong>
                </span>
              </li>
            </ul>

            {/* CTAs — Protech Buy Now style */}
            <div className="flex flex-col gap-2.5 mt-auto">
              <a
                href={product.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-13 min-h-[52px] rounded-full bg-void hover:bg-graphite dark:bg-lime dark:hover:bg-limedeep text-white dark:text-void font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_8px_24px_-10px_rgba(185,192,6,0.55)]"
              >
                <span>{isUrduMode ? 'Dukan par Kharidein' : `Buy on ${product.platform.toUpperCase()}`}</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleSave?.(product)}
                  className={`h-11 rounded-full border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isSaved
                      ? 'border-lime bg-limetint dark:bg-limedim text-void dark:text-limebright'
                      : 'border-[#E5E5E1] dark:border-ash hover:border-lime text-void dark:text-bone'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save Item'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPriceAlert?.(product)}
                  className="h-11 rounded-full border border-[#E5E5E1] dark:border-ash hover:border-lime text-void dark:text-bone text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-olive dark:text-lime" />
                  <span>Price Alert</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 30-Day Interactive Price History Chart */}
        {product.priceHistory && product.priceHistory.length > 0 && (
          <div>
            <PriceChart
              data={product.priceHistory}
              currentPrice={product.price}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
