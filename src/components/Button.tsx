import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:   'bg-[#00A86B] text-white hover:bg-[#006B47] active:bg-[#006B47] shadow-sm shadow-[#00A86B]/20',
    secondary: 'bg-white text-[#0A1628] border border-[#E5E5E0] hover:border-[#0A1628] active:bg-[#FAFAF7]',
    ghost:     'bg-transparent text-[#475569] hover:bg-[#FAFAF7] hover:text-[#0A1628] active:bg-[#E5E5E0]',
    danger:    'bg-[#DC2626] text-white hover:bg-red-700 active:bg-red-800',
  };

  const sizes = {
    sm: 'h-8  px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}
