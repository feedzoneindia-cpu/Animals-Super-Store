/**
 * Primary navigation structure matching client specification:
 * 1. Home
 * 2. Shop
 * 3. Pet Supplies
 * 4. Blog
 * 5. About Us
 * 6. Contact Us
 * 7. Cart
 *
 * Deliberately no "My Account" entry — the public nav carries browsing
 * destinations only. Signed-in customers reach their account through the
 * account chip in the header's right-hand utilities, and /profile itself is
 * still routed unchanged.
 *
 * `section` maps an item to a same-page section on the homepage so the navbar
 * scroll-spy can highlight it while the visitor scrolls. It is display-only —
 * clicking a nav link always navigates to `to`. Cart has none, so it never
 * highlights on the homepage.
 */
export const PUBLIC_NAV = [
  { label: 'Home', to: '/', section: 'home', end: true },
  { label: 'Shop', to: '/shop', section: 'shop' },
  { label: 'Pet Supplies', to: '/pet-supplies', section: 'pet-supplies' },
  { label: 'Blog', to: '/blog', section: 'blog' },
  { label: 'About Us', to: '/about', section: 'about' },
  { label: 'Contact Us', to: '/contact', section: 'contact' },
  { label: 'Cart', to: '/cart', isCart: true },
];

/**
 * Admin portal links shown inside the Admin layout.
 */
export const ADMIN_NAV_LINKS = [
  { label: 'Dashboard', to: '/admin', end: true },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Listings', to: '/admin/listings' },
  { label: 'Blogs', to: '/admin/blog' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Reports', to: '/admin/reports' },
];
