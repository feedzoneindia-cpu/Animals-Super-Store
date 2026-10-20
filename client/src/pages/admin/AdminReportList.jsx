import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { adminService } from '../../services/adminService.js';
import useSEO from '../../hooks/useSEO.js';
import { formatDate } from '../../utils/format.js';
import { REPORT_STATUSES, REPORT_STATUS_STYLES } from '../../constants/reports.js';
import { LISTING_STATUS_STYLES } from '../../constants/listings.js';

const PAGE_SIZE = 10;

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const SORTS = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
];

/** "Today, 10:24 AM" / "Yesterday, 4:32 PM" / "12 Sep 2026, 4:32 PM". */
function formatReportedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  const day = formatDate(value);
  const label =
    day === 'Today' || day === 'Yesterday'
      ? day
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${label}, ${time}`;
}

function DotsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

const MENU_ITEM =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:bg-brand-50 focus-visible:outline-none disabled:opacity-50';

const STATUS_DOT = {
  open: 'bg-red-500',
  reviewed: 'bg-amber-500',
  resolved: 'bg-brand-500',
  dismissed: 'bg-gray-400',
};

/** Three-dot menu (visible on card hover) holding every status update option. */
function ReportMenu({ report, open, onOpenChange, onStatusChange, busy }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) onOpenChange(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={wrapRef}
      className={`absolute right-3 top-3 z-20 transition-opacity duration-200 [@media(hover:none)]:opacity-100 ${
        open ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
      }`}
    >
      <button
        type="button"
        aria-label="Update report status"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-sm transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      >
        <DotsIcon />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Update status"
          className="absolute right-0 top-full mt-2 w-52 origin-top-right animate-scale-in rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
        >
          <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Update status</p>
          {REPORT_STATUSES.filter((s) => s !== report.status).map((s) => (
            <button
              key={s}
              type="button"
              role="menuitem"
              disabled={busy}
              className={MENU_ITEM}
              onClick={() => {
                onOpenChange(false);
                onStatusChange(report, s);
              }}
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} aria-hidden="true" />
              Mark {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A single report row: what was reported, by whom, and status actions. The whole row opens the listing. */
function ReportRow({ report, busyId, onStatusChange, menuOpen, onMenuOpenChange }) {
  const busy = busyId === report._id;
  const listing = report.listing;
  const imageUrl = listing?.images?.[0]?.url;
  const imageCount = listing?.images?.length ?? 0;
  const listingCode = listing?._id ? `#${String(listing._id).slice(-6).toUpperCase()}` : '—';

  return (
    <li
      className={`group relative flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-brand-700/30 hover:shadow-md sm:flex-row ${
        menuOpen ? 'z-30' : 'z-0'
      } ${busy ? 'opacity-70' : ''}`}
    >
      {imageUrl ? (
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-auto sm:min-h-24 sm:w-32">
          <ImageWithFallback
            src={imageUrl}
            optimize={400}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {imageCount > 0 && (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-gray-900/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
              {imageCount} photo{imageCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ) : (
        <div className="hidden min-h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 sm:flex">
          No image
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="sm:pr-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${REPORT_STATUS_STYLES[report.status]}`}>
            {report.status}
          </span>
          <span className="text-xs font-semibold text-gray-700">{report.reason}</span>
        </div>
        <p className="mt-1.5 text-sm text-gray-900">
          {listing ? (
            <>
              Reported{' '}
              <Link
                to={listing.status === 'archived' ? '/admin/listings' : `/listings/${listing.slug}`}
                className="font-semibold text-brand-700 after:absolute after:inset-0 after:z-10 after:rounded-2xl hover:text-brand-800 focus-visible:outline-none"
              >
                {listing.title}
              </Link>{' '}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${LISTING_STATUS_STYLES[listing.status]}`}>
                {listing.status}
              </span>
            </>
          ) : (
            'Reported a listing that has since been deleted'
          )}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          by {report.reporter?.name ?? 'unknown user'} ({report.reporter?.email ?? '—'}) · {formatDate(report.createdAt)}
        </p>
        </div>
        {report.description && (
          <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-600">
            {report.description}
          </p>
        )}
        <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          <span>
            Reported: <span className="font-medium text-gray-800">{formatReportedAt(report.createdAt)}</span>
          </span>
          <span>
            Listing ID: <span className="font-medium text-gray-800">{listingCode}</span>
          </span>
        </p>
      </div>

      <ReportMenu
        report={report}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onStatusChange={onStatusChange}
        busy={busy}
      />
    </li>
  );
}

export default function AdminReportList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || 'open';
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest';
  const page = Number(searchParams.get('page')) || 1;
  const { toast } = useToast();

  useSEO({ title: 'Reports', noindex: true });

  const [result, setResult] = useState({ reports: [], pagination: null });
  const [counts, setCounts] = useState(null); // { open, reviewed, resolved, dismissed }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const fetchReports = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: PAGE_SIZE };
    if (status !== 'all') params.status = status;
    if (sort === 'oldest') params.sort = 'oldest';
    adminService
      .getReports(params)
      .then((data) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, sort, page]);

  /** Per-status totals for the tabs (one tiny request per status). */
  const fetchCounts = useCallback(() => {
    Promise.all(
      REPORT_STATUSES.map((s) =>
        adminService.getReports({ status: s, page: 1, limit: 1 }).then((data) => [s, data.pagination?.totalResults ?? 0])
      )
    )
      .then((entries) => setCounts(Object.fromEntries(entries)))
      .catch(() => setCounts(null)); // counts are a nicety — hide them on failure
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusChange = async (report, nextStatus) => {
    if (!nextStatus) return;
    setBusyId(report._id);
    try {
      await adminService.updateReportStatus(report._id, nextStatus);
      toast(`Report marked as ${nextStatus}.`);
      fetchReports();
      fetchCounts();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const totalCount = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : null;
  const countFor = (value) => (value === 'all' ? totalCount : counts?.[value]);

  return (
    <section>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-600">
          Reports users file against listings. Review each one and update its status; use
          listing management to archive or delete problem listings.
        </p>
      </div>

      {/* Status tabs (underline on the current tab) + sort */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-gray-200">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Report status">
          {TABS.map((tab) => {
            const active = status === tab.value;
            const count = countFor(tab.value);
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setParam('status', tab.value)}
                className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
                  active
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {count != null && <span className={`ml-1.5 ${active ? 'text-brand-700/80' : 'text-gray-400'}`}>({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pb-2">
          <label htmlFor="report-sort" className="text-sm text-gray-500">
            Sort by:
          </label>
          <select
            id="report-sort"
            value={sort}
            onChange={(event) => setParam('sort', event.target.value === 'latest' ? '' : event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:border-brand-700 focus:outline-none"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" label="Loading reports" />
          </div>
        ) : error ? (
          <EmptyState
            title="Something went wrong"
            message={error}
            action={
              <Button variant="primary" size="sm" onClick={fetchReports}>
                Try Again
              </Button>
            }
          />
        ) : result.reports.length === 0 ? (
          <EmptyState
            title={status !== 'all' ? `No ${status} reports` : 'No reports yet'}
            message={
              status !== 'all'
                ? `There are no reports with status "${status}" right now.`
                : 'When users report listings, the reports will appear here for review.'
            }
          />
        ) : (
          <>
            <ul className="space-y-3">
              {result.reports.map((report) => (
                <ReportRow
                  key={report._id}
                  report={report}
                  busyId={busyId}
                  onStatusChange={handleStatusChange}
                  menuOpen={openMenuId === report._id}
                  onMenuOpenChange={(next) => setOpenMenuId(next ? report._id : null)}
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
    </section>
  );
}