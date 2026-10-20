import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Spinner from '../components/common/Spinner.jsx';
import CountUp from '../components/common/CountUp.jsx';
import { adminService } from '../services/adminService.js';
import { BarChart, ChartCard, PieChart } from '../components/admin/AdminCharts.jsx';
import useSEO from '../hooks/useSEO.js';
import { formatDate, formatPrice } from '../utils/format.js';
import { LISTING_STATUS_STYLES } from '../constants/listings.js';
import { REPORT_STATUS_STYLES } from '../constants/reports.js';

/** Same colours as the status dots on the Reports page. */
const REPORT_COLORS = {
  open: '#ef4444',
  reviewed: '#f59e0b',
  resolved: 'var(--color-brand-500)',
  dismissed: '#9ca3af',
};
const LISTING_COLORS = {
  active: 'var(--color-brand-500)',
  sold: '#f59e0b',
  archived: '#9ca3af',
};

const INQUIRY_COLORS = {
  new: '#ef4444',
  read: '#f59e0b',
  resolved: 'var(--color-brand-500)',
};

function StatCard({ label, value, hint, to }) {
  return (
    <div className="card-lift rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">
        <CountUp value={value} />
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {to && (
        <Link to={to} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
          View all →
        </Link>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useSEO({ title: 'Admin Dashboard', noindex: true });

  useEffect(() => {
    let cancelled = false;
    adminService
      .getStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label="Loading dashboard" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Something went wrong"
        message={error}
        action={<Button variant="primary" size="sm" onClick={() => window.location.reload()}>Try Again</Button>}
      />
    );
  }

  const analytics = {
    reportsByStatus: stats.analytics?.reportsByStatus ?? {},
    listingsByCategory: stats.analytics?.listingsByCategory ?? {},
    listingsByMonth: stats.analytics?.listingsByMonth ?? [],
    inquiriesByStatus: stats.analytics?.inquiriesByStatus ?? {},
    usersByMonth: stats.analytics?.usersByMonth ?? [],
  };

  return (
    <section>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Overview of users, listings, blogs, and reports.</p>
      </div>

      {/* Stat cards */}
      <div className="stagger mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Users" value={stats.users.total} hint={`${stats.users.blocked} blocked`} to="/admin/users" />
        <StatCard label="Listings" value={stats.listings.total} hint={`${stats.listings.active} active · ${stats.listings.sold} sold`} to="/admin/listings" />
        <StatCard label="Out of Stock" value={stats.inventory?.outOfStock ?? 0} hint="Purchasable items" to="/admin/listings" />
        <StatCard label="Inquiries" value={stats.inquiries?.total ?? 0} hint={`${stats.inquiries?.new ?? 0} new`} to="/admin/inquiries" />
        <StatCard label="Blogs" value={stats.blogs.total} hint={`${stats.blogs.published} published`} to="/admin/blog" />
        <StatCard label="Reports" value={stats.reports.total} hint={`${stats.reports.open} open`} to="/admin/reports" />
      </div>

      {/* Analytics */}
      <div className="mt-8">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">Analytics</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <ChartCard title="Reports by Status" subtitle="Share of reports in each review stage">
            <PieChart
              centerLabel="Reports"
              data={['open', 'reviewed', 'resolved', 'dismissed'].map((s) => ({
                label: s,
                value: analytics.reportsByStatus[s] ?? 0,
                color: REPORT_COLORS[s],
              }))}
            />
          </ChartCard>

          <ChartCard title="Listings by Status" subtitle="Active, sold and archived listings">
            <PieChart
              centerLabel="Listings"
              data={['active', 'sold', 'archived'].map((s) => ({
                label: s,
                value: stats.listings[s] ?? 0,
                color: LISTING_COLORS[s],
              }))}
            />
          </ChartCard>

          <ChartCard title="Listings by Category" subtitle="Number of listings in each category">
            <BarChart
              data={Object.entries(analytics.listingsByCategory).map(([label, value]) => ({ label, value }))}
            />
          </ChartCard>

          <ChartCard title="New Listings per Month" subtitle="Last 6 months">
            <BarChart color="var(--color-brand-700)" data={analytics.listingsByMonth.map((m) => ({ label: m.label, value: m.count }))} />
          </ChartCard>

          <ChartCard title="Inquiries by Status" subtitle="New, read and resolved inquiries">
            <PieChart
              centerLabel="Inquiries"
              data={['new', 'read', 'resolved'].map((s) => ({
                label: s,
                value: analytics.inquiriesByStatus[s] ?? 0,
                color: INQUIRY_COLORS[s],
              }))}
            />
          </ChartCard>

          <ChartCard title="New Users per Month" subtitle="Last 6 months">
            <BarChart color="var(--color-brand-400)" data={analytics.usersByMonth.map((m) => ({ label: m.label, value: m.count }))} />
          </ChartCard>
        </div>
      </div>

      {/* Recent listings + recent reports */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-900">Recent Listings</h2>
            <Link to="/admin/listings" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              View all →
            </Link>
          </div>
          {stats.recentListings.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No listings yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.recentListings.map((listing) => (
                <li key={listing._id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{listing.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatPrice(listing.price)} · {formatDate(listing.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${LISTING_STATUS_STYLES[listing.status]}`}>
                    {listing.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-900">Recent Reports</h2>
            <Link to="/admin/reports" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              View all →
            </Link>
          </div>
          {stats.recentReports.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No reports — nothing flagged.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.recentReports.map((report) => (
                <li key={report._id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {report.reason}
                      <span className="font-normal text-gray-500"> — {report.listing?.title ?? 'deleted listing'}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      by {report.reporter?.name ?? 'unknown'} · {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${REPORT_STATUS_STYLES[report.status]}`}>
                    {report.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
