import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Button, { buttonStyles } from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ImageWithFallback from '../components/common/ImageWithFallback.jsx';
import RelatedListings from '../components/listings/RelatedListings.jsx';
import ReportListingDialog from '../components/listings/ReportListingDialog.jsx';
import { isAnimalsListing } from '../constants/listings.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import useSEO from '../hooks/useSEO.js';
import { listingService } from '../services/listingService.js';
import { formatAge, formatDate, formatFullDate, formatPrice } from '../utils/format.js';
import { breadcrumbSchema, productSchema } from '../utils/seoSchema.js';
import { buildWhatsAppUrl } from '../utils/whatsapp.js';

/** Readable key/value grid for the Animals-specific facts on a listing. */
function AnimalsDetails({ listing }) {
  const facts = [
    { label: 'Animals type', value: listing.AnimalsType },
    { label: 'Breed', value: listing.breed },
    { label: 'Age', value: formatAge(listing.ageMonths) },
    { label: 'Gender', value: listing.gender },
  ].filter((fact) => fact.value);

  if (facts.length === 0) return null;

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Animals details</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs text-gray-500">{fact.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-gray-900">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="aspect-[4/3] rounded-xl bg-gray-200" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-1/2 rounded bg-gray-200" />
          <div className="h-5 w-1/3 rounded bg-gray-200" />
          <div className="h-24 rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export default function ListingDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useSEO({
    title: listing ? `${listing.title} · ${formatPrice(listing.price)}` : 'Listing',
    description: listing
      ? `${listing.title} — ${
          isAnimalsListing(listing)
            ? [listing.AnimalsType, listing.breed, formatAge(listing.ageMonths)].filter(Boolean).join(', ')
            : listing.category
        } in ${listing.location}. ${listing.description.slice(0, 120)}`
      : undefined,
    // A genuinely missing/archived listing (API 404) is a soft-404 — keep it out of the index.
    // Temporary failures (network, 5xx, rate limit) must NOT noindex a good page.
    noindex: !loading && notFound,
    image: listing?.images?.[0]?.url,
    type: 'product',
    jsonLd: listing
      ? [
          productSchema(listing, { isAnimals: isAnimalsListing(listing) }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Shop', path: '/shop' },
            { name: listing.title, path: `/listings/${listing.slug}` },
          ]),
        ]
      : undefined,
  });
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setNotFound(false);
    setSelectedImageIndex(0);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    listingService
      .getListingBySlug(slug)
      .then((data) => {
        if (!cancelled) setListing(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setNotFound(err.status === 404);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <DetailSkeleton />;

  if (error || !listing) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Listing not found"
          message={error || 'This listing may have been removed or archived.'}
          action={
            <Link to="/shop" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
              Back to Listings
            </Link>
          }
        />
      </section>
    );
  }

  const isSold = listing.status === 'sold';
  const isAnimals = isAnimalsListing(listing);
  const isOutOfStock = !isAnimals && listing.stockQuantity !== undefined && listing.stockQuantity <= 0;
  const maxStock = listing.stockQuantity !== undefined ? listing.stockQuantity : 10;
  const images = listing.images ?? [];
  const selectedImage = images[selectedImageIndex] ?? images[0];
  const memberSince = listing.seller?.createdAt
    ? new Date(listing.seller.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <button onClick={() => navigate(-1)} className={buttonStyles({ variant: 'outline', size: 'sm' })}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Gallery */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            <ImageWithFallback
              src={selectedImage.url}
              optimize={1200}
              alt={listing.title}
              className="aspect-[4/3] w-full object-cover"
            />
            {isSold ? (
              <span className="absolute left-4 top-4 rounded-md bg-gray-900/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Sold
              </span>
            ) : isOutOfStock ? (
              <span className="absolute left-4 top-4 rounded-md bg-red-600/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Out of Stock
              </span>
            ) : null}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.url + idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    idx === selectedImageIndex ? 'border-brand-700' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <ImageWithFallback src={img.url} optimize={240} alt={`${listing.title} — photo ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
              {listing.description}
            </p>
            {listing.additionalDetails && (
              <>
                <h2 className="mt-8 text-lg font-semibold text-gray-900">Additional details</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                  {listing.additionalDetails}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                {listing.category}
              </span>
              {isSold ? (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-700">
                  Sold
                </span>
              ) : !isAnimals ? (
                isOutOfStock ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-700">
                    Out of Stock
                  </span>
                ) : (
                  <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-800">
                    In Stock
                  </span>
                )
              ) : null}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{listing.title}</h1>
            <p className="mt-2 text-3xl font-extrabold text-gray-900">{formatPrice(listing.price)}</p>
            <div className="mt-4 space-y-1.5 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="m9.69 18.933-.003.001A.75.75 0 0 1 9 18.933l-.003-.001a18.618 18.618 0 0 1-1.13-.49 12.237 12.237 0 0 1-3.544-2.431C2.375 14.048 1.25 11.875 1.25 9.25c0-2.9 2.35-5.25 5.25-5.25 1.797 0 3.384.91 4.35 2.304a5.25 5.25 0 0 1 8.1 4.35c0 3.118-2.194 5.416-4.5 6.855a13.535 13.535 0 0 1-2.76 1.35Z" clipRule="evenodd" />
                </svg>
                {listing.location}
              </p>
              <p className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .27.144.518.378.651l3.5 2a.75.75 0 0 0 .744-1.302L10.75 9.846V5Z" clipRule="evenodd" />
                </svg>
                Posted {formatFullDate(listing.createdAt)} ({formatDate(listing.createdAt)})
              </p>
              <p className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186 10.257 10.257 0 0 1 19.472 0 1.65 1.65 0 0 1 0 1.186 10.257 10.257 0 0 1-19.472 0ZM9.75 5a.75.75 0 0 0 0 1.5A3.5 3.5 0 0 1 13.25 10 .75.75 0 0 0 14.75 10 5 5 0 0 0 9.75 5Z" clipRule="evenodd" />
                </svg>
                {listing.views ?? 0} views
              </p>
            </div>

            {isAnimals && <AnimalsDetails listing={listing} />}

            {/* Purchase / Inquire Actions */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              {!isAnimals ? (
                <>
                  {isSold ? (
                    <p className="rounded-lg bg-red-50 p-3 text-center text-xs font-semibold text-red-700">
                      This item is currently sold out.
                    </p>
                  ) : isOutOfStock ? (
                    <div className="space-y-2">
                      <p className="rounded-lg bg-red-50 p-3 text-center text-xs font-semibold text-red-700">
                        This item is currently out of stock.
                      </p>
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 cursor-not-allowed"
                      >
                        Out of Stock
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="detail-qty" className="text-xs font-semibold text-gray-700">
                          Quantity
                        </label>
                        <div className="flex items-center rounded-lg border border-gray-300 bg-white">
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="px-2.5 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span id="detail-qty" className="w-10 text-center text-sm font-semibold text-gray-900">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                            className="px-2.5 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(listing, quantity)}
                        className={buttonStyles({ size: 'md' }) + ' w-full flex items-center justify-center gap-2'}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add to Cart · {formatPrice(listing.price * quantity)}
                      </button>
                      <Link
                        to="/cart"
                        className="block text-center text-xs font-semibold text-brand-700 hover:underline"
                      >
                        View Shopping Cart →
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-5 text-amber-900">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    🐾 Live Animals Adoption & Rehoming
                  </p>
                  <p className="mt-1">
                    Live Animals cannot be purchased through an automated cart. Please contact the seller directly below to verify care conditions, health records, and arrange personal viewing.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {isAnimals ? 'Caretaker / Seller' : 'Seller / Store Contact'}
              </h2>
              <p className="mt-1.5 text-base font-semibold text-gray-900">{listing.sellerName}</p>
              {memberSince && <p className="text-sm text-gray-500">Member since {memberSince}</p>}

              <div className="mt-4 space-y-2">
                <a href={`tel:${listing.contactNumber.replace(/[^0-9+]/g, '')}`} className={buttonStyles({ variant: 'outline', size: 'md' }) + ' w-full'}>
                  📞 Call {listing.contactNumber}
                </a>
                <a
                  href={buildWhatsAppUrl(
                    listing.contactNumber,
                    `Hello, I am interested in your listing: "${listing.title}" on Animals Super Store.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-success-700 active:scale-[0.98]"
                >
                  💬 Chat on WhatsApp
                </a>
                {listing.contactEmail && (
                  <a
                    href={`mailto:${listing.contactEmail}?subject=${encodeURIComponent(`Enquiry: ${listing.title}`)}`}
                    className={buttonStyles({ variant: 'outline', size: 'md' }) + ' w-full'}
                  >
                    ✉️ Email Seller
                  </a>
                )}
              </div>
              {isSold && (
                <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  {isAnimalsListing(listing)
                    ? 'This Animals has been marked as sold/adopted by the owner.'
                    : 'This item has been marked as sold by the seller.'}
                </p>
              )}
            </div>
          </div>

          {/* Report listing */}
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-600"
              onClick={() => {
                if (user) {
                  setReportOpen(true);
                } else {
                  navigate('/login', { state: { from: location }, replace: true });
                }
              }}
            >
              ⚑ Report this listing
            </Button>
          </div>
        </div>
      </div>

      <RelatedListings listing={listing} />

      <ReportListingDialog
        open={reportOpen}
        listing={listing}
        onClose={() => setReportOpen(false)}
      />
    </section>
  );
}
