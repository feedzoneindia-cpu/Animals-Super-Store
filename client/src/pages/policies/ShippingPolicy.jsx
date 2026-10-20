import { STORE_CONTACT } from '../../constants/contact.js';
import useSEO from '../../hooks/useSEO.js';

export default function ShippingPolicy() {
  useSEO({
    title: 'Shipping & Delivery Policy',
    description:
      'Information on order processing, standard delivery timelines, shipping rates, and packaging for Animals feeds and supplies.',
  });

  return (
    <div className="bg-white py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Shipping & Delivery Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: September 2026</p>

        <div className="prose prose-gray mt-8 max-w-none space-y-6 text-sm leading-7 text-gray-600">
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Scope of Delivery</h2>
            <p>
              This policy applies to all physical goods, including Animals feeds, dietary supplements, pet accessories, and Animals equipment purchased through Animals Super Store.
            </p>
            <p className="rounded-lg bg-brand-50 p-4 font-medium text-brand-900">
              Please note: Live Animals listings are strictly available for direct caretaker inquiry, inspection, and local adoption. Live Animals are not transported or dispatched via automated shipping channels.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Processing & Dispatch Timelines</h2>
            <p>
              Orders for in-stock items are typically processed within 1 to 2 business days following order confirmation. Once dispatched, standard transit times vary depending on the destination region, local logistics partners, and weather conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">3. Shipping Fees & Thresholds</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Free Standard Delivery:</strong> Applicable on eligible product orders with a subtotal of ₹1,000 or greater.</li>
              <li><strong>Standard Delivery Fee:</strong> For orders below ₹1,000, a flat nominal delivery charge of ₹99 is calculated at checkout.</li>
              <li><strong>Store Pickup:</strong> Free of charge. Orders designated for store pickup can be collected during retail hours at our physical location.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Packaging & Quality Protection</h2>
            <p>
              Animals feeds are packed in heavy-duty moisture-resistant outer wraps to safeguard bag integrity and freshness. Fragile accessories (such as ceramic dishes or glass aquarium equipment) are padded with protective cushioning.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">5. Delivery Tracking & Inquiries</h2>
            <p>
              You can check the status of your order through your customer account or by reaching out to our support team at <a href={`mailto:${STORE_CONTACT.email}`} className="text-brand-700 underline">{STORE_CONTACT.email}</a> with your order number.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
