import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-[#262626] overflow-hidden shadow-xs animate-pulse">
      {/* Image Skeleton */}
      <div className="aspect-[4/3] w-full bg-slate-200 dark:bg-[#262626]" />

      {/* Content Skeleton */}
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-slate-200 dark:bg-[#262626] rounded-md" />
          <div className="h-4 w-14 bg-slate-200 dark:bg-[#262626] rounded-md" />
        </div>

        <div className="h-4 w-full bg-slate-200 dark:bg-[#262626] rounded-md" />
        <div className="h-4 w-3/4 bg-slate-200 dark:bg-[#262626] rounded-md" />

        <div className="mt-2 flex items-center gap-2">
          <div className="h-6 w-28 bg-slate-200 dark:bg-[#262626] rounded-md" />
          <div className="h-4 w-12 bg-slate-200 dark:bg-[#262626] rounded-md" />
        </div>

        <div className="mt-2 h-9 w-full bg-slate-100 dark:bg-[#262626]/60 rounded-lg" />
      </div>
    </div>
  );
};

export const SearchLoadingSkeleton: React.FC<{ progressMessage?: string; step?: number }> = ({
  progressMessage = 'Analyzing visual features...',
  step = 1,
}) => {
  return (
    <div className="w-full py-8">
      {/* Progress Box */}
      <div className="max-w-md mx-auto mb-8 bg-white dark:bg-[#1A1A1A] p-5 rounded-2xl border border-slate-200 dark:border-[#262626] shadow-sm text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#F2F4D6] dark:bg-[#2B2F0C] flex items-center justify-center mb-3">
          <div className="w-6 h-6 border-3 border-[#0C0C0C] dark:border-[#B9C006] border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-base font-bold text-[#0C0C0C] dark:text-[#F5F5F5] mb-1 font-heading">
          Searching Across Pakistan
        </h3>
        <p className="text-xs text-[#0C0C0C] dark:text-[#B9C006] font-semibold transition-all duration-300">
          {progressMessage}
        </p>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step >= 1 ? 'bg-[#0C0C0C] dark:bg-[#B9C006]' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step >= 2 ? 'bg-[#0C0C0C] dark:bg-[#B9C006]' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step >= 3 ? 'bg-[#0C0C0C] dark:bg-[#B9C006]' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        </div>
      </div>

      {/* Grid of Skeleton Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};
