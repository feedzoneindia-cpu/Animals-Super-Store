import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must be at most 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Never selected by default; login explicitly uses select('+password').
    // select: false also keeps it out of every JSON response.
    password: {
      type: String,
      // Accounts created through Google Sign-In have no password.
      required: [
        function passwordRequired() {
          return !this.googleId;
        },
        'Password is required',
      ],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    // Set for accounts created with / linked to Google Sign-In (Google's stable user id).
    googleId: { type: String, unique: true, sparse: true, index: true },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
    },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    // Forgot-password flow. Only the SHA-256 hash of the emailed token is
    // stored, so a database leak cannot be used to reset anyone's password.
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// The unique index on email is created by `unique: true` on the field above.

// Hash on save so a password can never reach the database in plain text,
// regardless of which code path creates or updates the user.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false); // Google-only account
  return bcrypt.compare(candidate, this.password);
};

/** Public representation of a user — never includes the password. */
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    status: this.status,
    avatar: this.avatar,
    hasGoogle: Boolean(this.googleId),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model('User', userSchema);
