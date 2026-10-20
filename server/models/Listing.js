import mongoose from 'mongoose';
import {
    Animals_CATEGORY,
    Animals_GENDERS,
    Animals_TYPES,
    LISTING_CATEGORIES,
    LISTING_DEFAULT_STATUS,
    LISTING_STATUSES,
    MAX_AGE_MONTHS,
    MAX_LISTING_IMAGES,
} from '../constants/listings.js';

/** Animals fields are required only for the "Animalss" category. */
const requiredForAnimalss = function requiredForAnimalss() {
  return this.category === Animals_CATEGORY;
};

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title must be at most 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: LISTING_CATEGORIES,
      required: [true, 'Category is required'],
    },
    // ---------------------------------------------------------------------
    // Animals-specific fields. Populated only when category === 'Animalss';
    // a product listing leaves every one of these undefined, and the
    // validators below stay dormant for it.
    // ---------------------------------------------------------------------
    AnimalsType: {
      type: String,
      enum: {
        values: Animals_TYPES,
        message: `Animals type must be one of: ${Animals_TYPES.join(', ')}`,
      },
      required: [requiredForAnimalss, 'Animals type is required for Animals listings'],
    },
    breed: {
      type: String,
      trim: true,
      maxlength: [60, 'Breed must be at most 60 characters'],
      required: [requiredForAnimalss, 'Breed is required for Animals listings'],
    },
    /** Stored in months so it stays range-filterable; the UI renders the label. */
    ageMonths: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [MAX_AGE_MONTHS, `Age must be at most ${MAX_AGE_MONTHS} months`],
      required: [requiredForAnimalss, 'Age is required for Animals listings'],
    },
    gender: {
      type: String,
      enum: {
        values: Animals_GENDERS,
        message: `Gender must be one of: ${Animals_GENDERS.join(', ')}`,
      },
      required: [requiredForAnimalss, 'Gender is required for Animals listings'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [5000, 'Description must be at most 5000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      max: [10_000_000, 'Price must be at most ₹1,00,00,000'],
    },
    stockQuantity: {
      type: Number,
      min: [0, 'Stock quantity cannot be negative'],
      default: function () {
        return this.category === Animals_CATEGORY ? 0 : 10;
      },
      validate: {
        validator: function (val) {
          if (val === undefined || val === null) return true;
          return Number.isInteger(val) && val >= 0;
        },
        message: 'Stock quantity must be a non-negative integer',
      },
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [100, 'Location must be at most 100 characters'],
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: '' },
        },
      ],
      validate: {
        validator: (images) =>
          Array.isArray(images) && images.length >= 1 && images.length <= MAX_LISTING_IMAGES,
        message: `A listing needs between 1 and ${MAX_LISTING_IMAGES} images`,
      },
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerName: {
      type: String,
      required: [true, 'Seller name is required'],
      trim: true,
      maxlength: [50, 'Seller name must be at most 50 characters'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    additionalDetails: {
      type: String,
      trim: true,
      maxlength: [2000, 'Additional details must be at most 2000 characters'],
      default: '',
    },
    // Only active / sold / archived — there is no approval workflow.
    status: {
      type: String,
      enum: LISTING_STATUSES,
      default: LISTING_DEFAULT_STATUS,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for the common query patterns (search / filter / sort).
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ location: 1, status: 1 });
listingSchema.index({ price: 1, status: 1 });
listingSchema.index({ seller: 1, status: 1 });
// Animals browsing: filter within the Animalss category by type / gender / age.
listingSchema.index({ category: 1, AnimalsType: 1, status: 1 });
listingSchema.index({ category: 1, gender: 1, status: 1 });
listingSchema.index({ category: 1, ageMonths: 1, status: 1 });

export default mongoose.model('Listing', listingSchema);
