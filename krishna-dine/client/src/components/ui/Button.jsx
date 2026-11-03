import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-900 text-cream-50 hover:bg-brand-800 active:bg-brand-950 shadow-sm',
  secondary: 'bg-white text-brand-900 border border-cream-300 hover:bg-cream-100 hover:border-cream-400',
  ghost: 'text-brand-800 hover:bg-brand-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  'danger-ghost': 'text-red-600 hover:bg-red-50',
  gold: 'bg-gold-400 text-brand-950 hover:bg-gold-500 shadow-sm',
  success: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
};

const SIZES = {
  xs: 'h-8 px-2.5 text-xs rounded-lg gap-1',
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-2xl gap-2',
  xl: 'h-14 px-6 text-lg rounded-2xl gap-2.5',
  icon: 'h-10 w-10 rounded-xl',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className = '', children, icon: Icon, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className={size === 'xl' ? 'h-5 w-5' : 'h-4 w-4'} /> : null}
      {children}
    </button>
  );
});

export default Button;
