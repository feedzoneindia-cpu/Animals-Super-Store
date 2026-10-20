import { z } from 'zod';

export const updateSettingsSchema = z.object({
  shippingFee: z.coerce
    .number({ message: 'Shipping fee must be a number' })
    .min(0, 'Shipping fee cannot be negative')
    .max(100000, 'Shipping fee is too high'),
  freeShippingThreshold: z.coerce
    .number({ message: 'Free shipping threshold must be a number' })
    .min(0, 'Free shipping threshold cannot be negative')
    .max(10000000, 'Free shipping threshold is too high'),
  acceptingOrders: z.boolean({ message: 'acceptingOrders must be true or false' }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
  });

export const deleteAccountSchema = z.object({
  // Required for password accounts (checked in the service); Google-only accounts omit it.
  password: z.string().max(128).optional(),
});
