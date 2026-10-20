import mongoose from 'mongoose';

const BLOG_STATUSES = ['draft', 'published', 'archived'];

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [150, 'Title must be at most 150 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      trim: true,
      minlength: [10, 'Excerpt must be at least 10 characters'],
      maxlength: [300, 'Excerpt must be at most 300 characters'],
    },
    // Sanitized HTML produced by the rich text editor.
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    coverImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category must be at most 50 characters'],
      default: 'General',
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => Array.isArray(tags) && tags.length <= 8,
        message: 'A blog can have at most 8 tags',
      },
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1 });

export default mongoose.model('Blog', blogSchema);
