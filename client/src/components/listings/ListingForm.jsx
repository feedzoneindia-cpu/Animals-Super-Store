import { useState } from 'react';
import {
    Animals_CATEGORY,
    Animals_GENDERS,
    Animals_TYPES,
    LISTING_CATEGORIES,
    MAX_AGE_MONTHS,
    MAX_LISTING_IMAGES,
} from '../../constants/listings.js';
import Button from '../common/Button.jsx';
import FormInput, { FormError } from '../common/FormInput.jsx';
import ImageWithFallback from '../common/ImageWithFallback.jsx';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 5;

// Shared field chrome. The width lives OUTSIDE this base so a control can opt
// out of `w-full` without fighting it: Tailwind emits `.w-32` before `.w-full`,
// so on equal specificity a later `w-32` in the class list does NOT win — the
// age row below relies on this split to size its two controls explicitly.
const FIELD_BASE =
  'mt-1 block rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20';

const TEXTAREA_CLASS = `w-full ${FIELD_BASE}`;

const SELECT_CLASS = TEXTAREA_CLASS;

/** Fixed-width controls for the age row — the number entry and its unit menu.
 *  Both opt out of `w-full` and set their own width, so neither can crush the
 *  other; `shrink-0` keeps the spinner from squeezing the digits out. */
const AGE_FIELD_CLASS = `${FIELD_BASE} shrink-0`;

/** Which fields belong to which step of the stepped (Post a Listing) form. */
const STEP_FIELDS = {
  1: ['title', 'category', 'price', 'stockQuantity', 'description', 'AnimalsType', 'breed', 'age', 'gender'],
  2: ['location', 'images', 'sellerName', 'contactNumber', 'contactEmail'],
};
const STEPS = [
  { id: 1, label: 'Listing details' },
  { id: 2, label: 'Location & contact' },
];

