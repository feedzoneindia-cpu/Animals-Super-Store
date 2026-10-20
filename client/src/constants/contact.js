/**
 * Configurable business contact information for Animals Super Store.
 * Values can be configured or overridden via Vite environment variables where appropriate.
 */

/** Normalises anything phone-shaped to a `tel:` / `wa.me` friendly +91 number. */
const toE164 = (value) => `+91${String(value).replace(/\D/g, '').slice(-10)}`;

/** Indian mobiles read best grouped 5 + 5, e.g. +91 70808 05140. */
const toDisplay = (value) => {
  const digits = String(value).replace(/\D/g, '').slice(-10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};

/**
 * Every number customers can reach us on, in display order. Raw env values are
 * plain 10-digit mobiles; `display` and `tel` are derived from them so each
 * call site never has to format a number itself.
 */
const phones = [
  import.meta.env.VITE_STORE_PHONE || '7080805140',
  import.meta.env.VITE_STORE_PHONE_ALT || '7233884460',
].map((number) => ({ display: toDisplay(number), tel: toE164(number) }));

/** WhatsApp runs on the primary number. */
const whatsappNumber = import.meta.env.VITE_STORE_WHATSAPP || phones[0].tel;

const address = {
  businessName: 'Animals Super Store',
  line1: 'Preeti Nagar',
  city: 'Lucknow',
  state: 'Uttar Pradesh',
  postalCode: '226021',
  country: 'India',
};

/** One-line address, for map queries and compact display. */
const fullAddress = [address.businessName, address.line1, address.city, address.state, address.country, address.postalCode].join(', ');

export const STORE_CONTACT = {
  businessName: 'Animals Super Store',
  tagline: 'Your Complete Destination for Pets, Livestock, Feed & Supplies',
  phones,
  whatsapp: whatsappNumber,
  whatsappDisplay: toDisplay(whatsappNumber),
  email: import.meta.env.VITE_STORE_EMAIL || 'mofeeda215@gmail.com',
  address,
  fullAddress,
  hours: [
    { days: 'Monday – Saturday', time: '9:00 AM – 8:30 PM' },
    { days: 'Sunday', time: '10:00 AM – 6:00 PM' },
  ],
  supportHours: 'Available Mon–Sat from 9:00 AM to 8:00 PM IST',
  googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`,
};
