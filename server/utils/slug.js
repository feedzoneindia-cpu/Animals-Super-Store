/**
 * SEO-friendly slug generation.
 * Slugs are created once and stay stable across title edits, so a title
 * change never produces duplicate or broken URLs.
 */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/**
 * Returns a slug that does not collide with any existing document.
 * Appends a counter, falling back to a short unique suffix for edge cases.
 */
export async function generateUniqueSlug(baseSlug, model) {
  const base = slugify(baseSlug) || 'listing';
  let candidate = base;
  let counter = 1;

  while (await model.exists({ slug: candidate })) {
    counter += 1;
    if (counter > 20) {
      return `${base}-${Date.now().toString(36)}`;
    }
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

/** Escapes user input before it is used inside a RegExp. */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
