import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, googleLogin, logout, getMe, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, anonymousWhenNoCookie } from '../middleware/authenticate.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, googleLoginSchema } from '../validators/auth.validator.js';

// Stricter limit for credential endpoints to slow brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', authLimiter, validate(googleLoginSchema), googleLogin);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/logout', logout);
// A guest with no cookie is an expected state — see anonymousWhenNoCookie.
router.get('/me', anonymousWhenNoCookie, authenticate, getMe);

export default router;
