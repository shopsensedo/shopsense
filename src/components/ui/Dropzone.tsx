import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Camera, Image as ImageIcon, Clipboard, AlertCircle } from 'lucide-react';
import { SAMPLE_POPULAR_SEARCHES } from '../../lib/mockData';

interface DropzoneProps {
  onImageSelected: (imageDataUrl: string, sourceName?: string) => void;
  isUrduMode?: boolean;
  className?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onImageSelected,
  isUrduMode = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMessage(null);
    if (!file.type.startsWith('image/')) {
      setErrorMessage(
        isUrduMode
          ? 'Ghalat file: Sirf tasweer (JPG, PNG, WEBP) upload karein.'
          : 'Invalid file format: Please upload an image file (JPG, PNG, WEBP).'
      );
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage(
        isUrduMode
          ? 'Tasweer bohat bari hai (hadd 15MB).'
          : 'Image file is too large (max 15MB).'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageSelected(e.target.result as string, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Clipboard paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group border-2 border-dashed rounded-[24px] p-6 md:p-8 text-center transition-all duration-200 cursor-pointer bg-white dark:bg-[#1A1A1A] ${
          isDragging
            ? 'border-[#0C0C0C] bg-[#F2F4D6]/60 dark:bg-[#2B2F0C]/60 scale-[1.01]'
            : 'border-slate-300 dark:border-[#333333] hover:border-[#0C0C0C] dark:hover:border-[#B9C006] hover:bg-slate-50/60 dark:hover:bg-[#262626]/60 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processFile(e.target.files[0]);
            }
          }}
        />

        {/* Center Upload Graphic */}
        <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#F2F4D6] dark:bg-[#2B2F0C] text-[#0C0C0C] dark:text-[#B9C006] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
          <UploadCloud className="w-8 h-8 md:w-10 md:h-10 text-[#0C0C0C] dark:text-[#B9C006]" />
        </div>

        {/* Primary Action Heading */}
        <h3 className="text-base md:text-lg font-bold text-[#0C0C0C] dark:text-[#F5F5F5] mb-1 font-heading">
          {isUrduMode
            ? 'Screenshot ya Tasweer yahan Dalein'
            : 'Upload a screenshot, find the lowest price'}
        </h3>

        {/* Descriptive Guidance */}
        <p className="text-xs md:text-sm text-[#5F5F60] dark:text-[#9C9C9D] max-w-md mx-auto mb-4">
          {isUrduMode
            ? 'Instagram ya TikTok se screenshot drag karein, gallery se chunein ya Ctrl+V se paste karein.'
            : 'Drag & drop an image, click to browse gallery, or paste directly from clipboard (Ctrl+V).'}
        </p>

        {/* Action Button Pills */}
        <div className="inline-flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-[#262626] rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-[#1A1A1A] rounded-full shadow-2xs text-[#0C0C0C] dark:text-[#B9C006]">
            <Camera className="w-3.5 h-3.5 text-[#B9C006]" />
            {isUrduMode ? 'Tasweer Chunein' : 'Select Photo'}
          </span>
          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-slate-500 dark:text-slate-400">
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste / Drop</span>
          </span>
        </div>

        {errorMessage && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] dark:bg-[#450A0A] px-3 py-1.5 rounded-lg border border-[#FCA5A5] dark:border-[#7F1D1D]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Quick Test Samples */}
      <div className="mt-4">
        <div className="text-xs font-medium text-[#5F5F60] dark:text-[#9C9C9D] mb-2 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#0C0C0C] dark:text-[#B9C006]" />
          <span>
            {isUrduMode
              ? 'Mashhoor screenshots se test karein:'
              : 'Or test instantly with sample screenshots:'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SAMPLE_POPULAR_SEARCHES.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onImageSelected(item.image, item.label)}
              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333333] hover:border-[#0C0C0C] dark:hover:border-[#B9C006] hover:bg-[#F2F4D6]/40 dark:hover:bg-[#2B2F0C]/40 text-left transition-all duration-150 cursor-pointer group shadow-2xs"
            >
              <img
                src={item.image}
                alt={item.label}
                className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#0C0C0C] dark:text-[#F5F5F5] truncate group-hover:text-[#0C0C0C] dark:group-hover:text-[#B9C006]">
                  {isUrduMode ? item.labelUrdu : item.label}
                </p>
                <span className="text-[10px] text-[#5F5F60] dark:text-[#9C9C9D] block truncate">
                  {item.category}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
