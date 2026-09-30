import React from 'react';
import { History, Trash2, ArrowRight, Search, Sparkles } from 'lucide-react';
import { SearchHistoryItem } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

interface SearchHistoryScreenProps {
  history: SearchHistoryItem[];
  onRerunSearch: (item: SearchHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onStartSearch: () => void;
  isUrduMode?: boolean;
}

export const SearchHistoryScreen: React.FC<SearchHistoryScreenProps> = ({
  history,
  onRerunSearch,
  onDeleteItem,
  onClearAll,
  onStartSearch,
  isUrduMode = false,
}) => {
  if (history.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          type="empty_history"
          title={isUrduMode ? 'Talash ki tareekh khali hai' : 'No visual searches yet'}
          description={isUrduMode ? 'Jab aap kisi product ka screenshot upload karenge to wo yahan mehfooz hoga.' : 'Screenshots and text queries you search will be saved locally for quick 1-tap re-scans.'}
          actionText={isUrduMode ? 'Talash Karein' : 'Start First Search'}
          onAction={onStartSearch}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading flex items-center gap-2">
            <History className="w-6 h-6 text-[#4F46E5] dark:text-[#818CF8]" />
            <span>{isUrduMode ? 'Haaliyah Talash ki Tareekh' : 'Search History'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
            Tap any past search to re-scan prices across Pakistani stores.
          </p>
        </div>

        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-[#DC2626] dark:text-[#EF4444] hover:text-[#B91C1C] p-2 hover:bg-red-50 dark:hover:bg-[#450A0A] rounded-lg transition-colors cursor-pointer"
        >
          {isUrduMode ? 'Tamam Saaf Karein' : 'Clear All'}
        </button>
      </div>

      {/* History Items List */}
      <div className="flex flex-col gap-3">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => onRerunSearch(item)}
            className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-3.5 sm:p-4 hover:border-[#4F46E5] dark:hover:border-[#6366F1] hover:shadow-xs transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer group"
          >
            {/* Visual Thumbnail & Metadata */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                {item.queryImage ? (
                  <img
                    src={item.queryImage}
                    alt={item.queryText || 'Search screenshot'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Search className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                )}
                <span className="absolute bottom-0 right-0 bg-[#4F46E5] text-white p-0.5 rounded-tl-md">
                  <Sparkles className="w-2.5 h-2.5" />
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] bg-[#EEF2FF] dark:bg-[#1E1B4B] px-2 py-0.2 rounded-md">
                    {item.category}
                  </span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{item.timestamp}</span>
                </div>

                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
                  {item.queryText || 'Screenshot Visual Search'}
                </h3>

                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {item.resultsCount} products found
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRerunSearch(item);
                }}
                className="h-9 px-3 rounded-lg bg-[#EEF2FF] dark:bg-[#1E1B4B] group-hover:bg-[#4F46E5] dark:group-hover:bg-[#6366F1] text-[#4F46E5] dark:text-[#A5B4FC] group-hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Re-run</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-400 hover:text-[#DC2626] dark:hover:text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer"
                title="Delete from history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
