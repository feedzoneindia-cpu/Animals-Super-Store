import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ListingCardSkeleton from './ListingCardSkeleton.jsx';
import ProductTile from './ProductTile.jsx';
import { listingService } from '../../services/listingService.js';

const COUNT = 4;

/**
 * "More items like this" strip shown at the bottom of a listing page.
 * Prefers other listings from the same category and tops up with the latest
 * listings when the category has fewer than four others. Renders nothing if
 * there is nothing to suggest.
 */
export default function RelatedListings({ listing }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const others = (data) => (data?.listings ?? []).filter((item) => item._id !== listing._id);

    (async () => {
      try {
        let picked = others(
          await listingService.getListings({ category: listing.category, limit: 12, sort: 'latest' })
        ).slice(0, COUNT);

        if (picked.length < COUNT) {
          const extra = others(await listingService.getListings({ limit: 12, sort: 'latest' })).filter(
            (item) => !picked.some((p) => p._id === item._id)
          );
          picked = [...picked, ...extra].slice(0, COUNT);
        }
        if (!cancelled) setItems(picked);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listing._id, listing.category]);

  if (!loading && items.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-14 border-t border-gray-200 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="related-heading" className="text-2xl font-bold tracking-tight text-gray-900">
            More items like this
          </h2>
          <p className="mt-1 text-sm text-gray-500">Other picks from {listing.category} you might want.</p>
        </div>
        <Link
          to={`/listings?category=${encodeURIComponent(listing.category)}`}
          className="text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          View all {listing.category} →
        </Link>
      </div>

      <div className="stagger mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: COUNT }).map((_, i) => <ListingCardSkeleton key={i} />)
          : items.map((item) => <ProductTile key={item._id} listing={item} />)}
      </div>
    </section>
  );
}
