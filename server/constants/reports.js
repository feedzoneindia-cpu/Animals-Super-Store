/** Fixed V1 report business rules — single source of truth for the backend. */
export const REPORT_REASONS = [
  'Spam',
  'Fake listing',
  'Incorrect information',
  'Inappropriate content',
  'Animals welfare concern',
  'Scam',
  'Other',
];

export const REPORT_STATUSES = ['open', 'reviewed', 'resolved', 'dismissed'];

export const REPORT_DEFAULT_STATUS = 'open';

/** Max length for a report's optional description. */
export const MAX_REPORT_DESCRIPTION_LENGTH = 1000;
