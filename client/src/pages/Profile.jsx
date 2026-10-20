import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/common/Button.jsx';
import ImageWithFallback from '../components/common/ImageWithFallback.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useSEO from '../hooks/useSEO.js';
import { orderService } from '../services/orderService.js';
import { formatDate, formatPrice } from '../utils/format.js';

function formatRole(role) {
  return role === 'ADMIN' ? 'Admin' : 'Customer';
}

const ORDER_STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-brand-50 text-brand-800 border-brand-200',
  processing: 'bg-accent-50 text-accent-700 border-accent-200',
  completed: 'bg-success-50 text-success-800 border-success-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export default function Profile() {
  const { user } = useAuth();

  useSEO({
    title: 'My Account', noindex: true,
    description: 'Manage your Animals Super Store customer account and view your order history.',
  });

  // Orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (user) {
      setLoadingOrders(true);
      orderService
        .getMyOrders()
        .then((data) => {
          if (!cancelled) setOrders(data.orders || []);
        })
        .catch((err) => {
          if (!cancelled) setOrdersError(err.message || 'Unable to load orders.');
        })
        .finally(() => {
          if (!cancelled) setLoadingOrders(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const initial = user.name?.charAt(0).toUpperCase() ?? '?';
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
    : '';

  const isAdmin = user.role === 'ADMIN';

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">My Account</h1>
          <p className="mt-1 text-sm text-gray-600">Track your order history and manage your customer details.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/settings/account" className={buttonStyles({ variant: 'outline', size: 'sm' })}>
            ⚙️ Settings
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-900"
            >
              ⚙ Go to Admin Dashboard
            </Link>
          )}
        </div>
      </div>

      {/* Account summary banner */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {user.avatar?.url ? (
          <ImageWithFallback src={user.avatar.url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-800" aria-hidden="true">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-600">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
              {formatRole(user.role)}
            </span>
            {memberSince && <span className="text-xs text-gray-500">Member since {memberSince}</span>}
          </div>
        </div>
      </div>

      <h2 className="mt-8 border-b border-gray-200 pb-3 text-sm font-semibold text-brand-700">
        My Orders ({orders.length})
      </h2>

      {/* Orders */}
      {(
        <div className="mt-6">
          {loadingOrders ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Spinner size="md" label="Loading orders…" />
            </div>
          ) : ordersError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {ordersError}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-sm font-medium text-gray-600">You have not placed any orders yet.</p>
              <div className="mt-4">
                <Link to="/shop" className={buttonStyles({ size: 'sm' })}>
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-mono font-bold text-gray-900">
                        Order #{order.orderNumber}
                      </span>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          ORDER_STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                      <Link
                        to={`/order-success/${order.orderNumber}`}
                        className="text-xs font-semibold text-brand-700 hover:underline"
                      >
                        View Receipt →
                      </Link>
                    </div>
                  </div>

                  <ul className="mt-4 divide-y divide-gray-100">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-4 py-2.5">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                          <ImageWithFallback src={item.image} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                          <p className="text-[11px] text-gray-500">Qty: {item.quantity} · {formatPrice(item.price)}</p>
                        </div>
                        <p className="text-xs font-bold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex justify-between border-t border-gray-100 pt-3 text-sm">
                    <span className="font-medium text-gray-600">Total</span>
                    <span className="font-extrabold text-brand-800">{formatPrice(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </section>
  );
}
