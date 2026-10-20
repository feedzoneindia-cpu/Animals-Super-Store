import { STORE_CONTACT } from '../../constants/contact.js';
import useSEO from '../../hooks/useSEO.js';

export default function ReturnPolicy() {
  useSEO({
    title: 'Return & Refund Policy',
    description:
      'Review the return guidelines, eligibility criteria, and refund process for physical items purchased on Animals Super Store.',
  });

  return (
    <div className="bg-white py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Return & Refund Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: September 2026</p>

        <div className="prose prose-gray mt-8 max-w-none space-y-6 text-sm leading-7 text-gray-600">
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Eligibility for Returns</h2>
            <p>
              We want you and your Animals to be completely satisfied with every item. Returns or replacement requests may be initiated for physical items (such as accessories, cages, harness gear, or unopened feed bags) under the following conditions:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The item was received damaged, defective, or incorrect relative to the confirmed order.</li>
              <li>The item remains in its original, unopened, and unused condition with manufacturer tags and seals intact.</li>
              <li>The claim is submitted within 7 calendar days of delivery.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Non-Returnable Items</h2>
            <p>For hygiene, biosecurity, and health preservation, certain items cannot be accepted for return:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Opened bags of Animals feed, treats, or nutritional supplements.</li>
              <li>Grooming tools, brushes, or hygiene products that have been used on an Animals.</li>
              <li>Live Animals: Adoptions and live Animals agreements are conducted directly between caretakers and are not treated as merchandise.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">3. Return Process</h2>
            <p>
              To report a damaged or incorrect package, contact our support team at <a href={`mailto:${STORE_CONTACT.email}`} className="text-brand-700 underline">{STORE_CONTACT.email}</a> or via WhatsApp at <span className="font-semibold text-gray-900">{STORE_CONTACT.whatsappDisplay}</span>. Please include your order number along with clear photographs of the package and item condition.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Refund & Replacement Resolution</h2>
            <p>
              Upon verification of eligible return claims, we will arrange either a replacement shipment or a refund processed via the original payment method or direct store adjustment.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
