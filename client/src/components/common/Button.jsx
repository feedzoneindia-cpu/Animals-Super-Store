import { cn } from '../../utils/cn.js';
import Spinner from './Spinner.jsx';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60';

const VARIANTS = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 hover:shadow-md focus-visible:ring-brand-700',
  gradient: 'surface-brand text-white shadow-md hover:shadow-lg hover:brightness-110 focus-visible:ring-brand-700',
  secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100 focus-visible:ring-brand-700',
  outline: 'border border-gray-200 bg-white text-gray-700 shadow-xs hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-brand-700',
  ghost: 'text-gray-700 hover:bg-gray-100 focus-visible:ring-brand-700',
  gold: 'bg-accent-500 text-brand-900 shadow-sm hover:bg-accent-400 hover:shadow-md focus-visible:ring-accent-500',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md focus-visible:ring-red-600',
};

const SIZES = {
  sm: 'min-h-9 px-3.5 py-1.5 text-sm',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
};

/** Shared button styles, also usable on Link components rendered as buttons. */
export function buttonStyles({ variant = 'primary', size = 'md' } = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size]);
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
