import React from 'react';
import { PlatformType } from '../../types';
import { PLATFORMS_INFO } from '../../lib/mockData';

interface SourceBadgeProps {
  platform: PlatformType;
  size?: 'sm' | 'md';
  showTrustScore?: boolean;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  platform,
  size = 'md',
  showTrustScore = false,
  className = '',
}) => {
  const info = PLATFORMS_INFO[platform] || {
    id: platform,
    name: platform,
    color: '#64748B',
    badgeBg: '#F1F5F9',
    badgeText: '#475569',
    trustedSellerRate: 90,
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[11px] px-2 py-0.5 gap-1.5' 
    : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md tracking-tight select-none border border-black/5 ${sizeClasses} ${className}`}
      style={{
        backgroundColor: info.badgeBg,
        color: info.badgeText,
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: info.color }}
      />
      <span className="font-semibold">{info.name}</span>
      {showTrustScore && (
        <span className="opacity-75 text-[10px] tabular-nums">
          · {info.trustedSellerRate}%
        </span>
      )}
    </span>
  );
};
