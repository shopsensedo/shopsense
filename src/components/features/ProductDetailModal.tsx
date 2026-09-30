import React from 'react';
import { ExternalLink, Heart, Bell, Check, Clock, Truck, ShieldCheck, Share2 } from 'lucide-react';
import { Product } from '../../types';
import { Modal } from '../ui/Modal';
import { SourceBadge } from '../ui/SourceBadge';
import { PriceTag, formatPKR } from '../ui/PriceTag';
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
      maxWidth="2xl"
      isBottomSheetOnMobile={true}
    >
      <div className="flex flex-col gap-6">
        {/* Top Product Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Gallery */}
          <div className="relative aspect-square w-full rounded-2xl bg-[#F8FAFC] dark:bg-[#0B0F19] border border-slate-200 dark:border-[#283548] overflow-hidden flex items-center justify-center p-4">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3">
              <SourceBadge platform={product.platform} size="md" showTrustScore />
            </div>
            <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] shadow-xs border border-slate-200 dark:border-slate-700">
              {product.similarityScore}% Visual Match
            </div>
          </div>

          {/* Details & Purchase Actions */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Brand & Store */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] uppercase tracking-wider">
                  {product.brand || product.category}
                </span>
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                  title="Share product"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <h2 className="text-lg md:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading leading-snug mb-3">
                {product.title}
              </h2>

              {/* Price & Drop Badge */}
              <div className="mb-4">
                <PriceTag
                  price={product.price}
                  originalPrice={product.originalPrice}
                  size="xl"
                  showDropBadge={true}
                />
              </div>

              {/* Features & Delivery details */}
              <div className="space-y-2 py-3 border-y border-slate-100 dark:border-[#1E293B] text-xs text-[#64748B] dark:text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>
                    Delivery: <strong className="text-slate-700 dark:text-slate-300">{product.deliveryTime}</strong> (
                    {formatPKR(product.deliveryCost)} or Free COD)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Verified Seller: <strong className="text-slate-700 dark:text-slate-300">{product.seller || 'Official Store'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8] shrink-0" />
                  <span>
                    Status: <strong className="text-emerald-600 dark:text-emerald-400">{product.inStock ? 'In Stock (Pakistan)' : 'Out of Stock'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-4 flex flex-col gap-2">
              <a
                href={product.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-150 cursor-pointer"
              >
                <span>{isUrduMode ? 'Dukan par Kharidein' : `Buy on ${product.platform.toUpperCase()}`}</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSave?.(product)}
                  className={`h-11 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isSaved
                      ? 'border-[#4F46E5] dark:border-[#818CF8] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#A5B4FC]'
                      : 'border-slate-200 dark:border-[#283548] hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E293B]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  <span>{isSaved ? 'Saved to Wishlist' : 'Save Item'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPriceAlert?.(product)}
                  className="h-11 rounded-xl border border-slate-200 dark:border-[#283548] hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E293B] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-[#F97316]" />
                  <span>Set Price Alert</span>
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
