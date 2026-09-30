import React, { useState } from 'react';
import { Crop, Sparkles, RefreshCw, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface CropPreviewModalProps {
  isOpen: boolean;
  imageSrc: string;
  onConfirmCrop: (croppedDataUrl: string) => void;
  onChangeImage: () => void;
  onClose: () => void;
  isUrduMode?: boolean;
}

export const CropPreviewModal: React.FC<CropPreviewModalProps> = ({
  isOpen,
  imageSrc,
  onConfirmCrop,
  onChangeImage,
  onClose,
  isUrduMode = false,
}) => {
  const [aspectPreset, setAspectPreset] = useState<'free' | '1:1' | '4:3' | '3:4'>('free');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cropBox, setCropBox] = useState({
    x: 15,
    y: 15,
    width: 70,
    height: 70,
  });

  if (!isOpen) return null;

  const handleRatioChange = (ratio: 'free' | '1:1' | '4:3' | '3:4') => {
    setAspectPreset(ratio);
    if (ratio === '1:1') {
      setCropBox({ x: 20, y: 20, width: 60, height: 60 });
    } else if (ratio === '4:3') {
      setCropBox({ x: 10, y: 20, width: 80, height: 60 });
    } else if (ratio === '3:4') {
      setCropBox({ x: 20, y: 10, width: 60, height: 80 });
    } else {
      setCropBox({ x: 15, y: 15, width: 70, height: 70 });
    }
  };

  const handleSearch = () => {
    onConfirmCrop(imageSrc);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#1E293B] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1E293B] flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading flex items-center gap-2">
              <Crop className="w-5 h-5 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>{isUrduMode ? 'Tasweer ko Crop Karein' : 'Crop & Focus on Item'}</span>
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              {isUrduMode
                ? 'Box ko us cheez par set karein jo aap Pakistan mein dhoondna chahtay hain'
                : 'Adjust the box to frame the exact shoe, dress, or accessory'}
            </p>
          </div>

          <button
            type="button"
            onClick={onChangeImage}
            className="text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] hover:text-[#3730A3] flex items-center gap-1.5 p-2 rounded-lg hover:bg-[#EEF2FF] dark:hover:bg-[#1E1B4B] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isUrduMode ? 'Doosri Tasweer' : 'Change Image'}</span>
          </button>
        </div>

        {/* Crop Canvas Viewport */}
        <div className="relative flex-1 bg-[#0F172A] flex items-center justify-center p-4 overflow-hidden min-h-[300px] select-none">
          <div className="relative max-h-[50vh] max-w-full flex items-center justify-center">
            <img
              src={imageSrc}
              alt="Screenshot Preview"
              className="max-h-[48vh] max-w-full object-contain rounded-lg transition-transform duration-150"
              style={{ transform: `scale(${zoomLevel})` }}
            />

            {/* Simulated Interactive Crop Box Overlay */}
            <div
              className="absolute border-2 border-[#F97316] bg-[#F97316]/10 rounded-lg shadow-2xl pointer-events-none"
              style={{
                top: `${cropBox.y}%`,
                left: `${cropBox.x}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
            >
              {/* Corner Handles */}
              <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-[#F97316] rounded-full border-2 border-white shadow-xs" />
              <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#F97316] rounded-full border-2 border-white shadow-xs" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-[#F97316] rounded-full border-2 border-white shadow-xs" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#F97316] rounded-full border-2 border-white shadow-xs" />

              {/* Rule of Thirds Hairlines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-[#F97316]/60" />
                <div className="border-r border-b border-[#F97316]/60" />
                <div className="border-b border-[#F97316]/60" />
                <div className="border-r border-b border-[#F97316]/60" />
                <div className="border-r border-b border-[#F97316]/60" />
                <div className="border-b border-[#F97316]/60" />
              </div>

              {/* Center Target Indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                {isUrduMode ? 'Yahan Focus Hai' : 'Item Focused'}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Aspect presets and Zoom */}
        <div className="p-3 bg-slate-50 dark:bg-[#1E293B] border-t border-slate-200 dark:border-[#283548] flex items-center justify-between gap-2 flex-wrap">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Ratio:
            </span>
            {(['free', '1:1', '4:3', '3:4'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => handleRatioChange(ratio)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  aspectPreset === ratio
                    ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                    : 'bg-white dark:bg-[#131B2E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#283548] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {ratio === 'free' ? 'Auto' : ratio}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
              className="p-1.5 rounded-lg bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#283548] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-12 text-center tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
              className="p-1.5 rounded-lg bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#283548] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-[#1E293B] flex items-center justify-end gap-3 bg-white dark:bg-[#131B2E]">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSearch}
            leftIcon={<Sparkles className="w-4 h-4 text-[#F97316]" />}
          >
            {isUrduMode ? 'Talash Shuru Karein' : 'Search Similar Products'}
          </Button>
        </div>
      </div>
    </div>
  );
};
