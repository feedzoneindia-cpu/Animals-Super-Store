import mongoose from 'mongoose';

const loginAttemptSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    failures: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export const LoginAttempt = mongoose.models.LoginAttempt ?? mongoose.model('LoginAttempt', loginAttemptSchema);
export default LoginAttempt;
