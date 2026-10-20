/** Builders for schema.org JSON-LD used by useSEO({ jsonLd }). */
const origin = () => (typeof window === 'undefined' ? '' : window.location.origin);
const SITE_NAME = 'Animals Super Store';

const stripHtml = (html = '') => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${origin()}${item.path}`,
    })),
  };
}

/** Live Animals are enquiry-only, so they get a Product without a purchasable Offer claim of stock. */
export function productSchema(listing, { isAnimals }) {
  const images = (listing.images ?? []).map((img) => img.url).filter(Boolean);
  const inStock = isAnimals ? listing.status !== 'sold' : (listing.stockQuantity ?? 1) > 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: stripHtml(listing.description).slice(0, 500),
    image: images,
    category: listing.category,
    ...(listing.breed ? { brand: { '@type': 'Brand', name: listing.breed } } : {}),
    offers: {
      '@type': 'Offer',
      url: `${origin()}/listings/${listing.slug}`,
      priceCurrency: 'INR',
      price: listing.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

export function articleSchema(blog) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.excerpt,
    image: blog.coverImage?.url ? [blog.coverImage.url] : undefined,
    datePublished: blog.publishedAt || blog.createdAt,
    dateModified: blog.updatedAt || blog.publishedAt || blog.createdAt,
    mainEntityOfPage: `${origin()}/blog/${blog.slug}`,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${origin()}/icon-512.png` },
    },
  };
}

export function faqSchema(faqData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.flatMap((group) =>
      group.questions.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      }))
    ),
  };
}
