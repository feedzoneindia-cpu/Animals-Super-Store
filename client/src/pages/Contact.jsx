import { Link } from 'react-router-dom';
import InquiryForm from '../components/inquiries/InquiryForm.jsx';
import { STORE_CONTACT } from '../constants/contact.js';
import useSEO from '../hooks/useSEO.js';
import { buildWhatsAppUrl } from '../utils/whatsapp.js';

export default function Contact() {
  useSEO({
    title: 'Contact Us',
    description:
      'Get in touch with Animals Super Store for inquiries about Animals feed, pet supplies, orders, and livestock rehoming.',
  });

  const whatsappLink = buildWhatsAppUrl(
    STORE_CONTACT.whatsapp,
    'Hello Animals Super Store, I have an inquiry.'
  );

  return (
    <div className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            Reach Out to Us
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Contact Our Team
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
            Have questions about Animals nutrition, custom feed quantities, order status, or listing partnerships? We are here to help.
          </p>
        </div>

        {/*
          Two columns on desktop: the inquiry form on the left, the existing
          contact information on the right. Stacks to a single column on mobile.
        */}
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* LEFT — Send Us a Message */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900">Send Us a Message</h2>
            <p className="mt-1 text-sm text-gray-600">
              Fill in your information and we will respond as soon as possible.
            </p>
            <div className="mt-6">
              <InquiryForm />
            </div>
          </div>

          {/* RIGHT — the existing contact information, kept in full */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-brand-50/50 p-6">
              <h3 className="text-base font-bold text-brand-900">Customer Helpline</h3>
              <div className="mt-2 space-y-0.5">
                {STORE_CONTACT.phones.map((phone) => (
                  <a
                    key={phone.tel}
                    href={`tel:${phone.tel}`}
                    className="block text-lg font-bold text-brand-800 hover:text-brand-900"
                  >
                    {phone.display}
                  </a>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">Mon–Sat 9:00 AM – 8:00 PM</p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-success-700 hover:text-success-800"
              >
                💬 Chat on WhatsApp →
              </a>
            </div>

            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-gray-900">Email Support</h3>
              <a
                href={`mailto:${STORE_CONTACT.email}`}
                className="mt-2 block break-all text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {STORE_CONTACT.email}
              </a>
              <p className="mt-1 text-xs text-gray-500">Guaranteed response within 24 hours</p>
            </div>

            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-gray-900">Super Store Location</h3>
              <address className="mt-3 not-italic text-sm leading-6 text-gray-600">
                <strong>{STORE_CONTACT.businessName}</strong><br />
                {STORE_CONTACT.address.line1}<br />
                {STORE_CONTACT.address.city}, {STORE_CONTACT.address.state} — {STORE_CONTACT.address.postalCode}<br />
                {STORE_CONTACT.address.country}
              </address>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href={STORE_CONTACT.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  Open in Google Maps ↗
                </a>
                <Link
                  to="/location"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  View Map & Directions →
                </Link>
              </div>
            </div>

            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-gray-900">Operating Hours</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                {STORE_CONTACT.hours.map((h) => (
                  <li key={h.days} className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="font-medium text-gray-900">{h.days}</span>
                    <span className="text-brand-800">{h.time}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-gray-500">
                {STORE_CONTACT.supportHours}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
