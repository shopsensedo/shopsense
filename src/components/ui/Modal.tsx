import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  isBottomSheetOnMobile?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  isBottomSheetOnMobile = true,
}) => {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200">
      {/* Backdrop click dismiss */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Card */}
      <div
        className={`relative w-full bg-white dark:bg-[#1A1A1A] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] ${maxWidthClasses[maxWidth]} ${
          isBottomSheetOnMobile
            ? 'rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-[#262626] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200'
            : 'rounded-2xl border border-slate-200 dark:border-[#262626] animate-in zoom-in-95 duration-200'
        }`}
      >
        {/* Mobile Drag Handle */}
        {isBottomSheetOnMobile && (
          <div className="sm:hidden pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>
        )}

        {/* Modal Header */}
        {(title || subtitle) && (
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[#262626] flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-bold text-[#0C0C0C] dark:text-[#F5F5F5] font-heading">{title}</h3>}
              {subtitle && <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D] mt-0.5">{subtitle}</p>}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#262626] text-slate-400 hover:text-[#0C0C0C] dark:hover:text-white flex items-center justify-center transition-colors min-h-[36px] min-w-[36px] cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
