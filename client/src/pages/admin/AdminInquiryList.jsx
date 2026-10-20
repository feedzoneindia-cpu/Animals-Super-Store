import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { inquiryService } from '../../services/inquiryService.js';
import useSEO from '../../hooks/useSEO.js';
import { formatDate } from '../../utils/format.js';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { value: 'all', label: 'All Inquiries' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'resolved', label: 'Resolved' },
];

const STATUS_STYLES = {
  new: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-700/20',
  read: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-700/20',
  resolved: 'bg-success-50 text-success-700 ring-1 ring-inset ring-success-700/20',
};

function InquiryCard({ inquiry, busy, onStatusChange, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                STATUS_STYLES[inquiry.status] || 'bg-gray-100 text-gray-700'
              }`}
            >
              {inquiry.status}
            </span>
            <span className="text-xs text-gray-500">
              Received {formatDate(inquiry.createdAt)}
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900">{inquiry.subject}</h3>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={`Update status for inquiry from ${inquiry.name}`}
            value={inquiry.status}
            disabled={busy}
            onChange={(e) => onStatusChange(inquiry._id, e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700 disabled:opacity-50"
          >
            <option value="new">Status: New</option>
            <option value="read">Status: Read</option>
            <option value="resolved">Status: Resolved</option>
          </select>

          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(inquiry._id)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 focus:outline-none disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Customer details bar */}
      <div className="mt-4 flex flex-wrap items-center gap-y-1 gap-x-4 border-t border-gray-100 pt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1.5 font-medium text-gray-900">
          <span className="text-gray-400">From:</span> {inquiry.name}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Email:</span>
          <a
            href={`mailto:${inquiry.email}`}
            className="font-medium text-brand-700 hover:text-brand-800 underline"
          >
            {inquiry.email}
          </a>
        </div>
        {inquiry.phone && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Phone:</span>
            <a
              href={`tel:${inquiry.phone.replace(/[^0-9+]/g, '')}`}
              className="font-medium text-brand-700 hover:text-brand-800 underline"
            >
              {inquiry.phone}
            </a>
          </div>
        )}
      </div>

      {/* Message content */}
      <div className="mt-4 rounded-xl bg-gray-50/75 p-4 text-sm leading-relaxed text-gray-700">
        <p className={expanded ? '' : 'line-clamp-3'}>{inquiry.message}</p>
        {inquiry.message.length > 250 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            {expanded ? 'Show less' : 'Read full message →'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminInquiryList() {
  useSEO({
    title: 'Manage Customer Inquiries · Admin',
    noindex: true,
    description: 'Review and manage customer questions and contact inquiries.',
  });

  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Default view is New inquiries; "all" is an explicit choice kept in the URL.
  const currentStatus = searchParams.get('status') || 'new';
  const currentSearch = searchParams.get('q') || '';
  const currentPage = Number(searchParams.get('page')) || 1;

  const [inquiries, setInquiries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, totalPages: 1, totalResults: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inquiryService.getInquiries({
        status: currentStatus !== 'all' ? currentStatus : undefined,
        q: currentSearch || undefined,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      setInquiries(data.inquiries || []);
      setPagination(data.pagination || { page: 1, limit: PAGE_SIZE, totalPages: 1, totalResults: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [currentStatus, currentSearch, currentPage]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== 'page') next.delete('page');
      return next;
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('q', searchTerm.trim());
  };

  const handleStatusChange = async (id, newStatus) => {
    setBusyId(id);
    try {
      await inquiryService.updateInquiryStatus(id, newStatus);
      setInquiries((prev) =>
        prev.map((inq) => (inq._id === id ? { ...inq, status: newStatus } : inq))
      );
      toast(`Inquiry marked as ${newStatus}`);
    } catch (err) {
      toast(err.message || 'Unable to update inquiry status', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer inquiry?')) return;
    setBusyId(id);
    try {
      await inquiryService.deleteInquiry(id);
      setInquiries((prev) => prev.filter((inq) => inq._id !== id));
      setPagination((prev) => ({ ...prev, totalResults: Math.max(0, prev.totalResults - 1) }));
      toast('Inquiry deleted successfully');
    } catch (err) {
      toast(err.message || 'Failed to delete inquiry', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Customer Inquiries
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review, respond to, and manage contact requests submitted through the storefront.
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
          {STATUS_TABS.map((tab) => {
            const active = currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => updateParam('status', tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, subject…"
            className="w-full sm:w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
          {currentSearch && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                updateParam('q', '');
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-800">{error}</p>
          <Button onClick={fetchInquiries} size="sm" variant="secondary" className="mt-3">
            Try Again
          </Button>
        </div>
      ) : inquiries.length === 0 ? (
        <EmptyState
          title="No customer inquiries found"
          description={
            currentStatus !== 'new' || currentSearch
              ? 'Try changing or clearing your search or status filter.'
              : 'New contact form submissions will appear here.'
          }
          actionLabel={currentStatus !== 'new' || currentSearch ? 'Reset Filters' : undefined}
          onAction={() => {
            setSearchTerm('');
            setSearchParams({});
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {inquiries.map((inquiry) => (
              <InquiryCard
                key={inquiry._id}
                inquiry={inquiry}
                busy={busyId === inquiry._id}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pt-4">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalResults={pagination.totalResults}
                pageSize={pagination.limit}
                onPageChange={(p) => updateParam('page', p)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}