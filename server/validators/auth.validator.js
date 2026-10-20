import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password,
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, 'Please provide a valid phone number')
    .optional()
    .or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, 'Please provide a valid phone number')
    .optional()
    .or(z.literal('')),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, 'Reset link is invalid or has expired'),
  password,
});

export const googleLoginSchema = z.object({
  credential: z.string().trim().min(20, 'Google credential is missing'),
});
