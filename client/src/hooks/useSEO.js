import { useEffect } from 'react';

const SITE_NAME = 'Animals Super Store';

function upsertMeta(attribute, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/**
 * Per-page SEO: document title plus description / Open Graph / Twitter tags.
 * Client-rendered, so this covers browser history, bookmarks, and crawlers
 * that execute JavaScript — the index.html defaults serve as the fallback.
 */
function upsertCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function setRobots(noindex) {
  let tag = document.head.querySelector('meta[name="robots"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'robots');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
}

const JSON_LD_ATTR = 'data-seo-jsonld';

/**
 * Per-page SEO. Options:
 *  - noindex: keep private/transactional pages out of search results
 *  - jsonLd:  a schema.org object (or array of them) rendered as JSON-LD
 */
export default function useSEO({ title, description, image, type = 'website', noindex = false, jsonLd }) {
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    setRobots(noindex);
    return () => setRobots(false);
  }, [noindex]);

  useEffect(() => {
    if (!jsonLdString) return undefined;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(JSON_LD_ATTR, '');
    // Escape "<" so content can never close the script tag.
    script.textContent = jsonLdString.replace(/</g, '\\u003c');
    document.head.appendChild(script);
    return () => script.remove();
  }, [jsonLdString]);

  useEffect(() => {
    const origin = window.location.origin;
    // Root keeps its "/" so it matches the prerendered pages; other paths drop a trailing slash.
    const canonical = origin + window.location.pathname.replace(/(.)\/$/, '$1');
    upsertCanonical(canonical);
    upsertMeta('property', 'og:url', canonical);
    const ogImage = image || `${origin}/icon-512.png`;
    // The brand suffix is appended here, so page titles should carry only the
    // page-specific part. The `includes` check keeps a title that already
    // names the site from rendering the brand twice.
    const fullTitle = !title
      ? `${SITE_NAME} — Everything for Goats. One Place.`
      : title.includes(SITE_NAME)
        ? title
        : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;

    if (description) upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'en_IN');
    if (description) upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    if (description) upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', ogImage);
  }, [title, description, image, type]);
}
