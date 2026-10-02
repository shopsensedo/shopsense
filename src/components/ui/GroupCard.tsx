import React from 'react';
import { Heart, ExternalLink, ImageOff } from 'lucide-react';
import { Product } from '../../types';
import { SourceBadge } from './SourceBadge';
import { formatPriceOrUnavailable, distinctPlatforms, bestAvailablePrice } from '../../lib/liveNormalize';
import { handleImageError } from '../../utils/imageFallback';
import { similarityLabel, textSimilarityLabel } from '../../lib/liveSearch';

interface GroupCardProps {
  /** Members in ranked order — members[0] is the best match. */
  members: Product[];
  isSaved?: boolean;
  onToggleSave?: (product: Product) => void;
  onSelect?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  className?: string;
  /** 'text' uses the text-to-image label band (Strong/Good/Possible match). */
  labelKind?: 'image' | 'text';
}

/**
 * Cross-platform comparison card (T3): one product found on several stores,
 * shown once with per-platform prices. Save / select / compare act on the
 * best-ranked member; every price and link is the source's own real data.
 */
export const GroupCard: React.FC<GroupCardProps> = ({
  members,
  isSaved = false,
  onToggleSave,
  onSelect,
  onCompare,
  className = '',
  labelKind = 'image',
}) => {
  const best = members[0];
  const platforms = distinctPlatforms(members);
  const bestPrice = bestAvailablePrice(members);
  const anyLive = members.some((m) => m.isLive);

  return (
    <div
      data-testid="product-group-card"
      onClick={() => onSelect?.(best)}
      className={`group relative flex flex-col bg-white dark:bg-carbon rounded-[20px] border border-[#E5E5E1] dark:border-graphite overflow-hidden card-lift cursor-pointer ${className}`}
    >
      {/* Image well — best member's image */}
      <div className="relative aspect-[4/3] w-full bg-void overflow-hidden">
        {best.imageUnavailable ? (
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
            src={best.imageUrl}
            alt={best.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* Compare badge — lime pill, top-left */}
        <span className="absolute top-3 left-3 bg-lime text-void text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums">
          {platforms.length} stores
        </span>

        {/* LIVE badge — bottom-left */}
        {anyLive && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-lime text-void text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-void animate-pulse" />
              LIVE
            </span>
          </div>
        )}

        {/* Match pill — bottom-right, from the best member */}
        <span
          data-testid="match-label-pill"
          className="absolute bottom-3 right-3 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full text-[11px] font-semibold text-white/90 tabular-nums"
        >
          {best.imageUnavailable && best.textLabel
            ? best.textLabel
            : labelKind === 'text'
              ? (best.textLabel ?? textSimilarityLabel((best.cosineSimilarity ?? best.similarityScore / 100)))
              : similarityLabel(best.similarityScore)}
        </span>

        {/* Heart — circular, top-right (saves the best member) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(best);
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
        {/* Best price */}
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          {bestPrice !== null ? (
            <span className="text-xl font-bold text-void dark:text-bone tracking-tight tabular-nums font-heading">
              Rs. {bestPrice.toLocaleString('en-PK')}
            </span>
          ) : (
            <span className="text-sm font-semibold text-smoke dark:text-fog">
              Price unavailable
            </span>
          )}
          <span className="text-xs font-medium text-smoke dark:text-fog">best price</span>
        </div>

        {/* Title */}
        <h3 className="text-sm text-smoke dark:text-fog line-clamp-1 leading-snug mb-3">
          {best.title}
        </h3>

        {/* Per-platform prices — every row is that store's own real listing */}
        <ul className="flex flex-col gap-1.5 mt-auto">
          {members.map((m) => {
            const priceStr = formatPriceOrUnavailable(m.price, m.priceText);
            return (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-bone/60 dark:bg-graphite/40 px-2.5 py-1.5"
              >
                <SourceBadge platform={m.platform} size="sm" />
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-void dark:text-bone tabular-nums truncate">
                    {priceStr ?? 'Price unavailable'}
                  </span>
                  <a
                    href={m.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Open on ${m.seller || m.platform}`}
                    className="text-smoke dark:text-fog hover:text-void dark:hover:text-bone shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </span>
              </li>
            );
          })}
        </ul>

        {/* Compare action — compares the best member */}
        {onCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCompare(best);
            }}
            className="mt-3 text-xs font-bold text-void dark:text-bone underline underline-offset-2 decoration-lime decoration-2 cursor-pointer self-start"
          >
            Add best price to compare
          </button>
        )}
      </div>
    </div>
  );
};
