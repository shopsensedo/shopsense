import React, { useEffect, useState } from 'react';
import { SearchLoadingSkeleton } from '../ui/SkeletonLoader';

interface SearchLoadingScreenProps {
  onComplete: () => void;
  isUrduMode?: boolean;
}

export const SearchLoadingScreen: React.FC<SearchLoadingScreenProps> = ({
  onComplete,
  isUrduMode = false,
}) => {
  const [step, setStep] = useState(1);

  const messagesEn = [
    'Analyzing screenshot visual attributes & contours...',
    'Scanning Daraz, PriceOye, Telemart & local fashion stores...',
    'Extracting prices and calculating PKR savings...',
  ];

  const messagesUr = [
    'Screenshot ki tasweeri jaanch ho rahi hai...',
    'Daraz, PriceOye, Telemart se live stock check kiya ja raha hai...',
    'PKR mein sab se sasti qeemat tayar ki ja rahi hai...',
  ];

  const messages = isUrduMode ? messagesUr : messagesEn;

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(2), 650);
    const timer2 = setTimeout(() => setStep(3), 1300);
    const timer3 = setTimeout(() => onComplete(), 1950);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-150">
      <SearchLoadingSkeleton
        progressMessage={messages[step - 1]}
        step={step}
      />
    </div>
  );
};
