import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import useSEO from '../hooks/useSEO.js';
import { orderService } from '../services/orderService.js';
import { formatPrice, formatDate } from '../utils/format.js';
import Spinner from '../components/common/Spinner.jsx';
import Button, { buttonStyles } from '../components/common/Button.jsx';
import ImageWithFallback from '../components/common/ImageWithFallback.jsx';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * The title is what browser history, bookmarks and shared links show, so an
   * order we could not load must never be labelled "Confirmed".
   */
  const pageTitle = error
    ? 'Order Not Found'
    : order
      ? `Order #${order.orderNumber} Confirmed`
      : 'Order Details';

  useSEO({
    title: pageTitle, noindex: true,
    description: 'Order receipt and confirmation details.',
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    orderService
      .getOrderById(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to retrieve order details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading order details…" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white py-16">
        <div className="mx-auto max-w-lg px-4 text-center">
          <div className="rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Order Not Found</h1>
            <p className="mt-2 text-sm text-gray-600">
              {error || `We could not find an order with the reference "${orderId}".`}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Please check the order reference, or contact us and we will look it up for you.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link to="/shop" className={buttonStyles({ size: 'sm' })}>
                Back to Shop
              </Link>
              <Link to="/contact" className={buttonStyles({ variant: 'outline', size: 'sm' })}>
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const paymentLabelMap = {
    cod: 'Cash on Delivery (Pay upon arrival)',
    pickup: 'Store Pickup (Pay at counter)',
    bank_transfer: 'Direct Bank Wire / Invoice',
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Header Banner */}
          <div className="bg-brand-700 p-6 text-center text-white sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-2xl font-bold text-brand-900">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Order Confirmed!</h1>
            <p className="mt-1 text-sm text-brand-100">
              Thank you, {order.customer?.name}. We have received your order request.
            </p>
            <p className="mt-2 inline-block rounded-full bg-brand-800 px-4 py-1 text-xs font-mono font-bold text-brand-200">
              Order #{order.orderNumber}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Status & Payment Method */}
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
              <div>
                <span className="text-xs text-gray-500 font-medium">Order Status</span>
                <p className="text-sm font-bold uppercase text-brand-800 mt-0.5">
                  {order.status}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium">Date Placed</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium">Fulfillment Method</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {paymentLabelMap[order.paymentMethod] || order.paymentMethod}
                </p>
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Delivery Destination
              </h2>
              <div className="mt-2 rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{order.customer?.name}</p>
                <p>{order.shippingAddress?.street}</p>
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.postalCode}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  📞 {order.customer?.phone} · ✉️ {order.customer?.email}
                </p>
              </div>
            </div>

            {/* Itemized list */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Ordered Items
              </h2>
              <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-4 p-3.5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                      <ImageWithFallback
                        src={item.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.category} · Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price breakdown */}
            <div className="border-t border-gray-200 pt-4">
              <dl className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold text-gray-900">{formatPrice(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Shipping Fee</dt>
                  <dd className="font-semibold text-gray-900">
                    {order.shippingFee === 0 ? <span className="text-brand-700 font-bold">FREE</span> : formatPrice(order.shippingFee)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                  <dt>Total Amount</dt>
                  <dd className="text-lg font-extrabold text-brand-800">{formatPrice(order.total)}</dd>
                </div>
              </dl>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
              <Link to="/shop" className={buttonStyles({ variant: 'outline', size: 'md' })}>
                ← Continue Shopping
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={buttonStyles({ variant: 'ghost', size: 'md' })}
                >
                  🖨️ Print Receipt
                </button>
                <Link to="/profile" className={buttonStyles({ size: 'md' })}>
                  View in My Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
