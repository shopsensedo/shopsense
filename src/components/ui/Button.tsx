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
  // Base classes with touch target >= 44px on mobile — pill shaped, Protech style
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 ' +
    'dark:focus-visible:ring-offset-void active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ' +
    'select-none cursor-pointer whitespace-nowrap';

  const sizeClasses = {
    sm: 'h-9 px-4 text-xs gap-1.5 min-w-[36px]',
    md: 'h-11 px-6 text-sm gap-2 min-h-[44px]', // Mobile friendly min-h 44px
    lg: 'h-13 px-8 text-sm gap-2.5 min-h-[48px]',
    icon: 'h-11 w-11 p-2 text-sm min-h-[44px] min-w-[44px]',
  };

  const variantClasses = {
    // Protech primary: lime pill w/ dark text in dark mode, near-black pill in light mode
    primary:
      'bg-void text-white hover:bg-graphite dark:bg-lime dark:hover:bg-limedeep dark:text-void ' +
      'shadow-[0_8px_24px_-10px_rgba(185,192,6,0.55)]',
    secondary:
      'bg-limetint text-void hover:bg-[#E7EAB8] dark:bg-limedim dark:hover:bg-[#33330A] dark:text-limebright',
    outline:
      'border border-[#D8D8D2] dark:border-ash bg-white dark:bg-carbon text-void dark:text-bone ' +
      'hover:border-void dark:hover:border-lime hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
    text:
      'bg-transparent text-smoke hover:text-void dark:text-fog dark:hover:text-bone ' +
      'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
    danger:
      'bg-[#DC2626] hover:bg-[#B91C1C] dark:bg-[#EF4444] dark:hover:bg-[#DC2626] text-white dark:text-void',
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
