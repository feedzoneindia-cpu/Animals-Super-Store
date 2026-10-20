import { useState } from 'react';
import { cn } from '../../utils/cn.js';

const INPUT_BASE =
  'mt-1 block w-full min-h-11 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-xs transition-all duration-200 hover:border-gray-300 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-700/10 disabled:cursor-not-allowed disabled:bg-gray-50';

/**
 * Accessible labeled input with error and hint text wired up via
 * aria-invalid / aria-describedby.
 */
export default function FormInput({ label, id, error, hint, className, type, icon, ...props }) {
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  const input = (
    <input
      id={id}
      type={isPassword && visible ? 'text' : type}
      className={cn(
        INPUT_BASE,
        isPassword && '!mt-0 pr-11',
        icon && '!pl-10 !mt-0',
        error && 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
      )}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      {...props}
    />
  );

  // Optional leading icon, rendered inside the field's left edge.
  const withIcon = (field) =>
    icon ? (
      <div className="relative mt-1">
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center text-gray-500" aria-hidden="true">
          {icon}
        </span>
        {field}
      </div>
    ) : (
      field
    );

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
        {label}
        {props.required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
      </label>
      {isPassword ? (
        <div className="relative mt-1">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center text-gray-500" aria-hidden="true">
              {icon}
            </span>
          )}
          {input}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-500 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        withIcon(input)
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Non-submitting banner for form-level errors (e.g. invalid credentials). */
export function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
