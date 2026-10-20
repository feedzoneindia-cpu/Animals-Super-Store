import { Link } from 'react-router-dom';
import { isAnimalsListing } from '../../constants/listings.js';
import { useCart } from '../../context/CartContext.jsx';
import { cn } from '../../utils/cn.js';
import { formatAge, formatDate, formatPrice } from '../../utils/format.js';
import ImageWithFallback from '../common/ImageWithFallback.jsx';

/** Every action button has the same fixed height so all tiles line up. */
const ACTION =
  'flex h-9 min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors';
const DISABLED = 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400';

/**
 * A marketplace card with its action buttons INSIDE the card.
 * Products get "Add to Cart" + "View Details"; Animals get "View Details".
 * Every tile has the same width, height and button row so grids stay even.
 */
export default function ProductTile({ listing }) {
  const { items, addToCart, updateQuantity } = useCart();
  const isAnimals = isAnimalsListing(listing);
  const outOfStock = !isAnimals && listing.stockQuantity !== undefined && listing.stockQuantity <= 0;
  const cartItem = items.find((item) => item.id === (listing._id || listing.id));
  const age = formatAge(listing.ageMonths);
  const detailsPath = `/listings/${listing.slug}`;

  let cartAction = null;
  if (!isAnimals) {
    if (listing.status !== 'active') {
      cartAction = (
        <button type="button" disabled className={cn(ACTION, DISABLED)}>
          Sold
        </button>
      );
    } else if (outOfStock) {
      cartAction = (
        <button type="button" disabled className={cn(ACTION, DISABLED)}>
          Out of Stock
        </button>
      );
    } else if (cartItem) {
      const stepBtn =
        'flex h-full w-9 items-center justify-center text-base font-bold text-brand-800 transition-colors hover:bg-brand-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand-800';
      cartAction = (
        <div
          className="flex h-9 min-w-0 flex-1 shrink-0 items-stretch overflow-hidden rounded-lg border border-brand-200 bg-brand-50 text-xs font-semibold"
          role="group"
          aria-label="Change quantity"
        >
          <button
            type="button"
            onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
            className={stepBtn}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="flex min-w-0 flex-1 items-center justify-center text-sm text-brand-800" aria-live="polite">
            {cartItem.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
            disabled={cartItem.quantity >= (cartItem.stockQuantity ?? 999)}
            className={stepBtn}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      );
    } else {
      cartAction = (
        <button
          type="button"
          onClick={() => addToCart(listing, 1)}
          className={cn(
            ACTION,
            'border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-700 hover:bg-brand-700 hover:text-white active:scale-[0.98]'
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add to Cart
        </button>
      );
    }
  }

  return (
    <div className="card-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
      <Link
        to={detailsPath}
        className="relative block aspect-[4/3] overflow-hidden bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
        aria-label={listing.title}
      >
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
        ) : outOfStock ? (
          <span className="absolute left-3 top-3 rounded-full bg-red-600/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
            Out of Stock
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-lg font-bold text-gray-900">{formatPrice(listing.price)}</p>
        <Link to={detailsPath} className="focus-visible:outline-none focus-visible:underline">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-gray-900 hover:text-brand-700">
            {listing.title}
          </h3>
        </Link>
        {/* Always two lines tall, so Animals and products share one card height. */}
        <div className="min-h-[2.25rem] space-y-0.5">
          {isAnimals ? (
            <>
              <p className="truncate text-xs font-medium text-brand-800">
                {[listing.AnimalsType, listing.breed].filter(Boolean).join(' · ')}
              </p>
              <p className="truncate text-xs text-gray-500">{[age, listing.gender].filter(Boolean).join(' · ')}</p>
            </>
          ) : (
            <p className="truncate text-xs text-gray-500">{listing.category}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 text-xs text-gray-500">
          <span className="truncate">{listing.location}</span>
          <span className="shrink-0">{formatDate(listing.createdAt)}</span>
        </div>

        {/* Action buttons live inside the card. */}
        <div className="mt-auto flex gap-2 pt-3">
          {cartAction}
          <Link
            to={detailsPath}
            className={cn(
              ACTION,
              'border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800'
            )}
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}