import { Link } from 'react-router-dom';
import { buttonStyles } from './Button.jsx';

/** Empty state used wherever a collection has no results yet. */
export default function EmptyState({ icon = true, title, message, action }) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-white px-6 py-16 text-center shadow-xs">
      {icon && (
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        </span>
      )}
      <h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>
      {message && <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Standard action link for empty states. */
export function EmptyStateAction({ to, children }) {
  return (
    <Link to={to} className={buttonStyles({ variant: 'primary', size: 'sm' })}>
      {children}
    </Link>
  );
}
