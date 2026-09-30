import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] overflow-hidden shadow-xs animate-pulse">
      {/* Image Skeleton */}
      <div className="aspect-[4/3] w-full bg-slate-200 dark:bg-slate-800" />

      {/* Content Skeleton */}
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>

        <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />

        <div className="mt-2 flex items-center gap-2">
          <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>

        <div className="mt-2 h-9 w-full bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
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
      <div className="max-w-md mx-auto mb-8 bg-white dark:bg-[#131B2E] p-5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#EEF2FF] dark:bg-[#1E1B4B] flex items-center justify-center mb-3">
          <div className="w-6 h-6 border-3 border-[#4F46E5] dark:border-[#818CF8] border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1 font-heading">
          Searching Across Pakistan
        </h3>
        <p className="text-xs text-[#4F46E5] dark:text-[#818CF8] font-semibold transition-all duration-300">
          {progressMessage}
        </p>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step >= 1 ? 'bg-[#4F46E5] dark:bg-[#818CF8]' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step >= 2 ? 'bg-[#4F46E5] dark:bg-[#818CF8]' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step >= 3 ? 'bg-[#4F46E5] dark:bg-[#818CF8]' : 'bg-slate-200 dark:bg-slate-700'
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
