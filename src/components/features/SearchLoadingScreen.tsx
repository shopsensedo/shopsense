import React, { useEffect, useState } from 'react';
import { SearchLoadingSkeleton } from '../ui/SkeletonLoader';

interface SearchLoadingScreenProps {
  onComplete: () => void;
  isUrduMode?: boolean;
  /** 0..1 — when set, shows determinate progress (e.g. AI model downloading)
   *  and does NOT auto-complete; the parent drives completion. */
  progress?: number | null;
  progressLabel?: string;
  /** When false, the staged animation waits instead of auto-completing. */
  canComplete?: boolean;
}

export const SearchLoadingScreen: React.FC<SearchLoadingScreenProps> = ({
  onComplete,
  isUrduMode = false,
  progress = null,
  progressLabel,
  canComplete = true,
}) => {
  const [step, setStep] = useState(1);
  const determinate = progress !== null;

  const messagesEn = [
    'Analyzing screenshot visual attributes & contours...',
    'Scanning PriceOye & Daraz for live listings...',
    'Extracting prices and calculating PKR savings...',
  ];

  const messagesUr = [
    'Screenshot ki tasweeri jaanch ho rahi hai...',
    'PriceOye aur Daraz se live listings check ho rahi hain...',
    'PKR mein sab se sasti qeemat tayar ki ja rahi hai...',
  ];

  const messages = isUrduMode ? messagesUr : messagesEn;

  useEffect(() => {
    if (determinate || !canComplete) return; // wait for the real search to finish
    const timer1 = setTimeout(() => setStep(2), 650);
    const timer2 = setTimeout(() => setStep(3), 1300);
    const timer3 = setTimeout(() => onComplete(), 1950);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete, determinate, canComplete]);

  if (determinate) {
    const pct = Math.round(progress * 100);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 max-w-md mx-auto text-center">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="font-bold text-lg mb-1">
            {isUrduMode ? 'AI model load ho raha hai...' : 'Loading AI model...'}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
            {progressLabel ||
              (isUrduMode
                ? 'Pehli baar ~90MB download hoga, phir fast chalega'
                : 'One-time ~90MB download, then instant')}
          </p>
          <div className="h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-lime-400 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 text-sm font-semibold text-neutral-600 dark:text-neutral-300">{pct}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      <SearchLoadingSkeleton
        progressMessage={messages[step - 1]}
        step={step}
      />
    </div>
  );
};
