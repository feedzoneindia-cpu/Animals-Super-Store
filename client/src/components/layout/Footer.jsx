
import { Link } from 'react-router-dom';
import { STORE_CONTACT } from '../../constants/contact.js';
import Logo from '../common/Logo.jsx';

export default function Footer() {
  const sections = [
    {
      title: 'Shop & Categories',
      links: [
        { label: 'All Products / Shop', to: '/shop' },
        { label: 'Pet Supplies', to: '/pet-supplies' },
        { label: 'Animals / Rehoming', to: '/shop?category=Animals' },
        { label: 'View Cart', to: '/cart' },
      ],
    },
    {
      title: 'Company & Visit',
      links: [
        { label: 'About Us', to: '/about' },
        { label: 'Location / Visit Us', to: '/location' },
        { label: 'Contact Us', to: '/contact' },
        { label: 'Blog & Animals Guides', to: '/blog' },
      ],
    },
    {
      title: 'Customer Policies',
      links: [
        { label: 'Shipping & Delivery Policy', to: '/shipping-policy' },
        { label: 'Return / Refund Policy', to: '/return-policy' },
        { label: 'Privacy Policy', to: '/privacy-policy' },
        { label: 'Terms & Conditions', to: '/terms' },
        { label: 'FAQ', to: '/faq' },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-[#e9dfcf] bg-[#fffdf8] text-gray-700">
      {/* Decorative top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-700/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        {/* Main footer */}
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr_1.4fr] lg:gap-10">
          {/* Store information */}
          <div className="min-w-0">
            <div className="inline-flex items-center">
              <Logo />
            </div>

            <p className="mt-5 max-w-xs text-sm leading-7 text-gray-600">
              {STORE_CONTACT.tagline}. High-quality feeds, accessories,
              equipment, and trusted Animals rehoming.
            </p>

            <address className="mt-5 space-y-2 text-sm not-italic text-gray-500">
              <a href={STORE_CONTACT.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2">
                <span aria-hidden="true">📍</span>
                <span>
                    {STORE_CONTACT.address.line1},{' '}
                    {STORE_CONTACT.address.city},{' '}
                  {STORE_CONTACT.address.state},{' '}
                    {STORE_CONTACT.address.country},{' '}
                    {STORE_CONTACT.address.postalCode}
                </span>
              </a>

              {STORE_CONTACT.phones.map((phone) => (
                <p key={phone.tel} className="flex items-center gap-2">
                  <span aria-hidden="true">📞</span>
                  <a
                    href={`tel:${phone.tel}`}
                    className="transition-colors duration-200 hover:text-emerald-800"
                  >
                    {phone.display}
                  </a>
                </p>
              ))}

              <p className="flex items-start gap-2">
                <span aria-hidden="true">✉️</span>
                <a
                  href={`mailto:${STORE_CONTACT.email}`}
                  className="break-all transition-colors duration-200 hover:text-emerald-800"
                >
                  {STORE_CONTACT.email}
                </a>
              </p>
            </address>
          </div>

          {/* Navigation sections */}
          {sections.map((section) => (
            <nav
              key={section.title}
              aria-label={section.title}
              className="min-w-0"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                {section.title}
              </h3>

              <ul className="mt-5 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="inline-block text-sm leading-6 text-gray-600 transition-all duration-200 hover:translate-x-1 hover:text-emerald-800"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Copyright and quick links */}
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-[#e9dfcf] pt-6 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-gray-500">
            &copy; {new Date().getFullYear()}{' '}
            {STORE_CONTACT.businessName}. All rights reserved.
          </p>

          <nav aria-label="Quick links">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {[
                { label: 'Shipping', to: '/shipping-policy' },
                { label: 'Returns', to: '/return-policy' },
                { label: 'Privacy', to: '/privacy-policy' },
                { label: 'Terms', to: '/terms' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-xs text-gray-500 transition-colors duration-200 hover:text-emerald-800"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
