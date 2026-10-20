import { STORE_CONTACT } from '../../constants/contact.js';
import useSEO from '../../hooks/useSEO.js';

export default function Terms() {
  useSEO({
    title: 'Terms & Conditions',
    description:
      'Terms of service and user agreements governing the use of the Animals Super Store marketplace, listings, and purchases.',
  });

  return (
    <div className="bg-white py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Terms & Conditions
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: September 2026</p>

        <div className="prose prose-gray mt-8 max-w-none space-y-6 text-sm leading-7 text-gray-600">
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or purchasing items on Animals Super Store, you agree to comply with and be bound by these Terms & Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Marketplace Structure & Admin Catalog Management</h2>
            <p>
              To maintain product authenticity, consistent pricing, and safety for all patrons, listing creation and inventory adjustments are managed exclusively by authorized store administrators. Normal user accounts do not possess listing-creation or inventory privileges.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">3. Physical Products & Ordering</h2>
            <p>
              Product orders (Animals feeds, accessories, and equipment) placed through the cart are subject to product availability and order confirmation. We reserve the right to decline or cancel orders in cases of pricing inaccuracies or unserviceable delivery locations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Live Animalss & Ethical Care Guidelines</h2>
            <p>
              Live Animalss featured in the "Animalss" category are listed for ethical rehoming and direct caretaker inquiry. In compliance with Animals welfare principles:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Live Animalss cannot be purchased via automated carts or shipped via postal freight.</li>
              <li>Interested adopters must communicate directly with the designated caretaker or seller.</li>
              <li>Adopters agree to provide humane shelter, adequate nourishment, and necessary veterinary attention.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">5. Limitation of Liability</h2>
            <p>
              Animals Super Store strives for accurate descriptions, images, and feeding recommendations. We recommend consulting licensed veterinary professionals for specific medical or dietary diagnoses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">6. Contact & Disputes</h2>
            <p>
              For inquiries regarding these Terms, contact our legal and administrative team at <a href={`mailto:${STORE_CONTACT.email}`} className="text-brand-700 underline">{STORE_CONTACT.email}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
