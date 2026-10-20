import mongoose from 'mongoose';
import { REPORT_DEFAULT_STATUS, REPORT_REASONS, REPORT_STATUSES } from '../constants/reports.js';

const reportSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing is required'],
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
      index: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: [true, 'Reason is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: REPORT_DEFAULT_STATUS,
    },
  },
  { timestamps: true }
);

// Admin workflow: list by status, newest first.
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);
