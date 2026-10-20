import mongoose from 'mongoose';
import { Animals_CATEGORY } from '../constants/listings.js';

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
export const PAYMENT_METHODS = ['cod', 'pickup', 'bank_transfer', 'inquiry'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed'];

const orderItemSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    image: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
      validate: {
        validator: (v) => v !== Animals_CATEGORY,
        message: 'Live Animalss cannot be purchased via automated cart.',
      },
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customer: {
      name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Customer email is required'],
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: [true, 'Customer phone number is required'],
        trim: true,
      },
    },
    shippingAddress: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        trim: true,
        default: '',
      },
      postalCode: {
        type: String,
        required: [true, 'Postal code is required'],
        trim: true,
      },
      country: {
        type: String,
        default: 'India',
        trim: true,
      },
      notes: {
        type: String,
        default: '',
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters'],
      },
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
      index: true,
    },
    inventoryDeducted: {
      type: Boolean,
      default: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.email': 1 });

export default mongoose.model('Order', orderSchema);
