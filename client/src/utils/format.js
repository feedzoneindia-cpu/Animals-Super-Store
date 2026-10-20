const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹ formatting with Indian digit grouping, e.g. ₹1,65,000 */
export function formatPrice(value) {
  return inrFormatter.format(Number(value ?? 0));
}

/** Relative "posted" date with an absolute fallback for older items. */
export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Full absolute date, e.g. 8 Sep 2026. */
export function formatFullDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Animals age, stored as whole months, rendered the way people say it:
 * 4 → "4 months", 12 → "1 year", 36 → "3 years", 18 → "1 year 6 months".
 */
export function formatAge(ageMonths) {
  const months = Number(ageMonths);
  if (!Number.isFinite(months) || months < 0) return '';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearLabel = `${years} year${years === 1 ? '' : 's'}`;
  return rest === 0 ? yearLabel : `${yearLabel} ${rest} month${rest === 1 ? '' : 's'}`;
}

/** Estimated reading time (minutes) for rich text HTML content. */
export function readingTime(html) {
  const words = String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