/** Progress header shown above the stepped form. */
function StepIndicator({ step }) {
  return (
    <ol className="flex items-center gap-3" aria-label="Form progress">
      {STEPS.map((item, index) => {
        const done = step > item.id;
        const active = step === item.id;
        return (
          <li key={item.id} className="flex flex-1 items-center gap-3" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                done || active
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-gray-300 bg-white text-gray-500'
              }`}
            >
              {done ? '✓' : item.id}
            </span>
            <span className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-500'}`}>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Step {item.id} of {STEPS.length}
              </span>
              {item.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className={`hidden h-0.5 flex-1 rounded sm:block ${done ? 'bg-brand-700' : 'bg-gray-200'}`} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Editing an existing Animals: show whole years when the age divides evenly. */
function initialAge(ageMonths) {
  const months = Number(ageMonths);
  if (!Number.isFinite(months) || months <= 0) return { value: '', unit: 'months' };
  if (months >= 12 && months % 12 === 0) {
    return { value: String(months / 12), unit: 'years' };
  }
  return { value: String(months), unit: 'months' };
}

/**
 * Shared form for creating and editing listings. The fields adapt to the
 * chosen category: "Animals" swaps in the Animals-specific set, every other
 * category keeps the original product/item fields.
 *
 * Performs full client-side validation (mirroring the server) and submits a
 * FormData payload: text fields + new image files + kept image references.
 *
 * `onSubmit(formData)` should perform the API call and throw on failure so
 * the form can surface the error; successful submissions are navigated to
 * by the parent page.
 */
export default function ListingForm({
  initialValues,
  initialImages = [],
  submitLabel = 'Publish Listing',
  onSubmit,
  stepped = false,
  onCancel,
}) {
  const [step, setStep] = useState(1);
  const showStep1 = !stepped || step === 1;
  const showStep2 = !stepped || step === 2;

  const { value: ageValue, unit: ageUnit } = initialAge(initialValues?.ageMonths);

  const [values, setValues] = useState({
    title: initialValues?.title ?? '',
    category: initialValues?.category ?? '',
    description: initialValues?.description ?? '',
    price: initialValues?.price ?? '',
    location: initialValues?.location ?? '',
    sellerName: initialValues?.sellerName ?? '',
    contactNumber: initialValues?.contactNumber ?? '',
    contactEmail: initialValues?.contactEmail ?? '',
    additionalDetails: initialValues?.additionalDetails ?? '',
    AnimalsType: initialValues?.AnimalsType ?? '',
    breed: initialValues?.breed ?? '',
    gender: initialValues?.gender ?? '',
    stockQuantity: initialValues?.stockQuantity ?? (initialValues?.category === Animals_CATEGORY ? 0 : 10),
  });
  const [age, setAge] = useState({ value: ageValue, unit: ageUnit });
  const [keptImages, setKeptImages] = useState(initialImages);
  const [newImages, setNewImages] = useState([]); // { file, previewUrl }
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalImageCount = keptImages.length + newImages.length;
  const isAnimals = values.category === Animals_CATEGORY;

  const setField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  /** Age is entered as a number + unit and submitted as whole months. */
  const ageInMonths = () => {
    if (age.value === '') return NaN;
    const amount = Number(age.value);
    if (!Number.isFinite(amount)) return NaN;
    return age.unit === 'years' ? amount * 12 : amount;
  };

  const handleFilesSelected = (event) => {
    setFormError('');
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    const roomLeft = MAX_LISTING_IMAGES - totalImageCount;
    if (files.length > roomLeft) {
      setFormError(`You can add at most ${roomLeft} more image${roomLeft === 1 ? '' : 's'}.`);
      return;
    }
    if (files.length === 0) return;

    const rejected = files.filter((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
    if (rejected.length > 0) {
      setFormError(`Unsupported file type: ${rejected[0].name}. Allowed types: JPEG, PNG, WebP.`);
      return;
    }
    const tooLarge = files.filter((file) => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (tooLarge.length > 0) {
      setFormError(`"${tooLarge[0].name}" is larger than ${MAX_IMAGE_SIZE_MB} MB.`);
      return;
    }

    setNewImages((prev) => [
      ...prev,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeKeptImage = (index) => {
    setKeptImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errors = {};
    if (!values.title.trim()) {
      errors.title = 'Title is required';
    } else if (values.title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters';
    } else if (values.title.trim().length > 100) {
      errors.title = 'Title must be at most 100 characters';
    }
    if (!values.category) {
      errors.category = 'Please choose a category';
    }
    if (!values.description.trim()) {
      errors.description = 'Description is required';
    } else if (values.description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }
    const price = Number(values.price);
    if (values.price === '' || Number.isNaN(price)) {
      errors.price = 'Price is required';
    } else if (price < 0) {
      errors.price = 'Price cannot be negative';
    }
    if (!isAnimals) {
      const stock = Number(values.stockQuantity);
      if (values.stockQuantity === '' || Number.isNaN(stock)) {
        errors.stockQuantity = 'Stock quantity is required';
      } else if (!Number.isInteger(stock) || stock < 0) {
        errors.stockQuantity = 'Stock quantity must be a non-negative whole number';
      }
    }
    if (!values.location.trim()) {
      errors.location = 'Location is required';
    }
    if (totalImageCount === 0) {
      errors.images = 'Please add at least one image';
    }
    if (!values.sellerName.trim()) {
      errors.sellerName = 'Seller name is required';
    }
    if (!/^[0-9+\-\s]{7,15}$/.test(values.contactNumber.trim())) {
      errors.contactNumber = 'Please provide a valid contact number';
    }
    if (values.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) {
      errors.contactEmail = 'Please provide a valid email address';
    }

    // Animals listings carry their own required set — and only they do.
    if (isAnimals) {
      if (!values.AnimalsType) {
        errors.AnimalsType = 'Please choose an Animals type';
      }
      if (!values.breed.trim()) {
        errors.breed = 'Breed is required';
      } else if (values.breed.trim().length > 60) {
        errors.breed = 'Breed must be at most 60 characters';
      }
      const months = ageInMonths();
      if (age.value === '') {
        errors.age = 'Age is required';
      } else if (!Number.isInteger(months) || months < 0) {
        errors.age = 'Age must be a whole number';
      } else if (months > MAX_AGE_MONTHS) {
        errors.age = `Age must be at most ${MAX_AGE_MONTHS} months`;
      }
      if (!values.gender) {
        errors.gender = 'Please choose a gender';
      }
    }

    return errors;
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  /** Validates only the fields of the current step, then moves on. */
  const goNext = () => {
    setFormError('');
    const all = validate();
    const stepErrors = Object.fromEntries(Object.entries(all).filter(([key]) => STEP_FIELDS[1].includes(key)));
    setFieldErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    setStep(2);
    scrollToTop();
  };

  const goBack = () => {
    setFormError('');
    setStep(1);
    scrollToTop();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    // Enter pressed on step 1 of the stepped form means "Next", not "Publish".
    if (stepped && step === 1) {
      goNext();
      return;
    }
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the highlighted fields.');
      // An error on step 1 (e.g. after editing back) sends the user there.
      if (stepped && Object.keys(errors).some((key) => STEP_FIELDS[1].includes(key))) setStep(1);
      scrollToTop();
      return;
    }

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'price') {
        formData.append(key, Number(value));
      } else if (key === 'stockQuantity') {
        if (!isAnimals && value !== undefined && value !== '') {
          formData.append(key, parseInt(value, 10));
        }
      } else {
        formData.append(key, String(value).trim());
      }
    });
    // Animals fields go out as months — the single stored representation.
    if (isAnimals) {
      formData.set('ageMonths', String(ageInMonths()));
    }
    if (keptImages.length > 0) {
      formData.append('existingImages', JSON.stringify(keptImages.map(({ url, publicId }) => ({ url, publicId }))));
    }
    newImages.forEach(({ file }) => {
      formData.append('images', file);
    });

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setFormError(error.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {stepped && <StepIndicator step={step} />}
      <FormError message={formError} />

      <div className="mt-6 space-y-6">
        {showStep1 && (
          <>
        <FormInput
          label="Title"
          id="listing-title"
          type="text"
          required
          maxLength={100}
          placeholder={isAnimals ? 'e.g. Golden Retriever Puppy' : 'e.g. Premium Dog Food 20kg Pack'}
          value={values.title}
          onChange={setField('title')}
          error={fieldErrors.title}
        />

        <div>
          <label htmlFor="listing-category" className="block text-sm font-medium text-gray-700">
            Category <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <select
            id="listing-category"
            required
            className={`${TEXTAREA_CLASS} ${fieldErrors.category ? 'border-red-400' : ''}`}
            value={values.category}
            onChange={setField('category')}
            aria-invalid={fieldErrors.category ? 'true' : undefined}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {LISTING_CATEGORIES.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.category}</p>
          )}
          <p className="mt-1.5 text-sm text-gray-500">
            {isAnimals
              ? 'Animals listings need the Animals details below. Photos must show the actual Animals.'
              : 'Listings are for Animals-related products and items, or for Animals themselves.'}
          </p>
        </div>

        {/* Animals-only fields — shown for the "Animals" category and nowhere else. */}
        {isAnimals && (
          <div className="space-y-6 rounded-xl border border-brand-200 bg-brand-50/50 p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Animals details</h2>
              <p className="mt-1 text-sm text-gray-600">
                These help buyers find the right Animals. All four are required.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="listing-Animals-type" className="block text-sm font-medium text-gray-700">
                  Animals type <span className="text-red-600" aria-hidden="true">*</span>
                </label>
                <select
                  id="listing-Animals-type"
                  required
                  className={`${SELECT_CLASS} ${fieldErrors.AnimalsType ? 'border-red-400' : ''}`}
                  value={values.AnimalsType}
                  onChange={setField('AnimalsType')}
                  aria-invalid={fieldErrors.AnimalsType ? 'true' : undefined}
                >
                  <option value="" disabled>
                    Choose a type
                  </option>
                  {Animals_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {fieldErrors.AnimalsType && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.AnimalsType}</p>
                )}
              </div>

              <div>
                <label htmlFor="listing-gender" className="block text-sm font-medium text-gray-700">
                  Gender <span className="text-red-600" aria-hidden="true">*</span>
                </label>
                <select
                  id="listing-gender"
                  required
                  className={`${SELECT_CLASS} ${fieldErrors.gender ? 'border-red-400' : ''}`}
                  value={values.gender}
                  onChange={setField('gender')}
                  aria-invalid={fieldErrors.gender ? 'true' : undefined}
                >
                  <option value="" disabled>
                    Choose a gender
                  </option>
                  {Animals_GENDERS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
                {fieldErrors.gender && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.gender}</p>
                )}
              </div>

              <FormInput
                label="Breed"
                id="listing-breed"
                type="text"
                required
                maxLength={60}
                placeholder="e.g. Golden Retriever"
                value={values.breed}
                onChange={setField('breed')}
                error={fieldErrors.breed}
              />

              <div>
                <label htmlFor="listing-age" className="block text-sm font-medium text-gray-700">
                  Age <span className="text-red-600" aria-hidden="true">*</span>
                </label>
                {/* The number entry keeps a fixed 8rem so digits stay visible;
                    the unit menu narrows slightly on phones so the pair still
                    fits on one row inside the form card. `wrap` is the
                    last-resort guard so nothing can overflow. */}
                <div className="flex flex-wrap gap-2">
                  <input
                    id="listing-age"
                    type="number"
                    min="0"
                    step="1"
                    required
                    className={`${AGE_FIELD_CLASS} w-32 ${fieldErrors.age ? 'border-red-400' : ''}`}
                    placeholder={age.unit === 'years' ? 'e.g. 3' : 'e.g. 6'}
                    value={age.value}
                    onChange={(event) => setAge((prev) => ({ ...prev, value: event.target.value }))}
                    aria-invalid={fieldErrors.age ? 'true' : undefined}
                  />
                  <select
                    aria-label="Age unit"
                    className={`${AGE_FIELD_CLASS} w-28 sm:w-32`}
                    value={age.unit}
                    onChange={(event) => setAge((prev) => ({ ...prev, unit: event.target.value }))}
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                {fieldErrors.age && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.age}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <FormInput
          label="Price (₹)"
          id="listing-price"
          type="number"
          min="0"
          step="1"
          required
          placeholder="e.g. 2450"
          value={values.price}
          onChange={setField('price')}
          error={fieldErrors.price}
        />

        {!isAnimals && (
          <FormInput
            label="Stock Quantity"
            id="listing-stock"
            type="number"
            min="0"
            step="1"
            required
            placeholder="e.g. 10"
            value={values.stockQuantity ?? ''}
            onChange={setField('stockQuantity')}
            error={fieldErrors.stockQuantity}
          />
        )}

        <div>
          <label htmlFor="listing-description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <textarea
            id="listing-description"
            rows={5}
            required
            maxLength={5000}
            className={`${TEXTAREA_CLASS} ${fieldErrors.description ? 'border-red-400' : ''}`}
            placeholder={
              isAnimals
                ? 'Describe the Animals — temperament, health, vaccinations, diet…'
                : 'Describe the item — condition, size, brand, suitability…'
            }
            value={values.description}
            onChange={setField('description')}
            aria-invalid={fieldErrors.description ? 'true' : undefined}
          />
          {fieldErrors.description && (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.description}</p>
          )}
        </div>

          </>
        )}

        {showStep2 && (
          <>
        <FormInput
          label="Location"
          id="listing-location"
          type="text"
          required
          maxLength={100}
          placeholder="e.g. Lucknow"
          value={values.location}
          onChange={setField('location')}
          error={fieldErrors.location}
        />

        {/* Images */}
        <div>
          <span className="block text-sm font-medium text-gray-700">
            Images <span className="text-red-600" aria-hidden="true">*</span>
          </span>
          <p className="mt-1.5 text-sm text-gray-500">
            Up to {MAX_LISTING_IMAGES} images — JPEG, PNG, or WebP, max 5 MB each.
          </p>

          {(keptImages.length > 0 || newImages.length > 0) && (
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {keptImages.map((image, index) => (
                <li key={image.url} className="group relative">
                  <ImageWithFallback
                    src={image.url}
                    alt={`Kept image ${index + 1}`}
                    className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeptImage(index)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-1 text-white shadow transition-opacity hover:bg-red-600"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </li>
              ))}
              {newImages.map((image, index) => (
                <li key={image.previewUrl} className="relative">
                  <img
                    src={image.previewUrl}
                    alt={`New image ${index + 1}`}
                    className="aspect-square w-full rounded-lg border border-brand-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-1 text-white shadow transition-colors hover:bg-red-600"
                    aria-label={`Remove new image ${index + 1}`}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label
            className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
              fieldErrors.images
                ? 'border-red-300 bg-red-50 hover:border-red-400'
                : 'border-gray-300 bg-gray-50 hover:border-brand-500 hover:bg-brand-50'
            }`}
          >
            <svg className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="mt-2 text-sm font-medium text-gray-700">
              Click to {totalImageCount > 0 ? 'add more ' : ''}images
            </span>
            <span className="mt-1 text-xs text-gray-500">
              {totalImageCount} of {MAX_LISTING_IMAGES} selected
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={handleFilesSelected}
            />
          </label>
          {fieldErrors.images && (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.images}</p>
          )}
        </div>

        <FormInput
          label={isAnimals ? 'Owner name' : 'Seller name'}
          id="listing-seller-name"
          type="text"
          required
          maxLength={50}
          value={values.sellerName}
          onChange={setField('sellerName')}
          error={fieldErrors.sellerName}
        />

        <FormInput
          label="Contact number"
          id="listing-contact-number"
          type="tel"
          required
          placeholder={isAnimals ? 'Buyers will call this number about the Animals' : 'Buyers will see this number'}
          value={values.contactNumber}
          onChange={setField('contactNumber')}
          error={fieldErrors.contactNumber}
        />

        <FormInput
          label="Contact email (optional)"
          id="listing-contact-email"
          type="email"
          placeholder="you@example.com"
          value={values.contactEmail}
          onChange={setField('contactEmail')}
          error={fieldErrors.contactEmail}
        />

        <div>
          <label htmlFor="listing-additional-details" className="block text-sm font-medium text-gray-700">
            Additional details (optional)
          </label>
          <textarea
            id="listing-additional-details"
            rows={3}
            maxLength={2000}
            className={TEXTAREA_CLASS}
            placeholder="Delivery options, warranty, reason for selling…"
            value={values.additionalDetails}
            onChange={setField('additionalDetails')}
          />
        </div>
          </>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        {stepped && step === 2 && (
          <Button type="button" variant="outline" size="lg" onClick={goBack} disabled={submitting}>
            ← Back
          </Button>
        )}
        {/*
          The distinct `key`s matter: without them React reuses ONE <button> DOM node for both
          buttons, flips its type from "button" to "submit" while the Next click is still being
          handled, and the browser then submits the form right after moving to step 2 — which
          is what showed "Location is required" / "Please add at least one image" immediately.
        */}
        {stepped && step === 1 ? (
          <Button
            key="next"
            type="button"
            size="lg"
            onClick={(event) => {
              event.preventDefault();
              goNext();
            }}
          >
            Next →
          </Button>
        ) : (
          <Button key="submit" type="submit" size="lg" loading={submitting} disabled={submitting}>
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}