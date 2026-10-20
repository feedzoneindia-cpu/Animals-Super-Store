import { useEffect, useState } from 'react';
import useSEO from '../../hooks/useSEO.js';
import { orderService } from '../../services/orderService.js';
import { formatPrice, formatDate } from '../../utils/format.js';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import Pagination from '../../components/common/Pagination.jsx';

const STATUS_FILTERS = [
  { id: '', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const ORDER_STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-brand-50 text-brand-800 border-brand-200',
  processing: 'bg-accent-50 text-accent-700 border-accent-200',
  completed: 'bg-success-50 text-success-800 border-success-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminOrderList() {
  useSEO({ title: 'Manage Orders · Admin', noindex: true });

  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Default view is Pending orders; the "All Orders" tab uses ''.
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    setError('');

    orderService
      .adminListOrders({
        status: statusFilter,
        q: searchTerm,
        page,
        limit: 15,
      })
      .then((data) => {
        setOrders(data.orders || []);
        setPagination(data.pagination);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load orders.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await orderService.adminUpdateOrderStatus(orderId, { status: newStatus });
      toast(`Order status changed to "${newStatus}".`);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      toast(err.message || 'Could not update order status.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manage Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review customer orders, update fulfillment states, and check delivery destinations.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setStatusFilter(f.id);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === f.id
                  ? 'bg-brand-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order #, customer, phone…"
            className="w-full sm:w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-700 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
          >
            Search
          </button>
        </form>
      </div>

      {/* Order List */}
      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner size="lg" label="Loading orders…" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-gray-600">No orders found matching the filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-mono font-bold text-gray-900">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          ORDER_STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Placed on {formatDate(order.createdAt)} · Payment:{' '}
                      <span className="font-semibold uppercase text-gray-700">
                        {order.paymentMethod}
                      </span>
                    </p>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <label htmlFor={`status-${order._id}`} className="text-xs font-medium text-gray-600">
                      Update:
                    </label>
                    <select
                      id={`status-${order._id}`}
                      disabled={updatingId === order._id}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm focus:border-brand-700 focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Customer & Shipping Details */}
                <div className="mt-4 grid grid-cols-1 gap-4 text-xs text-gray-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="font-bold text-gray-900">Customer Details</p>
                    <p className="mt-1 font-semibold text-gray-800">{order.customer?.name}</p>
                    <p>📞 {order.customer?.phone}</p>
                    <p>✉️ {order.customer?.email}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="font-bold text-gray-900">Shipping Destination</p>
                    <p className="mt-1">{order.shippingAddress?.street}</p>
                    <p>
                      {order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.postalCode}
                    </p>
                    {order.shippingAddress?.notes && (
                      <p className="mt-1 text-gray-500 italic">Notes: {order.shippingAddress.notes}</p>
                    )}
                  </div>
                </div>

                {/* Items & Total */}
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-700">Order Items ({order.items.length}):</p>
                  <ul className="mt-1.5 divide-y divide-gray-100 text-xs text-gray-700">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between py-1.5">
                        <span>
                          {item.quantity} × {item.title} <span className="text-gray-400">({item.category})</span>
                        </span>
                        <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex justify-between border-t border-gray-100 pt-2 text-sm font-bold text-gray-900">
                    <span>Total Amount</span>
                    <span className="text-base text-brand-800">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            ))}

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}