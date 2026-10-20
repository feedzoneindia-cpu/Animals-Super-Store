import { STORE_CONTACT } from '../../constants/contact.js';
import useSEO from '../../hooks/useSEO.js';

export default function PrivacyPolicy() {
  useSEO({
    title: 'Privacy Policy',
    description:
      'Learn how Animals Super Store protects and handles your personal information, contact data, and browsing privacy.',
  });

  return (
    <div className="bg-white py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: September 2026</p>

        <div className="prose prose-gray mt-8 max-w-none space-y-6 text-sm leading-7 text-gray-600">
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Information We Collect</h2>
            <p>
              When you use Animals Super Store, we collect information necessary to fulfill orders and provide services:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Contact Information:</strong> Name, email address, phone number, and physical delivery address provided during checkout or account registration.</li>
              <li><strong>Order Records:</strong> Items ordered, fulfillment methods, and communication regarding inquiries.</li>
              <li><strong>Session Data:</strong> Essential httpOnly session cookies used to authenticate accounts securely without storing passwords in browser storage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">2. How We Use Your Information</h2>
            <p>Your details are used strictly for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Processing, verifying, and delivering orders.</li>
              <li>Providing customer support and order status updates.</li>
              <li>Maintaining system security, preventing unauthorized access, and moderating listing inquiries.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">3. Data Sharing & Security</h2>
            <p>
              We do not sell, rent, or trade your personal contact details to third-party advertisers. Information is only shared with logistics couriers for delivery purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Contact Regarding Privacy</h2>
            <p>
              For questions concerning your data or to request account deletion, please contact us at <a href={`mailto:${STORE_CONTACT.email}`} className="text-brand-700 underline">{STORE_CONTACT.email}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
