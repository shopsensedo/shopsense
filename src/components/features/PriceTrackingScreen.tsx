import React from 'react';
import { Bell, BellOff, TrendingDown, ExternalLink, Trash2, CheckCircle2, Layers } from 'lucide-react';
import { PriceAlert, Product } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { SourceBadge } from '../ui/SourceBadge';
import { formatPKR } from '../ui/PriceTag';
import { Button } from '../ui/Button';
import { handleImageError } from '../../utils/imageFallback';

interface PriceTrackingScreenProps {
  alerts: PriceAlert[];
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onCompareProduct: (product: Product) => void;
  onExplore: () => void;
  isUrduMode?: boolean;
}

export const PriceTrackingScreen: React.FC<PriceTrackingScreenProps> = ({
  alerts,
  onToggleAlert,
  onDeleteAlert,
  onSelectProduct,
  onCompareProduct,
  onExplore,
  isUrduMode = false,
}) => {
  if (alerts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          type="empty_tracking"
          title={isUrduMode ? 'Koi active qeemat alert nahi hai' : 'No active price alerts'}
          description={isUrduMode ? 'Kisi bhi cheez par qeemat alert lagayein taake qeemat girtay hi aap ko khabar milay.' : 'Set your target price in PKR on any product to receive instant alerts when Daraz, Telemart or Bagallery drops their price.'}
          actionText={isUrduMode ? 'Products Dekhein' : 'Find Products to Track'}
          onAction={onExplore}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0C0C0C] dark:text-[#F5F5F5] font-heading flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#B9C006]" />
            <span>{isUrduMode ? 'Qeemat Alert Manager' : 'Price Tracking & Alerts'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#5F5F60] dark:text-[#9C9C9D] mt-1">
            ShopSense checks prices daily and sends alerts to WhatsApp & Email.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={onExplore}>
          {isUrduMode ? 'Nayi Cheez Track Karein' : 'Track Another Item'}
        </Button>
      </div>

      {/* Alert Cards List */}
      <div className="flex flex-col gap-4">
        {alerts.map((alert) => {
          const product = alert.product;
          const diffToTarget = alert.currentPrice - alert.targetPrice;
          const isTargetMet = alert.currentPrice <= alert.targetPrice;

          return (
            <div
              key={alert.id}
              onClick={() => onSelectProduct(product)}
              className={`bg-white dark:bg-[#1A1A1A] rounded-2xl border p-4 sm:p-5 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                alert.enabled
                  ? 'border-slate-200 dark:border-[#262626] hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  : 'border-slate-200/60 dark:border-[#262626]/60 bg-slate-50/50 dark:bg-[#0C0C0C]/50 opacity-75'
              }`}
            >
              {/* Product details */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 dark:bg-[#0C0C0C] border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-2">
                  <img
                    onError={handleImageError}
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <SourceBadge platform={product.platform} size="sm" />
                    <span className="text-[11px] text-[#5F5F60] dark:text-[#9C9C9D]">
                      Active since {alert.createdAt}
                    </span>
                    {alert.notificationsSent > 0 && (
                      <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800">
                        {alert.notificationsSent} alert sent
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-[#0C0C0C] dark:text-[#F5F5F5] truncate">
                    {product.title}
                  </h3>

                  {/* Pricing Comparison Stats */}
                  <div className="flex items-center gap-4 mt-2 flex-wrap text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Current Price</span>
                      <strong className="text-sm font-bold text-[#0C0C0C] dark:text-[#F5F5F5] tabular-nums">
                        {formatPKR(alert.currentPrice)}
                      </strong>
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Target Alert</span>
                      <strong className="text-sm font-bold text-[#B9C006] tabular-nums">
                        {formatPKR(alert.targetPrice)}
                      </strong>
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                    <div>
                      {isTargetMet ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#16A34A] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#052E16] px-2 py-0.5 rounded-md border border-[#BBF7D0] dark:border-[#166534]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Target Hit! Buy Now</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">
                          {formatPKR(diffToTarget)} above your target
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls and Toggles */}
              <div className="flex items-center gap-2 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#262626] shrink-0">
                {/* Enable/Disable Alert Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAlert(alert.id);
                  }}
                  className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    alert.enabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                  title={alert.enabled ? 'Pause notifications' : 'Resume notifications'}
                >
                  {alert.enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  <span>{alert.enabled ? 'Active' : 'Paused'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompareProduct(product);
                  }}
                  className="h-10 px-3 rounded-xl bg-[#F2F4D6] dark:bg-[#2B2F0C] hover:bg-[#E7EAB8] dark:hover:bg-[#2B2F0C] text-[#0C0C0C] dark:text-[#CDD835] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  <span>Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAlert(alert.id);
                  }}
                  className="w-10 h-10 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-[#DC2626] flex items-center justify-center transition-colors cursor-pointer"
                  title="Delete alert"
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
