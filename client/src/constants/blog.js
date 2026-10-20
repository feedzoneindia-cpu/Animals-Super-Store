/** Blog statuses — draft, published, archived. Only published is public. */
export const BLOG_STATUSES = ['draft', 'published', 'archived'];

/** Tailwind classes for status badges in the admin panel. */
export const BLOG_STATUS_STYLES = {
  draft: 'bg-amber-50 text-amber-700',
  published: 'bg-brand-50 text-brand-800',
  archived: 'bg-gray-100 text-gray-600',
};

export const DEFAULT_BLOG_PAGE_SIZE = 9;
