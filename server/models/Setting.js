import mongoose from 'mongoose';

export const SETTINGS_KEY = 'store';

export const SETTING_DEFAULTS = {
  shippingFee: 99,
  freeShippingThreshold: 1000,
  acceptingOrders: true,
};

/**
 * Singleton document holding store-wide settings. `key` is unique so there is
 * only ever one row; it is created lazily with defaults on first read.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: SETTINGS_KEY, unique: true, immutable: true },
    shippingFee: { type: Number, min: 0, max: 100000, default: SETTING_DEFAULTS.shippingFee },
    freeShippingThreshold: {
      type: Number,
      min: 0,
      max: 10000000,
      default: SETTING_DEFAULTS.freeShippingThreshold,
    },
    acceptingOrders: { type: Boolean, default: SETTING_DEFAULTS.acceptingOrders },
  },
  { timestamps: true }
);

export default mongoose.model('Setting', settingSchema);
