import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes with touch target >= 44px on mobile
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131B2E] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer whitespace-nowrap';

  const sizeClasses = {
    sm: 'h-9 px-3 text-xs gap-1.5 min-w-[36px]',
    md: 'h-11 px-4 text-sm gap-2 min-h-[44px]', // Mobile friendly min-h 44px
    lg: 'h-13 px-6 text-base gap-2.5 min-h-[48px]',
    icon: 'h-11 w-11 p-2 text-sm min-h-[44px] min-w-[44px]',
  };

  const variantClasses = {
    primary:
      'bg-[#4F46E5] hover:bg-[#3730A3] dark:bg-[#6366F1] dark:hover:bg-[#4F46E5] text-white focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#6366F1] shadow-xs',
    secondary:
      'bg-[#EEF2FF] hover:bg-[#E0E7FF] dark:bg-[#1E1B4B] dark:hover:bg-[#2E286E] text-[#4F46E5] dark:text-[#A5B4FC] focus-visible:ring-[#4F46E5]',
    outline:
      'border border-[#CBD5E1] dark:border-[#283548] bg-white dark:bg-[#131B2E] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:border-[#94A3B8] dark:hover:border-slate-500 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#6366F1] shadow-2xs',
    text:
      'bg-transparent text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1E293B] focus-visible:ring-slate-400',
    danger:
      'bg-[#DC2626] hover:bg-[#B91C1C] dark:bg-[#EF4444] dark:hover:bg-[#DC2626] text-white focus-visible:ring-[#DC2626] shadow-xs',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
