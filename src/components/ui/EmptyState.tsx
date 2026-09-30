import React from 'react';
import { SearchX, AlertTriangle, WifiOff, FileWarning, Bookmark, Bell, History } from 'lucide-react';
import { Button } from './Button';

export type EmptyStateType =
  | 'no_results'
  | 'upload_failed'
  | 'offline'
  | 'invalid_file'
  | 'empty_saved'
  | 'empty_tracking'
  | 'empty_history';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  const configs: Record<
    EmptyStateType,
    {
      icon: React.ReactNode;
      defaultTitle: string;
      defaultDesc: string;
      defaultAction: string;
    }
  > = {
    no_results: {
      icon: <SearchX className="w-10 h-10 text-[#4F46E5] dark:text-[#818CF8]" />,
      defaultTitle: 'No exact visual matches found',
      defaultDesc: 'Try adjusting the crop frame closer to the product, or search using Roman Urdu text (e.g. "kala joota", "lawn suit").',
      defaultAction: 'Try New Search',
    },
    upload_failed: {
      icon: <AlertTriangle className="w-10 h-10 text-[#DC2626] dark:text-[#EF4444]" />,
      defaultTitle: 'Upload processing failed',
      defaultDesc: 'We could not read the screenshot. Ensure the image is clear, uncorrupted, and under 15MB.',
      defaultAction: 'Retry Upload',
    },
    offline: {
      icon: <WifiOff className="w-10 h-10 text-[#F59E0B] dark:text-[#FBBF24]" />,
      defaultTitle: 'You are currently offline',
      defaultDesc: 'Please check your internet connection in Pakistan (PTCL, Nayatel, Jazz, Zong).',
      defaultAction: 'Check Connection',
    },
    invalid_file: {
      icon: <FileWarning className="w-10 h-10 text-[#DC2626] dark:text-[#EF4444]" />,
      defaultTitle: 'Unsupported file type',
      defaultDesc: 'Please upload an image file such as JPG, PNG, or WEBP screenshot.',
      defaultAction: 'Select Image',
    },
    empty_saved: {
      icon: <Bookmark className="w-10 h-10 text-[#4F46E5] dark:text-[#818CF8]" />,
      defaultTitle: 'No saved items yet',
      defaultDesc: 'Tap the heart icon on any product in your search results to keep track of prices here.',
      defaultAction: 'Explore Products',
    },
    empty_tracking: {
      icon: <Bell className="w-10 h-10 text-[#F97316] dark:text-[#FB923C]" />,
      defaultTitle: 'No active price alerts',
      defaultDesc: 'Set a target price in PKR on any product to get alerted as soon as the price drops on Daraz or other stores.',
      defaultAction: 'Find Products to Track',
    },
    empty_history: {
      icon: <History className="w-10 h-10 text-[#64748B] dark:text-[#94A3B8]" />,
      defaultTitle: 'No search history yet',
      defaultDesc: 'Screenshots and queries you search will appear here for fast 1-tap re-checks.',
      defaultAction: 'Start First Search',
    },
  };

  const config = configs[type];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-[#1E293B] flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
        {config.icon}
      </div>

      <h3 className="text-base md:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading mb-1.5">
        {title || config.defaultTitle}
      </h3>

      <p className="text-xs md:text-sm text-[#64748B] dark:text-[#94A3B8] mb-6 leading-relaxed">
        {description || config.defaultDesc}
      </p>

      {onAction && (
        <Button
          variant="primary"
          size="md"
          onClick={onAction}
          className="w-full sm:w-auto min-w-[160px]"
        >
          {actionText || config.defaultAction}
        </Button>
      )}
    </div>
  );
};
