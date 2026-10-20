import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button, { buttonStyles } from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import {
    Animals_CATEGORY,
    Animals_TYPES,
    LISTING_CATEGORIES,
    LISTING_STATUSES,
    LISTING_STATUS_STYLES,
    isAnimalsListing,
} from '../../constants/listings.js';
import { useToast } from '../../context/ToastContext.jsx';
import useSEO from '../../hooks/useSEO.js';
import { adminService } from '../../services/adminService.js';
import { formatAge, formatDate, formatPrice } from '../../utils/format.js';

const PAGE_SIZE = 9;

/**
 * Admin listing management. Filter, view, archive, and delete only —
 * there is intentionally NO approval queue: listings go public the
 * moment they are created.
 */
function ListingRow({ listing, onArchive, onDelete, busyId }) {
  const busy = busyId === listing._id;
  const { _id, title, slug, price, status, category, location, createdAt, views, images, seller } = listing;
  const isAnimals = isAnimalsListing(listing);
  const Animalsummary = [listing.AnimalsType, listing.breed, formatAge(listing.ageMonths), listing.gender]
    .filter(Boolean)
    .join(' · ');

  const outOfStock = listing.stockQuantity !== undefined && listing.stockQuantity <= 0;

  return (
    <li className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link
        to={status === 'archived' ? `/admin/listings` : `/listings/${slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-gray-100"
        aria-label={status === 'archived' ? 'Archived listings are not publicly visible' : `View ${title}`}
      >
        <ImageWithFallback
          src={images?.[0]?.url}
          optimize={640}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize shadow-sm ${LISTING_STATUS_STYLES[status]}`}
        >
          {status}
        </span>
        {!isAnimals && (
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${
              outOfStock ? 'bg-red-600 text-white' : 'bg-white/95 text-success-700 ring-1 ring-inset ring-success-600/20'
            }`}
          >
            {outOfStock ? 'Out of Stock' : `Stock: ${listing.stockQuantity ?? 9}`}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{category}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-gray-900">{title}</h3>
        <p className="mt-2 text-lg font-bold text-gray-900">{formatPrice(price)}</p>
        {isAnimals && Animalsummary && (
          <p className="mt-1 text-xs font-medium text-brand-800">{Animalsummary}</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
          <span className="truncate">{location}</span>
          <span className="shrink-0">
            {formatDate(createdAt)} · {views ?? 0} views
          </span>
        </div>
        {seller && (
          <p className="mt-2 truncate border-t border-gray-100 pt-2 text-sm text-gray-600" title={seller.email}>
            Seller: {seller.name}
            {seller.status === 'blocked' ? ' — blocked' : ''}
          </p>
        )}

        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          <Link
            to={`/my-listings/${listing._id}/edit`}
            className={`${buttonStyles({ variant: 'outline', size: 'sm' })} w-full`}
          >
            Edit
          </Link>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={busy || status === 'archived'}
            onClick={() => onArchive(listing)}
          >
            Archive
          </Button>
          <Button variant="danger" size="sm" className="w-full" disabled={busy} onClick={() => onDelete(listing)}>
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function AdminListingList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const status = searchParams.get('status') ?? '';
  const location = searchParams.get('location') ?? '';
  const AnimalsType = searchParams.get('AnimalsType') ?? '';
  const page = Number(searchParams.get('page')) || 1;
  const { toast } = useToast();

  useSEO({ title: 'Manage Listings', noindex: true });

  const [result, setResult] = useState({ listings: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { type, listing }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchListings = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: PAGE_SIZE };
    if (q) params.q = q;
    if (category) params.category = category;
    if (status) params.status = status;
    if (location) params.location = location;
    if (AnimalsType) params.AnimalsType = AnimalsType;
    adminService
      .getListings(params)
      .then((data) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, category, status, location, AnimalsType, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const applyParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    applyParam('q', event.target.elements.q.value.trim());
  };

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { type, listing } = pendingAction;
    setActionLoading(true);
    setBusyId(listing._id);
    try {
      if (type === 'archive') {
        await adminService.archiveListing(listing._id);
        toast('Listing archived. It is no longer publicly visible.');
      } else if (type === 'delete') {
        await adminService.deleteListing(listing._id);
        toast('Listing deleted, along with its images and reports.');
      }
      setPendingAction(null);
      if (type === 'delete' && result.listings.length === 1 && page > 1) {
        const next = new URLSearchParams(searchParams);
        next.set('page', String(page - 1));
        setSearchParams(next);
      } else {
        fetchListings();
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(false);
      setBusyId(null);
    }
  };

  const dialogConfig = pendingAction
    ? {
        archive: {
          title: 'Archive this listing?',
          message: `"${pendingAction.listing.title}" will be hidden from public search and its page will no longer be accessible. The seller can still see it under their archived listings.`,
          confirmLabel: 'Archive Listing',
          danger: false,
        },
        delete: {
          title: 'Delete this listing?',
          message: `"${pendingAction.listing.title}" will be permanently deleted, along with its images and any reports filed against it. This cannot be undone.`,
          confirmLabel: 'Delete Listing',
          danger: true,
        },
      }[pendingAction.type]
    : null;

  const selectClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-700 focus:outline-none';

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Listings</h1>
          <p className="mt-1 text-sm text-gray-600">
            View, search, archive, or delete listings across every status.
          </p>
        </div>
        <Link to="/post-listing" className={buttonStyles({ size: 'sm' })}>
          + Post a Listing
        </Link>
      </div>

      {/* Search + filters */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
        <form className="flex max-w-md flex-1 gap-2" role="search" onSubmit={handleSearch}>
          <label htmlFor="listing-search" className="sr-only">
            Search listings
          </label>
          <input
            id="listing-search"
            type="search"
            name="q"
            defaultValue={q}
            key={q}
            placeholder="Search by title"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="location-filter" className="sr-only">Location</label>
          <input
            id="location-filter"
            type="search"
            defaultValue={location}
            key={location}
            placeholder="Location"
            onChange={(event) => applyParam('location', event.target.value.trim())}
            className={`${selectClass} w-32`}
          />
          <label htmlFor="category-filter" className="sr-only">Category</label>
          <select
            id="category-filter"
            value={category}
            onChange={(event) => applyParam('category', event.target.value)}
            className={selectClass}
          >
            <option value="">All categories</option>
            {LISTING_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          {/* Animals type only narrows an Animals search, so it appears with that category. */}
          {category === Animals_CATEGORY && (
            <>
              <label htmlFor="Animals-type-filter" className="sr-only">Animals type</label>
              <select
                id="Animals-type-filter"
                value={AnimalsType}
                onChange={(event) => applyParam('AnimalsType', event.target.value)}
                className={selectClass}
              >
                <option value="">All Animals types</option>
                {Animals_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </>
          )}
          <label htmlFor="status-filter" className="sr-only">Status</label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => applyParam('status', event.target.value)}
            className={selectClass}
          >
            <option value="">All statuses</option>
            {LISTING_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" label="Loading listings" />
          </div>
        ) : error ? (
          <EmptyState
            title="Something went wrong"
            message={error}
            action={
              <Button variant="primary" size="sm" onClick={fetchListings}>
                Try Again
              </Button>
            }
          />
        ) : result.listings.length === 0 ? (
          <EmptyState
            title="No listings found"
            message="No listings match these filters. Try widening the search."
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {result.listings.map((listing) => (
                <ListingRow
                  key={listing._id}
                  listing={listing}
                  onArchive={(l) => setPendingAction({ type: 'archive', listing: l })}
                  onDelete={(l) => setPendingAction({ type: 'delete', listing: l })}
                  busyId={busyId}
                />
              ))}
            </ul>
            <Pagination
              className="mt-10"
              page={result.pagination.page}
              totalPages={result.pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={dialogConfig?.title}
        message={dialogConfig?.message}
        confirmLabel={dialogConfig?.confirmLabel}
        danger={dialogConfig?.danger}
        loading={actionLoading}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </section>
  );
}