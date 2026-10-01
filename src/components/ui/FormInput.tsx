import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  type = 'text',
  id,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className="text-xs font-semibold text-[#0C0C0C] dark:text-[#F5F5F5] flex items-center justify-between"
      >
        <span>{label}</span>
      </label>

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          type={inputType}
          className={`w-full h-11 rounded-xl border bg-white dark:bg-[#0C0C0C] text-sm text-[#0C0C0C] dark:text-[#F5F5F5] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-150 focus:outline-none focus:ring-2 min-h-[44px] ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${isPassword ? 'pr-11' : 'pr-3.5'} ${
            error
              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20'
              : 'border-[#D8D8D2] dark:border-[#333333] focus:border-[#0C0C0C] dark:focus:border-[#B9C006] focus:ring-[#0C0C0C]/20 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {hint && !error && (
        <span className="text-[11px] text-[#5F5F60] dark:text-[#9C9C9D]">{hint}</span>
      )}

      {error && (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#DC2626]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
