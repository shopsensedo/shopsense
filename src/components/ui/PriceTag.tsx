import React from 'react';
import { TrendingDown } from 'lucide-react';

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDropBadge?: boolean;
  className?: string;
}

export const formatPKR = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-PK')}`;
};

export const PriceTag: React.FC<PriceTagProps> = ({
  price,
  originalPrice,
  currency = 'PKR',
  size = 'md',
  showDropBadge = true,
  className = '',
}) => {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const sizeStyles = {
    sm: {
      price: 'text-sm font-semibold',
      original: 'text-xs',
      badge: 'text-[10px] px-1.5 py-0.5',
    },
    md: {
      price: 'text-base font-bold',
      original: 'text-xs',
      badge: 'text-xs px-2 py-0.5',
    },
    lg: {
      price: 'text-xl font-bold',
      original: 'text-sm',
      badge: 'text-xs px-2 py-0.5',
    },
    xl: {
      price: 'text-2xl md:text-3xl font-bold',
      original: 'text-base',
      badge: 'text-xs px-2.5 py-1',
    },
  };

  return (
    <div className={`flex items-baseline flex-wrap gap-2 ${className}`}>
      <span className={`${sizeStyles[size].price} text-[#0C0C0C] dark:text-[#F5F5F5] tracking-tight tabular-nums`}>
        {formatPKR(price)}
      </span>

      {hasDiscount && (
        <span className={`${sizeStyles[size].original} line-through text-[#5F5F60] dark:text-[#9C9C9D] tabular-nums`}>
          {formatPKR(originalPrice)}
        </span>
      )}

      {hasDiscount && showDropBadge && (
        <span className={`inline-flex items-center gap-1 font-semibold rounded bg-[#F0FDF4] dark:bg-[#052E16] text-[#16A34A] dark:text-[#4ADE80] border border-[#BBF7D0] dark:border-[#166534] ${sizeStyles[size].badge}`}>
          <TrendingDown className="w-3 h-3 stroke-[2.5]" />
          <span>-{discountPercent}%</span>
        </span>
      )}
    </div>
  );
};
