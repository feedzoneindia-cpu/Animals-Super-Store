import { Link } from 'react-router-dom';
import { isAnimalsListing } from '../../constants/listings.js';
import { cn } from '../../utils/cn.js';
import { formatAge, formatDate, formatPrice } from '../../utils/format.js';
import ImageWithFallback from '../common/ImageWithFallback.jsx';

/**
 * Marketplace listing card: image, title, price, category, location,
 * posted date — plus a clear SOLD badge when the item is sold.
 *
 * Animals listings additionally surface the Animals itself: type, breed,
 * age, and gender, so a buyer can judge fit without opening the page.
 */
export default function ListingCard({ listing, className }) {
  const isAnimals = isAnimalsListing(listing);
  const age = formatAge(listing.ageMonths);

  return (
    <Link
      to={`/listings/${listing.slug}`}
      className={cn(
        'card-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700',
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={listing.images?.[0]?.url}
          optimize={640}
          alt={listing.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {listing.status === 'sold' ? (
          <span className="absolute left-3 top-3 rounded-full bg-gray-900/85 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Sold
          </span>
        ) : !isAnimals && listing.stockQuantity !== undefined && listing.stockQuantity <= 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-red-600/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
            Out of Stock
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-lg font-bold text-gray-900">{formatPrice(listing.price)}</p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-gray-900 group-hover:text-brand-700">
          {listing.title}
        </h3>
        {/* Always two lines tall, so Animals and products share one card height. */}
        <div className="min-h-[2.25rem] space-y-0.5">
          {isAnimals ? (
            <>
              <p className="truncate text-xs font-medium text-brand-800">
                {[listing.AnimalsType, listing.breed].filter(Boolean).join(' · ')}
              </p>
              <p className="truncate text-xs text-gray-500">
                {[age, listing.gender].filter(Boolean).join(' · ')}
              </p>
            </>
          ) : (
            <p className="truncate text-xs text-gray-500">{listing.category}</p>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-gray-500">
          <span className="truncate">{listing.location}</span>
          <span className="shrink-0">{formatDate(listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
