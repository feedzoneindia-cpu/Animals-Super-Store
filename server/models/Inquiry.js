import mongoose from 'mongoose';

export const INQUIRY_STATUSES = ['new', 'read', 'resolved'];
export const INQUIRY_DEFAULT_STATUS = 'new';

const inquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [150, 'Email cannot exceed 150 characters'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [25, 'Phone cannot exceed 25 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [2, 'Subject must be at least 2 characters'],
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [5, 'Message must be at least 5 characters'],
      maxlength: [3000, 'Message cannot exceed 3000 characters'],
    },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      default: INQUIRY_DEFAULT_STATUS,
      index: true,
    },
  },
  { timestamps: true }
);

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ email: 1 });

export default mongoose.model('Inquiry', inquirySchema);
