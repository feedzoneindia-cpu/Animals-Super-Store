import { cn } from '../../utils/cn.js';

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export default function Spinner({ size = 'md', label = 'Loading', className }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-block', className)}>
      <svg
        className={cn('animate-spin rounded-full border-brand-200 border-t-brand-700', SIZES[size])}
        viewBox="0 0 24 24"
        aria-hidden="true"
      />
    </span>
  );
}
