import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import ImageWithFallback from '../components/common/ImageWithFallback.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useSEO from '../hooks/useSEO.js';
import { orderService } from '../services/orderService.js';
import { formatPrice } from '../utils/format.js';

export default function Checkout() {
  useSEO({
    title: 'Checkout', noindex: true,
    description: 'Provide delivery details and confirm your Animals feed and supplies order.',
  });

  const { items, subtotal, shippingFee, total, clearCart, acceptingOrders } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  /**
   * Set the moment an order is accepted. Clearing the cart empties `items`,
   * which would otherwise trip the "empty cart" redirect below and bounce the
   * customer back to /cart before they ever see their confirmation.
   */
  const orderPlacedRef = useRef(false);

  /**
   * Synchronous in-flight flag. `submitting` state is stale inside the same
   * tick, so two clicks landing together would both pass a state-based check
   * and create two orders; the ref is updated immediately.
   */
  const submittingRef = useRef(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    street: '',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    postalCode: '226021',
    country: 'India',
    notes: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Update form if user logs in during checkout
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  // If cart is empty, redirect to cart — unless the order was just placed,
  // in which case the cart was cleared on purpose and we are navigating to
  // the order confirmation instead.
  useEffect(() => {
    if (items.length === 0 && !orderPlacedRef.current) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Guard against a double submit creating two orders.
    if (submittingRef.current || orderPlacedRef.current) return;

    if (items.length === 0) {
      setFormError('Your cart is empty.');
      return;
    }

    if (!acceptingOrders) {
      setFormError('The store is not accepting new orders right now. Please try again later.');
      return;
    }

    if (!formData.name || !formData.email || !formData.phone || !formData.street || !formData.postalCode) {
      setFormError('Please fill in all required customer and delivery address fields.');
      return;
    }

    setSubmitting(true);
    submittingRef.current = true;

    try {
      const orderPayload = {
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
        customer: {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
        },
        shippingAddress: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim() || 'India',
          notes: formData.notes.trim(),
        },
        paymentMethod,
      };

      const order = await orderService.createOrder(orderPayload);
      orderPlacedRef.current = true;
      clearCart();
      toast(`Order #${order.orderNumber} has been successfully created.`);
      navigate(`/order-success/${order.orderNumber}`);
    } catch (err) {
      setFormError(err.message || 'Failed to place order. Please try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500 mb-6">
          <Link to="/cart" className="hover:text-brand-700">← Back to Shopping Cart</Link>
        </nav>

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Checkout & Delivery
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter your delivery destination and confirm your order.
        </p>

        {formError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Main Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Customer Contact Details */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                  1. Customer Information
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="checkout-name" className="block text-xs font-semibold text-gray-700">
                      Full Name *
                    </label>
                    <input
                      id="checkout-name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-phone" className="block text-xs font-semibold text-gray-700">
                      Phone Number (for delivery updates) *
                    </label>
                    <input
                      id="checkout-phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-email" className="block text-xs font-semibold text-gray-700">
                      Email Address (order invoice & receipt) *
                    </label>
                    <input
                      id="checkout-email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery / Shipping Address */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                  2. Delivery Address
                </h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="checkout-street" className="block text-xs font-semibold text-gray-700">
                      Street Address / House / Farm / Landmark *
                    </label>
                    <input
                      id="checkout-street"
                      name="street"
                      type="text"
                      required
                      value={formData.street}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                      placeholder="House/Plot number, Street, Farm Landmark"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="checkout-city" className="block text-xs font-semibold text-gray-700">
                        City *
                      </label>
                      <input
                        id="checkout-city"
                        name="city"
                        type="text"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-state" className="block text-xs font-semibold text-gray-700">
                        State
                      </label>
                      <input
                        id="checkout-state"
                        name="state"
                        type="text"
                        value={formData.state}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-postal" className="block text-xs font-semibold text-gray-700">
                        PIN / Postal Code *
                      </label>
                      <input
                        id="checkout-postal"
                        name="postalCode"
                        type="text"
                        required
                        value={formData.postalCode}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="checkout-notes" className="block text-xs font-semibold text-gray-700">
                      Delivery Instructions / Bag Loading Notes (Optional)
                    </label>
                    <textarea
                      id="checkout-notes"
                      name="notes"
                      rows={2}
                      value={formData.notes}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                      placeholder="e.g. Leave with security guard or call on arrival"
                    />
                  </div>
                </div>
              </div>

              {/* Payment & Fulfillment Method */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                  3. Fulfillment & Payment Method
                </h2>
                <div className="mt-4 space-y-3">
                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 h-4 w-4 text-brand-700 focus:ring-brand-700"
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Cash on Delivery (COD) / Pay on Delivery</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Pay cash or UPI directly to the courier when your package arrives.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="pickup"
                      checked={paymentMethod === 'pickup'}
                      onChange={() => setPaymentMethod('pickup')}
                      className="mt-1 h-4 w-4 text-brand-700 focus:ring-brand-700"
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Direct Store Pickup</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Pick up your items from our retail store in Lucknow. Pay at counter upon collection.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="mt-1 h-4 w-4 text-brand-700 focus:ring-brand-700"
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Direct Bank Wire / Order Verification</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ideal for bulk or farm orders. An invoice will be generated and our team will contact you.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full text-base py-3"
              >
                {submitting ? 'Placing Order…' : `Place Order · ${formatPrice(total)}`}
              </Button>
            </form>
          </div>

          {/* Sidebar Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sticky top-24">
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                Order Items ({items.length})
              </h2>

              <ul className="mt-4 max-h-72 overflow-y-auto divide-y divide-gray-100 pr-1">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                      <ImageWithFallback
                        src={item.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900">{item.title}</p>
                      <p className="text-[11px] text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="shrink-0 text-xs font-bold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold text-gray-900">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd className="font-semibold text-gray-900">
                    {shippingFee === 0 ? <span className="text-brand-700 font-bold">FREE</span> : formatPrice(shippingFee)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3 text-sm font-bold text-gray-900">
                  <dt>Total</dt>
                  <dd className="text-base text-brand-800">{formatPrice(total)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
