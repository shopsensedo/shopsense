import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              icon: <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />,
              border: 'border-[#BBF7D0]',
              bg: 'bg-white',
            },
            warning: {
              icon: <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />,
              border: 'border-[#FDE68A]',
              bg: 'bg-white',
            },
            error: {
              icon: <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
              border: 'border-[#FECACA]',
              bg: 'bg-white',
            },
            info: {
              icon: <Info className="w-5 h-5 text-[#0C0C0C] shrink-0" />,
              border: 'border-[#DDE199]',
              bg: 'bg-white',
            },
          }[toast.type || 'success'];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-lg ${typeConfig.border} ${typeConfig.bg} animate-in slide-in-from-bottom-2 duration-200`}
            >
              <div className="flex items-center gap-2.5">
                {typeConfig.icon}
                <span className="text-xs md:text-sm font-medium text-[#0C0C0C]">
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
