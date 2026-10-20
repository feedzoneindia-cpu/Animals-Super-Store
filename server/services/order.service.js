import { Animals_CATEGORY } from '../constants/listings.js';
import Listing from '../models/Listing.js';
import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateShippingFee, getSettings } from './setting.service.js';

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ASO-${dateStr}-${randomSuffix}`;
}

export async function createOrder(user, orderData) {
  const { items, customer, shippingAddress, paymentMethod = 'cod' } = orderData;

  const settings = await getSettings();
  if (!settings.acceptingOrders) {
    throw ApiError.badRequest('The store is not accepting new orders right now. Please try again later.');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Order must contain at least one item');
  }

  // Fetch all listings to verify active status and genuine pricing
  const listingIds = items.map((i) => i.listingId || i.listing || i.id);
  const listings = await Listing.find({ _id: { $in: listingIds } });
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  const verifiedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const listingId = String(item.listingId || item.listing || item.id);
    const listing = listingMap.get(listingId);

    if (!listing) {
      throw ApiError.badRequest(`Item with id ${listingId} is no longer available`);
    }

    if (listing.category === Animals_CATEGORY) {
      throw ApiError.badRequest(
        `Live Animalss (${listing.title}) cannot be ordered through the cart. Please contact the seller directly.`
      );
    }

    if (listing.status !== 'active') {
      throw ApiError.badRequest(`Item "${listing.title}" is currently unavailable (${listing.status})`);
    }

    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const availableStock = listing.stockQuantity !== undefined ? listing.stockQuantity : 10;
    if (availableStock < quantity) {
      throw ApiError.badRequest(
        `Insufficient stock for "${listing.title}". Available: ${availableStock}, Requested: ${quantity}`
      );
    }

    const itemTotal = listing.price * quantity;
    subtotal += itemTotal;

    verifiedItems.push({
      listing: listing._id,
      title: listing.title,
      slug: listing.slug,
      price: listing.price,
      quantity,
      image: listing.images?.[0]?.url || '',
      category: listing.category,
    });
  }

  // Shipping rule comes from admin Settings (free above the threshold, else the flat fee)
  const shippingFee = paymentMethod === 'pickup' ? 0 : calculateShippingFee(settings, subtotal);
  const total = subtotal + shippingFee;

  let uniqueOrderNumber = generateOrderNumber();
  let existing = await Order.findOne({ orderNumber: uniqueOrderNumber });
  while (existing) {
    uniqueOrderNumber = generateOrderNumber();
    existing = await Order.findOne({ orderNumber: uniqueOrderNumber });
  }

  // Atomically decrement stock for purchasable items
  const decrementedListings = [];
  try {
    for (const item of verifiedItems) {
      const updatedListing = await Listing.findOneAndUpdate(
        {
          _id: item.listing,
          stockQuantity: { $gte: item.quantity },
        },
        {
          $inc: { stockQuantity: -item.quantity },
        },
        { new: true }
      );

      if (!updatedListing) {
        throw ApiError.badRequest(
          `Item "${item.title}" is out of stock or does not have enough quantity available.`
        );
      }
      decrementedListings.push({ id: item.listing, quantity: item.quantity });
    }

    const order = await Order.create({
      orderNumber: uniqueOrderNumber,
      user: user?._id || null,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state || '',
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'India',
        notes: shippingAddress.notes || '',
      },
      items: verifiedItems,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'pending',
      inventoryDeducted: true,
      subtotal,
      shippingFee,
      total,
    });

    return order;
  } catch (error) {
    // Rollback any successfully decremented items if creation failed
    for (const dec of decrementedListings) {
      await Listing.updateOne(
        { _id: dec.id },
        { $inc: { stockQuantity: dec.quantity } }
      ).catch(() => {});
    }
    throw error;
  }
}

export async function getOrderByIdOrNumber(identifier, user = null) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
  const query = isObjectId
    ? { $or: [{ _id: identifier }, { orderNumber: identifier }] }
    : { orderNumber: identifier };

  const order = await Order.findOne(query).populate('items.listing', 'title slug images price');
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // If user is authenticated and not admin, verify ownership or allow lookup
  if (user && user.role !== 'ADMIN' && order.user && String(order.user) !== String(user._id)) {
    throw ApiError.forbidden('You are not authorized to view this order');
  }

  return order;
}

export async function getMyOrders(user, { page = 1, limit = 10 } = {}) {
  const query = {
    $or: [{ user: user._id }, { 'customer.email': user.email.toLowerCase() }],
  };

  const [orders, totalResults] = await Promise.all([
    Order.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(query),
  ]);

  return {
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(totalResults / limit)),
      totalResults,
    },
  };
}

export async function adminListOrders({ status, q, page = 1, limit = 15 } = {}) {
  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (q) {
    filter.$or = [
      { orderNumber: { $regex: q.trim(), $options: 'i' } },
      { 'customer.name': { $regex: q.trim(), $options: 'i' } },
      { 'customer.email': { $regex: q.trim(), $options: 'i' } },
      { 'customer.phone': { $regex: q.trim(), $options: 'i' } },
    ];
  }

  const [orders, totalResults] = await Promise.all([
    Order.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email'),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(totalResults / limit)),
      totalResults,
    },
  };
}

export async function adminUpdateOrderStatus(orderId, { status, paymentStatus }) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // If order is transitioned to 'cancelled' and inventory was deducted, restore stock once!
  if (status === 'cancelled' && order.status !== 'cancelled' && order.inventoryDeducted) {
    for (const item of order.items) {
      if (item.category !== Animals_CATEGORY && item.listing) {
        await Listing.updateOne(
          { _id: item.listing },
          { $inc: { stockQuantity: item.quantity } }
        ).catch(() => {});
      }
    }
    order.inventoryDeducted = false;
  }

  if (status) {
    order.status = status;
  }
  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
  }

  await order.save();
  return order;
}
