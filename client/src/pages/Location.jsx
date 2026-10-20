import { STORE_CONTACT } from '../constants/contact.js';
import useSEO from '../hooks/useSEO.js';

export default function Location() {
  useSEO({
    title: 'Visit Us & Location',
    description:
      `Find our physical retail store at ${STORE_CONTACT.address.line1}, ${STORE_CONTACT.address.city}. View opening hours, directions, and visit information.`,
  });

  // Clean, secret-free map embed using OpenStreetMap / secure search embed
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    STORE_CONTACT.fullAddress
  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            Physical Retail & Distribution Store
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Location & Visit Us
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            Visit our brick-and-mortar store to inspect feed varieties, check equipment sizing, pick up online orders, or consult with our knowledgeable staff.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Store Info & Guidance */}
          <div className="space-y-6 lg:col-span-1">
            {/* Address Card */}
            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Store Address</h2>
              <address className="mt-3 not-italic text-sm leading-6 text-gray-600">
                <strong className="text-gray-900">{STORE_CONTACT.businessName}</strong><br />
                {STORE_CONTACT.address.line1}<br />
                {STORE_CONTACT.address.city}, {STORE_CONTACT.address.state} — {STORE_CONTACT.address.postalCode}<br />
                {STORE_CONTACT.address.country}
              </address>
              <div className="mt-4 flex flex-col gap-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  📞 Phone:{' '}
                  {STORE_CONTACT.phones.map((phone, index) => (
                    <span key={phone.tel}>
                      {index > 0 && ' · '}
                      <a href={`tel:${phone.tel}`} className="font-semibold text-gray-800 hover:text-brand-700">
                        {phone.display}
                      </a>
                    </span>
                  ))}
                </p>
                <p className="text-xs text-gray-500">✉️ Email: <a href={`mailto:${STORE_CONTACT.email}`} className="font-semibold text-gray-800 hover:text-brand-700">{STORE_CONTACT.email}</a></p>
              </div>
              <div className="mt-5">
                <a
                  href={STORE_CONTACT.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
                >
                  Open in Google Maps ↗
                </a>
              </div>
            </div>

            {/* Hours Card */}
            <div className="rounded-2xl border border-gray-200 bg-brand-50/50 p-6">
              <h2 className="text-lg font-bold text-brand-900">Store Visiting Hours</h2>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                {STORE_CONTACT.hours.map((h) => (
                  <li key={h.days} className="flex justify-between border-b border-brand-100 pb-2">
                    <span className="font-medium text-gray-900">{h.days}</span>
                    <span className="font-semibold text-brand-800">{h.time}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                * Note: In-store order pickups are accepted until 30 minutes before closing time.
              </p>
            </div>

            {/* Visit Guidelines */}
            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Visitor Information</h2>
              <ul className="mt-3 space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-brand-700 font-bold">🅿️</span>
                  <span><strong>Dedicated Customer Parking:</strong> Ample parking spaces available directly in front of the retail showroom.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-700 font-bold">🚚</span>
                  <span><strong>Bulk Feed Loading Dock:</strong> For 20kg+ bags and wholesale orders, our rear loading bay offers convenient vehicle loading.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-700 font-bold">🐕</span>
                  <span><strong>Pet-Friendly Facility:</strong> Well-behaved, leashed pets are welcome for collar and harness fittings.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Interactive Map Embed */}
          <div className="lg:col-span-2">
            <div className="h-full min-h-[420px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-gray-100">
              <iframe
                title="Animals Super Store Location Map"
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ minHeight: '520px', border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
