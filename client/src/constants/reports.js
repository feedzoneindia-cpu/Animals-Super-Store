/** Report reasons — mirrors the backend enum exactly. */
export const REPORT_REASONS = [
  'Spam',
  'Fake listing',
  'Incorrect information',
  'Inappropriate content',
  'Animals welfare concern',
  'Scam',
  'Other',
];

/** Report statuses in the admin workflow. */
export const REPORT_STATUSES = ['open', 'reviewed', 'resolved', 'dismissed'];

/** Tailwind classes for report status badges in the admin panel. */
export const REPORT_STATUS_STYLES = {
  open: 'bg-red-50 text-red-700',
  reviewed: 'bg-amber-50 text-amber-700',
  resolved: 'bg-brand-50 text-brand-800',
  dismissed: 'bg-gray-100 text-gray-600',
};

export const MAX_REPORT_DESCRIPTION_LENGTH = 1000;
