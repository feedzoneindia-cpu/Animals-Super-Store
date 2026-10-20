import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ImageWithFallback from '../components/common/ImageWithFallback.jsx';
import { STORE_CONTACT } from '../constants/contact.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import useSEO from '../hooks/useSEO.js';
import { cn } from '../utils/cn.js';
import { formatPrice } from '../utils/format.js';
import { buildCartOrderMessage, buildWhatsAppUrl } from '../utils/whatsapp.js';

/** Shared column layout so the heading row and every item row line up. */
const ROW_GRID = 'gap-x-4 gap-y-3 sm:grid sm:grid-cols-[minmax(0,2.6fr)_1fr_120px_1fr_36px]';

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

export default function Cart() {
  useSEO({
    title: 'Shopping Cart', noindex: true,
    description:
      'Review your selected Animals feeds, pet supplies, and accessories before checking out.',
  });

  const { items, updateQuantity, removeFromCart, clearCart, subtotal, shippingFee, total, freeShippingThreshold } = useCart();
  const { user } = useAuth();

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  /**
   * WhatsApp ordering is the cart's only action: it opens the store's WhatsApp
   * with the selected items, quantities and totals already written out, so the
   * customer can confirm stock, delivery and payment on chat.
   */
  const whatsappOrderUrl = buildWhatsAppUrl(
    STORE_CONTACT.whatsapp,
    buildCartOrderMessage({
      items,
      subtotal,
      shippingFee,
      total,
      customerName: user?.name || '',
    })
  );

  if (items.length === 0) {
    return (
      <div className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <EmptyState
            title="Your shopping cart is empty"
            message="You haven't added any Animals food or pet supplies to your cart yet."
            action={
              <Link to="/shop" className={buttonStyles({ size: 'md' })}>
                Explore Shop Products
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Shopping Cart
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {items.length} {items.length === 1 ? 'item' : 'items'} in your cart.
            </p>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-red-600 shadow-xs transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:self-auto"
          >
            <TrashIcon />
            Clear Shopping Cart
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4">
          {remainingForFreeShipping > 0 ? (
            <p className="text-xs font-medium text-brand-900">
              Add <span className="font-bold">{formatPrice(remainingForFreeShipping)}</span> more of feeds or supplies to unlock <strong>Free Standard Shipping</strong>!
            </p>
          ) : (
            <p className="text-xs font-bold text-brand-800">
              🎉 Congratulations! Your order qualifies for <strong>Free Standard Shipping</strong>.
            </p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Cart Items List */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {/* Column headings (tablet and up) */}
              <div className={cn(ROW_GRID, 'hidden bg-gray-50 px-6 py-3 text-sm font-semibold text-gray-700 sm:grid')}>
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Subtotal</span>
                <span aria-hidden="true" />
              </div>

              <ul className="divide-y divide-gray-200">
                {items.map((item) => {
                  const atMax = item.quantity >= (item.stockQuantity ?? 999);
                  return (
                    <li key={item.id} className={cn(ROW_GRID, 'grid-cols-2 p-4 sm:items-center sm:p-6')}>
                      {/* Product */}
                      <div className="col-span-2 flex items-center gap-4 sm:col-span-1">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-20 sm:w-20">
                          <ImageWithFallback src={item.image} alt={item.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/listings/${item.slug}`}
                            className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-brand-700"
                          >
                            {item.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-gray-500">{item.category}</p>
                        </div>
                      </div>

                      {/* Price */}
                      <p className="text-sm font-semibold text-gray-900">
                        <span className="mr-1 text-xs font-medium text-gray-500 sm:hidden">Price:</span>
                        {formatPrice(item.price)}
                      </p>

                      {/* Quantity */}
                      <div className="inline-flex h-9 w-fit items-stretch overflow-hidden rounded-full border border-gray-200 bg-white ml-[-25px]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex w-9 items-center justify-center text-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="flex w-10 items-center justify-center border-x border-gray-200 text-sm font-semibold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={atMax}
                          className="flex w-9 items-center justify-center text-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal */}
                      <p className="text-sm font-bold text-gray-900">
                        <span className="mr-1 text-xs font-medium text-gray-500 sm:hidden">Subtotal:</span>
                        {formatPrice(item.price * item.quantity)}
                      </p>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 sm:col-span-1 sm:w-9 sm:px-0"
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <TrashIcon />
                        <span className="sm:hidden">Remove</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-4">
              <Link to="/shop" className={buttonStyles({ variant: 'outline', size: 'sm' })}>
                ← Continue Browsing Shop
              </Link>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                Order Summary
              </h2>

              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <dt>Items</dt>
                  <dd className="font-semibold text-gray-900">
                    {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
                    {items.length !== totalUnits && (
                      <span className="font-normal text-gray-500">
                        {' '}
                        ({items.length} {items.length === 1 ? 'product' : 'products'})
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold text-gray-900">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Estimated Shipping</dt>
                  <dd className="font-semibold text-gray-900">
                    {shippingFee === 0 ? (
                      <span className="text-brand-700 font-bold">FREE</span>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
                  <dt>Total Amount</dt>
                  <dd className="text-xl font-extrabold text-brand-800">{formatPrice(total)}</dd>
                </div>
              </dl>

              <div className="mt-6">
                <a
                  href={whatsappOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-success-600 px-6 py-2.5 text-sm font-semibold text-success-700 transition-all duration-200 hover:bg-success-50 active:scale-[0.98]"
                >
                  💬 Or order on WhatsApp
                </a>
              </div>

              <div className="mt-4 space-y-2 text-[11px] leading-4 text-gray-500">
                <p>✓ Checkout confirms your delivery address and creates the order.</p>
                <p>✓ Cash on Delivery (COD) & Store Pickup supported — no online payment.</p>
                <p>✓ Prefer to chat first? WhatsApp sends your cart pre-filled.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}