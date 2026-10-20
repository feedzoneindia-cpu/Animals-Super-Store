import { Link } from 'react-router-dom';
import useSEO from '../hooks/useSEO.js';
import { buttonStyles } from '../components/common/Button.jsx';
import { STORE_CONTACT } from '../constants/contact.js';

export default function About() {
  useSEO({
    title: 'About Us',
    description:
      'Learn about Animal Super Store — our commitment to quality animal feed, verified pet accessories, durable equipment, and ethical animal care.',
  });

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white pt-16 sm:pt-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-800">
            About Animals Super Store
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            Empowering Farmers. Nourishing Animals. Building Trust.
          </h1>
          <div className="mx-auto mt-6 max-w-3xl space-y-4 text-base leading-7 text-gray-600 sm:text-lg sm:leading-8">
            <p>
              At Animals Super Store, we believe that healthier animals create a stronger future.
              Our mission is to make quality animal nutrition, livestock feed, healthcare products,
              and essential supplies accessible to every farmer and animal owner.
            </p>
            <p>
              We bring quality, trust, and convenience together under one roof, helping farmers
              make better choices for their animals and supporting a healthier, more productive
              future.
            </p>
          </div>
          <p className="mt-8 text-base font-medium italic text-brand-800 sm:text-lg">
            Because when animals thrive, farmers grow, and communities prosper.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Our Mission
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              We believe that animal nutrition and wellbeing should be straightforward and dependable. From balanced feeds for cattle and poultry to premium care items for domestic pets, every listing on our platform meets high standards of freshness, functionality, and ethical sourcing.
            </p>
            <p className="mt-4 text-base leading-7 text-gray-600">
              Unlike generic e-commerce platforms, Animal Super Store is purpose-built for the animal community. We pair convenient online shopping for feeds and gear with personal, direct communication for live animal adoption and care advice.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/shop" className={buttonStyles({ size: 'md' })}>
                Explore Shop
              </Link>
              <Link to="/contact" className={buttonStyles({ variant: 'outline', size: 'md' })}>
                Contact Our Team
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-brand-50/50 p-8">
            <h3 className="text-lg font-bold text-brand-900">What Sets Us Apart</h3>
            <dl className="mt-6 space-y-6">
              {[
                {
                  title: 'Curated Quality Feeds',
                  desc: 'All feed packs are stored in humidity-controlled conditions and checked for batch freshness before dispatch.',
                },
                {
                  title: 'Ethical Rehoming Standards',
                  desc: 'Live animals are never treated as automated cart items. We facilitate direct, transparent discussions between caretakers and adopters.',
                },
                {
                  title: 'Admin-Verified Catalog',
                  desc: 'Our catalog is actively maintained by store administrators to eliminate spam, outdated prices, or misleading descriptions.',
                },
                {
                  title: 'Dedicated Local Support',
                  desc: 'Need advice on feed quantities or equipment sizing? Our staff is reachable via phone, WhatsApp, and email.',
                },
              ].map((item) => (
                <div key={item.title}>
                  <dt className="text-sm font-semibold text-gray-900">✓ {item.title}</dt>
                  <dd className="mt-1 text-sm text-gray-600">{item.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Our Core Principles
            </h2>
            <p className="mt-3 text-sm text-gray-600">The standards guiding our platform and community interactions.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                🌿
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">Nutrition First</h3>
              <p className="mt-2 text-sm text-gray-600">
                Healthy growth, lactation, digestion, and coat vitality require balanced nutrition. We prioritize nutritious, tested formulations.
              </p>
            </div>
            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                🤝
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">Community Trust</h3>
              <p className="mt-2 text-sm text-gray-600">
                Clear pricing, transparent product descriptions, and honest direct communication create a welcoming space for all animal enthusiasts.
              </p>
            </div>
            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                🛡️
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">Animal Welfare</h3>
              <p className="mt-2 text-sm text-gray-600">
                We advocate for responsible ownership, proper housing, timely veterinary care, and ethical breeding practices at all times.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Physical Store Callout */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-brand-700 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Visit Us In Person</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-brand-100 sm:text-base">
            Prefer to examine feeds or accessories firsthand? Stop by our retail location in {STORE_CONTACT.address.city}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link to="/location" className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-brand-900 transition-all duration-200 hover:bg-accent-400 active:scale-[0.98]">
              View Location & Hours
            </Link>
            <Link to="/contact" className="rounded-lg border border-brand-200 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
