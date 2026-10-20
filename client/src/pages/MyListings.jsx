import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button, { buttonStyles } from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Pagination from '../components/common/Pagination.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ImageWithFallback from '../components/common/ImageWithFallback.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { listingService } from '../services/listingService.js';
import useSEO from '../hooks/useSEO.js';
import { formatPrice, formatDate } from '../utils/format.js';
import { LISTING_STATUS_STYLES } from '../constants/listings.js';

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'archived', label: 'Archived' },
];

const PAGE_SIZE = 8;

/** A single row in the "My Listings" management list. */
function ManageListingRow({ listing, onAction, busyId }) {
  const busy = busyId === listing._id;
  const { _id, slug, title, price, status, category, location, createdAt, views, images } = listing;

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
      <Link
        to={status === 'archived' ? '/my-listings' : `/listings/${slug}`}
        className="shrink-0"
        aria-label={status === 'archived' ? 'Archived listings are not publicly visible' : `View ${title}`}
      >
        <ImageWithFallback
          src={images?.[0]?.url}
          alt=""
          className="h-24 w-full rounded-lg object-cover sm:w-32"
        />
      </Link>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LISTING_STATUS_STYLES[status]}`}>
            {status}
          </span>
          <span className="text-xs text-gray-500">{category}</span>
        </div>
        <h3 className="mt-1.5 font-semibold text-gray-900">{title}</h3>
        <p className="mt-0.5 text-sm font-bold text-gray-900">{formatPrice(price)}</p>
        <p className="mt-1 text-xs text-gray-500">
          {location} · Posted {formatDate(createdAt)} · {views ?? 0} views
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={`/my-listings/${_id}/edit`}
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Edit
          </Link>
          {status === 'active' && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => onAction('sold', listing)}>
              Mark Sold
            </Button>
          )}
          {status !== 'archived' && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => onAction('archive', listing)}>
              Archive
            </Button>
          )}
          <Button variant="danger" size="sm" disabled={busy} onClick={() => onAction('delete', listing)}>
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function MyListings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'active';
  const page = Number(searchParams.get('page')) || 1;
  const { toast } = useToast();

  useSEO({ title: 'My Listings', noindex: true, description: 'Manage the listings you have posted.' });

  const [result, setResult] = useState({ listings: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { type, listing }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchListings = useCallback(() => {
    setLoading(true);
    setError('');
    listingService
      .getMyListings({ status, page, limit: PAGE_SIZE })
      .then((data) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const switchTab = (nextStatus) => {
    setSearchParams(nextStatus === 'active' ? {} : { status: nextStatus });
  };

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requestAction = (type, listing) => {
    setPendingAction({ type, listing });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { type, listing } = pendingAction;
    setActionLoading(true);
    setBusyId(listing._id);
    try {
      if (type === 'sold') {
        await listingService.markSold(listing._id);
        toast('Listing marked as sold.');
      } else if (type === 'archive') {
        await listingService.archiveListing(listing._id);
        toast('Listing archived.');
      } else if (type === 'delete') {
        await listingService.deleteListing(listing._id);
        toast('Listing deleted.');
      }
      setPendingAction(null);
      // Stay coherent: refetch and pull the pagination state back if the
      // last item on a page was removed.
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
        sold: {
          title: 'Mark as sold?',
          message: `"${pendingAction.listing.title}" will show a clear Sold state and drop out of public search results. Buyers can still open its page.`,
          confirmLabel: 'Mark as Sold',
          danger: false,
        },
        archive: {
          title: 'Archive this listing?',
          message: `"${pendingAction.listing.title}" will be hidden from public search and its page will no longer be accessible. You can still see it under the Archived tab.`,
          confirmLabel: 'Archive Listing',
          danger: false,
        },
        delete: {
          title: 'Delete this listing?',
          message: `"${pendingAction.listing.title}" will be permanently deleted, along with its images. This cannot be undone.`,
          confirmLabel: 'Delete Listing',
          danger: true,
        },
      }[pendingAction.type]
    : null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Listings</h1>
          <p className="mt-2 text-sm text-gray-600">Manage everything you've posted.</p>
        </div>
        <Link to="/post-listing" className={buttonStyles({ size: 'sm' })}>
          + Post a Listing
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Listing status">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => switchTab(tab.value)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
              status === tab.value
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" label="Loading your listings" />
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
            title={
              status === 'active'
                ? 'No active listings'
                : status === 'sold'
                  ? 'Nothing sold yet'
                  : 'Nothing archived'
            }
            message={
              status === 'active'
                ? "Your posted listings will appear here. When you haven't posted anything yet, get started!"
                : `You have no ${status} listings.`
            }
            action={
              status === 'active' ? (
                <Link to="/post-listing" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                  Post your first listing
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="space-y-4">
              {result.listings.map((listing) => (
                <ManageListingRow
                  key={listing._id}
                  listing={listing}
                  onAction={requestAction}
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
