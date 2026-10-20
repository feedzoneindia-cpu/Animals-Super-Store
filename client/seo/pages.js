/**
 * Static SEO data used at BUILD time by seo/siteSeoPlugin.js.
 *
 * Titles/descriptions mirror the useSEO() calls inside each page component.
 * If you change a page's title or description in src/pages/*, change it here
 * too — this copy is what search engines and link-preview bots (WhatsApp,
 * Facebook, LinkedIn) read, because they do not run the React app.
 */

export const SITE_NAME = 'Animals Super Store';
export const DEFAULT_TITLE = `${SITE_NAME} — Everything for Goats. One Place.`;
export const DEFAULT_DESCRIPTION =
  'Discover goat-related products, nutritious feed, accessories, farming equipment and practical goat-farming guides — all in one place at Animals Super Store.';

/** Links rendered into every prerendered page so crawlers always have a path to the key sections. */
export const SITE_NAV = [
  ['/shop', 'Shop'],
  ['/pet-supplies', 'Pet Supplies'],
  ['/blog', 'Blog'],
  ['/about', 'About Us'],
  ['/contact', 'Contact'],
  ['/location', 'Visit Us'],
  ['/faq', 'FAQ'],
];

export const STATIC_PAGES = [
  {
    path: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    h1: 'Everything for Goats. One Place.',
    intro:
      'Goat feed, supplements, accessories, farming equipment and practical goat-farming guides, with local pickup and delivery from Lucknow.',
    showProducts: true,
    showBlogs: true,
    schema: 'store',
  },
  {
    path: '/shop',
    title: 'Shop Products & Supplies',
    description:
      'Browse and buy quality Animals food, pet accessories, Animals equipment, and view Animals listings across categories.',
    h1: 'Shop Products & Supplies',
    intro: 'Browse feed, accessories, equipment and more from Animals Super Store.',
    showProducts: true,
  },
  {
    path: '/pet-supplies',
    title: 'Pet Supplies & Equipment',
    description:
      'Browse collars, leashes, feeding bowls, cages, tanks, grooming items, and practical Animals-care equipment.',
    h1: 'Pet Supplies & Equipment',
    intro: 'Collars, leashes, feeding bowls, cages, tanks, grooming items and Animals-care equipment.',
  },
  {
    path: '/about',
    title: 'About Us',
    description:
      'Learn about Animal Super Store — our commitment to quality animal feed, verified pet accessories, durable equipment, and ethical animal care.',
    h1: 'About Animals Super Store',
    intro: 'Quality animal feed, verified pet accessories, durable equipment and ethical animal care.',
  },
  {
    path: '/contact',
    title: 'Contact Us',
    description:
      'Get in touch with Animals Super Store for inquiries about Animals feed, pet supplies, orders, and livestock rehoming.',
    h1: 'Contact Us',
    intro: 'Call, WhatsApp or email us about feed, pet supplies, orders and livestock rehoming.',
    schema: 'store',
  },
  {
    path: '/location',
    title: 'Visit Us & Location',
    description: null, // built from the store address in the plugin
    h1: 'Visit Our Store',
    intro: 'Find our retail store, opening hours and directions.',
    schema: 'store',
  },
  {
    path: '/blog',
    title: 'Blog',
    description: 'Animals-focused guides, care tips, and stories from the Animals Super Store community.',
    h1: 'Blog & Guides',
    intro: 'Animals-focused guides, care tips and stories from the Animals Super Store community.',
    showBlogs: true,
  },
  {
    path: '/faq',
    title: 'Frequently Asked Questions',
    description:
      'Find answers to common questions about Animals feeds, pet supplies, order delivery, live Animals listings, and account management.',
    h1: 'Frequently Asked Questions',
    intro: 'Answers about feed, pet supplies, delivery, live Animals listings and your account.',
  },
  {
    path: '/shipping-policy',
    title: 'Shipping & Delivery Policy',
    description:
      'Information on order processing, standard delivery timelines, shipping rates, and packaging for Animals feeds and supplies.',
    h1: 'Shipping & Delivery Policy',
    intro: 'Order processing, delivery timelines, shipping rates and packaging.',
  },
  {
    path: '/return-policy',
    title: 'Return & Refund Policy',
    description:
      'Review the return guidelines, eligibility criteria, and refund process for physical items purchased on Animals Super Store.',
    h1: 'Return & Refund Policy',
    intro: 'Return guidelines, eligibility criteria and the refund process.',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy',
    description:
      'Learn how Animals Super Store protects and handles your personal information, contact data, and browsing privacy.',
    h1: 'Privacy Policy',
    intro: 'How we protect and handle your personal information.',
  },
  {
    path: '/terms',
    title: 'Terms & Conditions',
    description:
      'Terms of service and user agreements governing the use of the Animals Super Store marketplace, listings, and purchases.',
    h1: 'Terms & Conditions',
    intro: 'The terms governing use of the Animals Super Store marketplace.',
  },
];

/**
 * Store details for LocalBusiness (PetStore) JSON-LD. Mirrors
 * src/constants/contact.js and honours the same VITE_STORE_* variables.
 * Keep the address and opening hours in sync with that file.
 */
export function buildStore(env = {}) {
  const digits = (v) => String(v).replace(/\D/g, '').slice(-10);
  const tel = (v) => `+91${digits(v)}`;
  return {
    name: SITE_NAME,
    phones: [env.VITE_STORE_PHONE || '7080805140', env.VITE_STORE_PHONE_ALT || '7233884460'].map(tel),
    email: env.VITE_STORE_EMAIL || 'mofeeda215@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Preeti Nagar',
      addressLocality: 'Lucknow',
      addressRegion: 'Uttar Pradesh',
      postalCode: '226021',
      addressCountry: 'IN',
    },
    openingHours: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '20:30' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '10:00', closes: '18:00' },
    ],
  };
}
