import sanitizeHtml from 'sanitize-html';

/**
 * Whitelist-based sanitizer for rich text content (blog posts).
 * Runs server-side before anything is stored, so unsafe HTML never
 * reaches the database — the client additionally sanitizes at render time.
 */
const OPTIONS = {
  // Everything the blog editor supports — headings, emphasis, links,
  // lists, blockquotes, images, code, tables and figures — and nothing else.
  // Tables/figures/h5/h6 were added for the Animalssss.com blog migration,
  // whose bodies carry breed comparison tables and captioned images that
  // would otherwise be flattened on save.
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'strong', 'em', 'u', 's', 'sub', 'sup', 'small',
    'a', 'ul', 'ol', 'li',
    'blockquote', 'img', 'br', 'hr',
    'code', 'pre', 'span',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'figure', 'figcaption',
    // Collapsible FAQ blocks — the migration's FAQ sections are <details>.
    'details', 'summary',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
    details: ['open'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

export function sanitizeRichText(html) {
  return sanitizeHtml(html ?? '', OPTIONS);
}
