import { formatPrice } from './format.js';

/**
 * WhatsApp is the store's ordering channel: the same `wa.me` deep link backs the
 * "Chat on WhatsApp" entry points on the Contact page, on listing details, and
 * on the cart. Keeping the URL construction here means the number is normalised
 * one way everywhere.
 */

/** Builds a `wa.me` deep link. `number` may contain `+`, spaces, or dashes. */
export function buildWhatsAppUrl(number, message) {
  const digits = String(number ?? '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Long carts would otherwise produce an unwieldy URL and a wall of text in the
 * chat, so only the first few lines are listed — the totals below always cover
 * the whole cart.
 */
const MAX_LISTED_ITEMS = 15;

/**
 * The message pre-filled into the customer's WhatsApp when they order from the
 * cart: every selected item with its quantity and line total, then the order
 * totals, so the conversation opens with the full requirement already on screen.
 */
export function buildCartOrderMessage({
  items = [],
  subtotal = 0,
  shippingFee = 0,
  total = 0,
  customerName = '',
}) {
  const lines = ['Hello Animals Super Store! I would like to purchase these items:', ''];

  items.slice(0, MAX_LISTED_ITEMS).forEach((item, index) => {
    const quantity = Number(item.quantity) || 1;
    const lineTotal = (Number(item.price) || 0) * quantity;
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`   ${quantity} × ${formatPrice(item.price)} = ${formatPrice(lineTotal)}`);
  });

  const hidden = items.length - MAX_LISTED_ITEMS;
  if (hidden > 0) {
    lines.push(`…and ${hidden} more item${hidden === 1 ? '' : 's'}.`);
  }

  lines.push('');
  lines.push(`Subtotal: ${formatPrice(subtotal)}`);
  lines.push(`Shipping: ${shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}`);
  lines.push(`Total: ${formatPrice(total)}`);

  if (customerName) {
    lines.push('');
    lines.push(`Name: ${customerName}`);
  }

  lines.push('');
  lines.push('Please confirm availability and delivery.');

  return lines.join('\n');
}
