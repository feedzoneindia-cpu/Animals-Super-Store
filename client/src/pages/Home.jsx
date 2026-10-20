import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BlogCard from '../components/blog/BlogCard.jsx';
import BlogCardSkeleton from '../components/blog/BlogCardSkeleton.jsx';
import { buttonStyles } from '../components/common/Button.jsx';
import ImageWithFallback from '../components/common/ImageWithFallback.jsx';
import InquiryForm from '../components/inquiries/InquiryForm.jsx';
import ListingCard from '../components/listings/ListingCard.jsx';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton.jsx';
import { STORE_CONTACT } from '../constants/contact.js';
import { BROWSE_CATEGORIES } from '../constants/listings.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useScrollSpy } from '../context/ScrollSpyContext.jsx';
import useSectionSpy from '../hooks/useSectionSpy.js';
import useSEO from '../hooks/useSEO.js';
import { blogService } from '../services/blogService.js';
import { listingService } from '../services/listingService.js';

/** Homepage sections tracked by the navbar scroll-spy — ids live on the
 *  page sections below, in document order. Module-level so the observer
 *  hook receives a stable reference. */
const HOME_SECTION_IDS = ['home', 'goat-essentials', 'shop', 'goat-guides', 'blog', 'about', 'contact'];

/** Goat Essentials Section: Shows relevant feed, supplements, and accessories */
function GoatEssentialsSection() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listingService
      .getListings({ q: 'goat', limit: 8 })
      .then((data) => {
        if (!cancelled) setListings(data.listings || []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="goat-essentials"
      aria-labelledby="goat-essentials-heading"
      className="scroll-mt-20 border-b border-earth-200/80 bg-earth-50/70 py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
              NUTRITION • FEED • WELLNESS
            </span>
            <h2 id="goat-essentials-heading" className="mt-2.5 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Goat Essentials
            </h2>
            <p className="mt-2 text-base text-gray-600">
              Verified nutritious feed, mineral supplements, tonics, and daily farming supplies curated for healthy goats.
            </p>
          </div>
          <Link
            to="/shop?q=goat"
            className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors"
          >
            Explore all goat products →
          </Link>
        </div>

        {loading ? (
          <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : failed ? (
          <p className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            We couldn't load goat essentials right now.{' '}
            <Link to="/shop?q=goat" className="font-semibold text-brand-700 hover:text-brand-800">
              Search goat products in shop
            </Link>
            .
          </p>
        ) : listings.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-earth-300 bg-white/80 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-700">No specific goat listings available right now.</p>
            <p className="mt-1 text-xs text-gray-500">Check our full catalog for multi-species Animals feed and farming equipment.</p>
            <Link
              to="/shop"
              className="mt-4 inline-flex items-center rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
            >
              Browse Full Shop
            </Link>
          </div>
        ) : (
          <>
            <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {listings.slice(0, 4).map((listing) => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link to="/shop?q=goat" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                Explore all goat products →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** Latest live listings, straight from the API — no static filler data. */
function LatestListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;
    listingService
      .getListings({ limit: 8 })
      .then((data) => {
        if (!cancelled) setListings(data.listings);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="shop" aria-labelledby="latest-heading" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="latest-heading" className="text-3xl font-bold tracking-tight text-gray-900">
            Latest Listings & Shop
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Fresh Animals-related products, items, and livestock from the community.
          </p>
        </div>
        <Link to="/shop" className="hidden shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:block">
          View all in Shop →
        </Link>
      </div>

      {loading ? (
        <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : failed ? (
        <p className="mt-10 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          We couldn't load the latest listings right now.{' '}
          <Link to="/shop" className="font-semibold text-brand-700 hover:text-brand-800">
            Try the shop page
          </Link>
          .
        </p>
      ) : listings.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          {isAdmin ? (
            <>
              No listings yet — be the first to{' '}
              <Link to="/post-listing" className="font-semibold text-brand-700 hover:text-brand-800">
                post one
              </Link>
              !
            </>
          ) : (
            'No listings yet — check back soon!'
          )}
        </p>
      ) : (
        <>
          <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link to="/shop" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              View all products →
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

/** Featured Goat Farming Guides Section */
function GoatGuidesSection() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    blogService
      .getBlogs({ q: 'goat', limit: 3 })
      .then((data) => {
        if (!cancelled) setBlogs(data.blogs || []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="goat-guides"
      aria-labelledby="goat-guides-heading"
      className="border-y border-earth-200/90 bg-earth-100/40 scroll-mt-20 py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-earth-300 bg-earth-50 px-3 py-1 text-xs font-semibold text-earth-800">
              <span>🌾</span>
              PRACTICAL FARMING KNOWLEDGE
            </span>
            <h2 id="goat-guides-heading" className="mt-2.5 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Explore Goat Farming Guides
            </h2>
            <p className="mt-2 text-base text-gray-600">
              In-depth breed breakdowns, flock health, profitable breeding models, and pasture management advice.
            </p>
          </div>
          <Link to="/blog?q=goat" className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800">
            View all goat guides →
          </Link>
        </div>

        {loading ? (
          <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        ) : failed ? (
          <p className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            We couldn't load goat guides right now.{' '}
            <Link to="/blog" className="font-semibold text-brand-700 hover:text-brand-800">
              Browse all articles on the blog
            </Link>
            .
          </p>
        ) : blogs.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-earth-300 bg-white/70 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-700">No published goat guides available at the moment.</p>
            <p className="mt-1 text-xs text-gray-500">Read our other farm care and Animals welfare articles.</p>
            <Link
              to="/blog"
              className="mt-4 inline-flex items-center rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
            >
              Explore Blog
            </Link>
          </div>
        ) : (
          <>
            <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <BlogCard key={blog._id} blog={blog} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link to="/blog?q=goat" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                View all goat guides →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** Pet Supplies & Equipment Section */
function PetSuppliesSection() {
  const supplies = [
    {
      title: 'Comfort Bedding & Crates',
      desc: 'Orthopedic pet beds, secure travel carriers, foldable wire crates, and warm blankets.',
      tag: 'Rest & Travel',
    },
    {
      title: 'Feeding Bowls & Dispensers',
      desc: 'Stainless steel anti-skid bowls, automatic timed feeders, and gravity water fountains.',
      tag: 'Feeding Gear',
    },
    {
      title: 'Collars, Leashes & Harnesses',
      desc: 'Reflective heavy-duty collars, ergonomic harnesses, and retractable safety training leads.',
      tag: 'Walk & Train',
    },
    {
      title: 'Grooming & Hygiene Care',
      desc: 'De-shedding brushes, gentle organic shampoos, nail trimmers, and dental care kits.',
      tag: 'Hygiene & Health',
    },
  ];

  return (
    <section id="pet-supplies" className="bg-white border-y border-gray-200 scroll-mt-20 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              Gear & Accessories
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Supplies & Accessories
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Durable gear, cages, training tools, and grooming essentials for every Animals companion and farm livestock.
            </p>
          </div>
          <Link to="/pet-supplies" className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800">
            View All Supplies →
          </Link>
        </div>

        <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {supplies.map((item) => (
            <div
              key={item.title}
              className="flex flex-col justify-between rounded-xl bg-earth-50/50 p-6 shadow-sm border border-gray-200/80 card-lift"
            >
              <div>
                <span className="text-xs font-semibold text-brand-700">{item.tag}</span>
                <h3 className="mt-2 text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </div>
              <Link
                to="/pet-supplies"
                className="mt-6 inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Shop Gear &rarr;
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Latest published articles across all topics for the home page. */
function LatestBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    blogService
      .getBlogs({ limit: 3 })
      .then((data) => {
        if (!cancelled) setBlogs(data.blogs);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="blog" aria-labelledby="latest-blogs-heading" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="latest-blogs-heading" className="text-3xl font-bold tracking-tight text-gray-900">
            From the Blog
          </h2>
          <p className="mt-2 text-sm text-gray-600">Animals-focused guides, care tips, and stories across all species.</p>
        </div>
        <Link to="/blog" className="hidden shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:block">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      ) : failed ? (
        <p className="mt-10 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          We couldn't load the latest articles right now.{' '}
          <Link to="/blog" className="font-semibold text-brand-700 hover:text-brand-800">
            Try the blog page
          </Link>
          .
        </p>
      ) : blogs.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          No articles yet — check back soon!
        </p>
      ) : (
        <>
          <div className="stagger mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <BlogCard key={blog._id} blog={blog} />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link to="/blog" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              View all articles →
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

/** Why Animals Super Store: Highlights easy discovery, care essentials and farming information */
function WhyChooseUsSection() {
  const highlights = [
    {
      title: 'Dedicated Livestock & Goat Care',
      desc: 'Specialized focus on ruminant feed, high-potency mineral licks, and certified health supplements designed for modern farmers.',
      icon: (
        <svg className="h-6 w-6 text-brand-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-16.5 0c-.99.203-1.99.377-3 .52m16.5 0a48.667 48.667 0 0 1-1.5 8.922m-13.5-8.922a48.667 48.667 0 0 0-1.5 8.922m16.5 0A48.337 48.337 0 0 1 12 15c-2.291 0-4.545-.16-6.75-.47m16.5 0c-.862 3.12-2.735 5.756-5.25 7.47m-6 0C7.985 20.286 6.112 17.65 5.25 14.53" />
        </svg>
      ),
    },
    {
      title: 'Transparent Marketplace Discovery',
      desc: 'Find feed manufacturers, equipment suppliers, and verified listings with transparent pricing and full product details.',
      icon: (
        <svg className="h-6 w-6 text-brand-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
        </svg>
      ),
    },
    {
      title: 'Actionable Farming Guides',
      desc: 'Written by experienced agriculturists and breeders covering flock disease prevention, housing design, and nutrition schedules.',
      icon: (
        <svg className="h-6 w-6 text-brand-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      title: 'Physical Super Store Location',
      desc: 'Visit our flagship store in person for on-site quality check, feed bulk inspection, and direct guidance from caretakers.',
      icon: (
        <svg className="h-6 w-6 text-brand-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.877 0 1.688-.376 2.25-.98a2.993 2.993 0 0 0 2.25.98c.877 0 1.688-.376 2.25-.98a3.001 3.001 0 0 0 3.75.614" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-labelledby="why-heading" className="bg-earth-50 border-t border-earth-200 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3.5 py-1 text-xs font-semibold text-brand-800">
            Trusted Marketplace
          </span>
          <h2 id="why-heading" className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Why Animals Super Store
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">
            Built for modern farmers, goat breeders, and pet lovers who demand quality products, clear guidance, and honest service.
          </p>
        </div>

        <div className="stagger mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-earth-200 bg-white p-6 shadow-sm card-lift"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
                {item.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** About Us & Ethical Commitment Section */
function AboutSection() {
  return (
    <section id="about" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            Our Mission & Commitment
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            About Animals Super Store
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Animals Super Store is India’s dedicated destination connecting pet parents, livestock farmers, and Animals caretakers with genuine supplies, nourishing feed, and ethical Animals adoption inquiries.
          </p>
          <div className="mt-6 space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">✓</span>
              <span>100% Ethical Standards — Live Animals are never sold as cart items.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">✓</span>
              <span>Verified feed & equipment directly from authentic suppliers.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">✓</span>
              <span>Physical super store location with on-site inspection and pickup.</span>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <Link to="/about" className={buttonStyles({ size: 'md' })}>
              Read Full Story
            </Link>
            <Link to="/location" className={buttonStyles({ variant: 'outline', size: 'md' })}>
              Visit Our Store
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">How Our Store Works</h3>
          <ol className="space-y-6">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">1</span>
              <div>
                <h4 className="font-semibold text-gray-900">Explore & Discover</h4>
                <p className="mt-1 text-sm text-gray-600">Browse fresh feed, accessories, gear, and Animals adoption profiles.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">2</span>
              <div>
                <h4 className="font-semibold text-gray-900">Seamless Ordering & Direct Inquiry</h4>
                <p className="mt-1 text-sm text-gray-600">Add physical items to cart with doorstep delivery, or reach verified Animals caretakers directly.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">3</span>
              <div>
                <h4 className="font-semibold text-gray-900">Delivery or Store Pickup</h4>
                <p className="mt-1 text-sm text-gray-600">Fast pan-India dispatch with tracking, or visit our retail facility in person.</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Contact Us & Store Information Section */
function ContactSection() {
  return (
    <section id="contact" className="border-t border-gray-200 bg-brand-700 text-white scroll-mt-20 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
          {/* LEFT — store contact details */}
          <div>
            <span className="text-xs font-semibold tracking-wider text-brand-200 uppercase">Need Assistance?</span>
            <h3 className="mt-2 text-2xl font-bold">Contact Support</h3>
            <p className="mt-3 text-sm text-brand-100">
              Our Animals care specialists and ordering support team are here for you 7 days a week.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-xl bg-brand-800/80 p-5">
                <div className="text-sm font-semibold text-brand-200">Customer Helpline</div>
                <div className="mt-1 space-y-0.5">
                  {STORE_CONTACT.phones.map((phone) => (
                    <a
                      key={phone.tel}
                      href={`tel:${phone.tel}`}
                      className="block text-lg font-bold transition-colors hover:text-brand-200"
                    >
                      {phone.display}
                    </a>
                  ))}
                </div>
                <p className="mt-2 text-xs text-brand-200">Mon - Sun: 9:00 AM - 8:00 PM IST</p>
              </div>

              <div className="rounded-xl bg-brand-800/80 p-5">
                <div className="text-sm font-semibold text-brand-200">Email Support</div>
                <a
                  href={`mailto:${STORE_CONTACT.email}`}
                  className="mt-1 block truncate text-base font-bold transition-colors hover:text-brand-200"
                >
                  {STORE_CONTACT.email}
                </a>
                <p className="mt-2 text-xs text-brand-200">Guaranteed response within 24 hours</p>
              </div>

              <div className="rounded-xl bg-brand-800/80 p-5">
                <div className="text-sm font-semibold text-brand-200">Super Store Location</div>
                <div className="mt-1 text-sm font-bold">{STORE_CONTACT.fullAddress}</div>
                <Link
                  to="/location"
                  className="mt-3 inline-flex items-center text-xs font-semibold text-brand-200 hover:text-white underline"
                >
                  View Map & Directions →
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT — the inquiry form (same shared component as the Contact page) */}
          <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <h3 className="text-xl font-bold text-gray-900">Send Us a Message</h3>
            <p className="mt-1 text-sm text-gray-600">
              Fill in your information and we will respond as soon as possible.
            </p>
            <div className="mt-6">
              <InquiryForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { setActiveSection } = useScrollSpy();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useSEO({
    title: 'Animals Super Store — Everything for Goats. One Place.',
    description:
      'Discover goat-related products, nutritious feed, accessories, farming equipment and practical goat-farming guides — all in one place at Animals Super Store.',
  });

  // Scroll-spy: track which section the visitor is reading
  const activeSection = useSectionSpy(HOME_SECTION_IDS);
  useEffect(() => {
    setActiveSection(activeSection);
  }, [activeSection, setActiveSection]);

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = searchTerm.trim();
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop');
  };

  return (
    <>
      {/* Pendulum swing for the hero image card.
          --pivot = distance from the card's top edge up to the pivot point.
          On desktop the pivot sits behind the navbar (the hero clips the thread there),
          so the thread seems to come from behind the navbar. */}
      <style>{`
        .hero-pendulum {
          --pivot: 56px;
          transform-origin: 50% calc(-1 * var(--pivot));
          animation: hero-pendulum 6s ease-in-out infinite;
          will-change: transform;
        }
        @media (min-width: 1024px) {
          .hero-pendulum { --pivot: 320px; }
        }
        .hero-thread {
          position: absolute;
          left: 50%;
          bottom: 100%;
          width: 2px;
          height: var(--pivot);
          transform: translateX(-50%);
          border-radius: 9999px;
          background: linear-gradient(to bottom, #6b7280, #9ca3af);
        }
        @keyframes hero-pendulum {
          0%, 100% { transform: rotate(3deg); }
          50% { transform: rotate(-3deg); }
        }
        /* Reduced-motion users still get a very gentle, slow sway instead of nothing */
        @keyframes hero-pendulum-soft {
          0%, 100% { transform: rotate(0.8deg); }
          50% { transform: rotate(-0.8deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-pendulum { animation: hero-pendulum-soft 9s ease-in-out infinite !important; }
        }
      `}</style>

      {/* Hero Section: Goat-focused visual theme with realistic photograph */}
      <section
        id="home"
        className="surface-hero relative scroll-mt-20 overflow-hidden border-b border-gray-200/70"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Headlines & Search & CTA */}
            <div className="animate-fade-up text-center lg:col-span-7 lg:text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-800 sm:text-sm">
                <span className="flex h-2 w-2 rounded-full bg-accent-500" />
                <span>GOAT CARE • FEED • FARMING</span>
              </div>

              {/* Headline */}
              <h1 className="mt-6 text-[clamp(2rem,6.5vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight text-gray-900">
                Everything for Goats.{' '}
                <span className="text-gradient block">One Place.</span>
              </h1>

              {/* Description */}
              <p className="mt-5 text-base leading-7 text-gray-600 sm:text-lg sm:leading-8 max-w-2xl mx-auto lg:mx-0">
                Discover goat-related products, feed, accessories, equipment and practical farming guides—all in one place.
              </p>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="mt-8 flex max-w-xl mx-auto lg:mx-0 gap-2" role="search">
                <label htmlFor="home-search" className="sr-only">
                  Search listings
                </label>
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    id="home-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search for goat feed, mineral licks, or farm equipment…"
                    className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-md transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-700/10"
                  />
                </div>
                <button type="submit" className={buttonStyles({ variant: 'gradient', size: 'lg' }) + ' shrink-0 rounded-xl'}>
                  Search
                </button>
              </form>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link to="/shop" className={buttonStyles({ variant: 'gradient', size: 'lg' }) + ' rounded-xl'}>
                  Browse Listings
                </Link>
                <Link
                  to="/blog"
                  className={
                    buttonStyles({ variant: 'outline', size: 'lg' }) +
                    ' rounded-xl'
                  }
                >
                  Explore Goat Guides
                </Link>
                {isAdmin && (
                  <Link
                    to="/post-listing"
                    className="inline-flex items-center rounded-xl bg-brand-100 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-200 transition-colors"
                  >
                    + Post a Listing
                  </Link>
                )}
              </div>

              {/* Subtle Trust Indicators */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs font-medium text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-brand-600 font-bold">✓</span>
                  <span>Pure Natural Bhoosa & Feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-brand-600 font-bold">✓</span>
                  <span>Essential Mineral & Salt Blocks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-brand-600 font-bold">✓</span>
                  <span>Proven Farming Guides</span>
                </div>
              </div>
            </div>

            {/* Right Column: Prominent Goat Farm Hero Image Card */}
            <div className="animate-fade-up lg:col-span-5" style={{ animationDelay: '120ms' }}>
              {/* Hangs from a thread at the top centre and swings like a pendulum */}
              <div className="hero-pendulum relative mx-auto mt-14 max-w-md lg:mt-0 lg:max-w-none">
                {/* Thread (runs up behind the navbar on desktop) */}
                <span aria-hidden="true" className="hero-thread" />
                {/* Nail — only visible on small screens, where there is no navbar to hide it */}
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-[-56px] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-gray-400 to-gray-700 shadow-sm ring-2 ring-white lg:hidden"
                />
                {/* Knot where the thread meets the card */}
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-0 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-500 bg-white shadow-sm"
                />
                <div className="relative">
                {/* Background decorative accent card */}
                <div className="absolute -inset-3 -rotate-2 rounded-3xl bg-gradient-to-tr from-brand-500/25 via-accent-400/20 to-brand-300/10" />

                <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-earth-100">
                    <ImageWithFallback
                      src="/goat-hero.jpeg"
                      alt="Healthy goats in a natural farm setting"
                      width="550"
                      height="331"
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="eager"
                      fetchpriority="high"
                    />
                  </div>

                  {/* Caption badge inside card */}
                  <div className="border-t border-gray-100 bg-white p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-success-500 animate-pulse" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-800">
                            FARM-TESTED NUTRITION
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            Healthy Livestock, Thriving Herds
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/shop?q=goat"
                        className="text-xs font-bold text-brand-700 hover:text-brand-800 underline underline-offset-2 shrink-0"
                      >
                        Shop Feed →
                      </Link>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Goat Essentials Section */}
      <GoatEssentialsSection />

      {/* 2. Latest Listings & Shop */}
      <LatestListings />

      {/* 3. Featured Goat Farming Guides */}
      <GoatGuidesSection />

      {/* 4. Browse Categories */}
      <section aria-labelledby="categories-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
            Marketplace Catalog
          </span>
          <h2 id="categories-heading" className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Browse Categories
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-600">
            Listings on Animals Super Store cover Animals-related products, items, and equipment —
            across four simple categories.
          </p>
        </div>
        {/* Exactly four cards: Animals Food, Animals Accessories, Animals Equipment, Other */}
        <div className="stagger mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BROWSE_CATEGORIES.map((category) => (
            <Link
              key={category.name}
              to={`/listings?category=${encodeURIComponent(category.name)}`}
              className="card-lift group rounded-2xl border border-gray-200 bg-white p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-brand-700">
                {category.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{category.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                Explore
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. General Supplies & Equipment */}
      <PetSuppliesSection />

      {/* 6. Why Animals Super Store */}
      <WhyChooseUsSection />

      {/* 7. Latest Published Blogs Across All Topics */}
      <LatestBlogs />

      {/* 8. About Animals Super Store */}
      <AboutSection />

      {/* 9. Contact Section */}
      <ContactSection />

      {/* Call to action — admin only, since only admins can post listings. */}
      {isAdmin && (
        <section aria-labelledby="cta-heading" className="bg-brand-800">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-white">
              Have something Animals-related to sell or rehome?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-brand-100">
              List a product, an item, or an Animals and put it in front of Animals lovers today.
              Posting a listing is free and it goes live immediately.
            </p>
            <Link
              to="/post-listing"
              className="mt-8 inline-block px-4 py-2 text-lg font-semibold text-accent-300 underline-offset-8 transition-colors hover:text-accent-200 hover:underline focus-visible:text-accent-200 focus-visible:underline"
            >
              Post a Listing
            </Link>
          </div>
        </section>
      )}
    </>
  );
}