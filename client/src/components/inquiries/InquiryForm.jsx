import { useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { inquiryService } from '../../services/inquiryService.js';
import { cn } from '../../utils/cn.js';
import Button from '../common/Button.jsx';
import FormInput, { FormError } from '../common/FormInput.jsx';

/**
 * The customer inquiry form, shared by the Contact page and the homepage
 * contact section so there is exactly one copy of the validation, the submit
 * handling and the field markup.
 *
 * Posts to the existing Phase 3 endpoint via inquiryService.submitInquiry().
 */

/** Mirrors createInquirySchema on the server, so the form blocks what the API would reject. */
const FIELD_LIMITS = { name: 100, email: 150, phone: 25, subject: 150, message: 3000 };

const EMPTY_FORM = { name: '', email: '', phone: '', subject: '', message: '' };

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Product Availability / Stock',
  'Bulk / Farm Quantity Orders',
  'Live Animals Listing Inquiries',
  'Order Status / Delivery',
];

/** Deliberately loose — the server does the authoritative check. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared chrome for the hand-rolled select and textarea, matching FormInput. */
const CONTROL_BASE =
  'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20';
const CONTROL_ERROR = 'border-red-400 focus:border-red-500 focus:ring-red-500/20';

/** Returns a { field: message } map; empty means the form is ready to send. */
function validate(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();

  if (!name) errors.name = 'Full name is required.';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters.';
  else if (name.length > FIELD_LIMITS.name) errors.name = `Name cannot exceed ${FIELD_LIMITS.name} characters.`;

  if (!email) errors.email = 'Email address is required.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  else if (email.length > FIELD_LIMITS.email) errors.email = `Email cannot exceed ${FIELD_LIMITS.email} characters.`;

  // Phone stays optional; only its length is constrained.
  if (phone && phone.length > FIELD_LIMITS.phone) {
    errors.phone = `Phone cannot exceed ${FIELD_LIMITS.phone} characters.`;
  }

  if (!subject) errors.subject = 'Please choose an inquiry subject.';
  else if (subject.length > FIELD_LIMITS.subject) errors.subject = `Subject cannot exceed ${FIELD_LIMITS.subject} characters.`;

  if (!message) errors.message = 'Message is required.';
  else if (message.length < 5) errors.message = 'Message must be at least 5 characters.';
  else if (message.length > FIELD_LIMITS.message) errors.message = `Message cannot exceed ${FIELD_LIMITS.message} characters.`;

  return errors;
}

/** Order used to focus the first invalid control after a failed validation pass. */
const FIELD_ORDER = ['name', 'email', 'phone', 'subject', 'message'];

export default function InquiryForm({ idPrefix = 'contact' }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // `submitting` only reaches the button on the next render, so a burst of
  // clicks in one tick would all pass the state check. The ref flips
  // synchronously and closes that window.
  const submittingRef = useRef(false);

  const id = (field) => `${idPrefix}-${field}`;

  /** Clear a field's error as soon as the visitor edits it. */
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    setFormError('');
    const errors = validate(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the highlighted fields.');
      const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
      document.getElementById(id(firstInvalid))?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    };

    try {
      const response = await inquiryService.submitInquiry(payload);
      toast(
        response.message || `Thank you, ${payload.name}. Our support team will reply within 24 hours.`
      );
      setFormData(EMPTY_FORM);
      setFieldErrors({});
    } catch (err) {
      // The API returns 422 with per-field errors — surface those on the inputs
      // and keep everything the visitor typed so nothing has to be re-entered.
      const serverErrors = Array.isArray(err.errors) ? err.errors : [];
      const mapped = {};
      serverErrors.forEach(({ field, message }) => {
        if (field && field !== 'body') mapped[field] = message;
      });
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
        setFormError(err.message || 'Please fix the highlighted fields.');
      } else {
        setFormError(err.message || 'Unable to submit your inquiry. Please try again.');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={formError} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput
          id={id('name')}
          label="Full Name"
          type="text"
          required
          autoComplete="name"
          maxLength={FIELD_LIMITS.name}
          value={formData.name}
          onChange={handleChange('name')}
          error={fieldErrors.name}
          placeholder="Enter full name"
        />
        <FormInput
          id={id('email')}
          label="Email Address"
          type="email"
          required
          autoComplete="email"
          maxLength={FIELD_LIMITS.email}
          value={formData.email}
          onChange={handleChange('email')}
          error={fieldErrors.email}
          placeholder="name@example.com"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput
          id={id('phone')}
          label="Phone Number"
          type="tel"
          autoComplete="tel"
          maxLength={FIELD_LIMITS.phone}
          value={formData.phone}
          onChange={handleChange('phone')}
          error={fieldErrors.phone}
          hint="Optional"
          placeholder="e.g. +91 98765 43210"
        />
        <div>
          <label htmlFor={id('subject')} className="block text-sm font-medium text-gray-700">
            Subject
            <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
          </label>
          <select
            id={id('subject')}
            required
            value={formData.subject}
            onChange={handleChange('subject')}
            aria-invalid={fieldErrors.subject ? 'true' : undefined}
            aria-describedby={fieldErrors.subject ? `${id('subject')}-error` : undefined}
            className={cn(CONTROL_BASE, fieldErrors.subject && CONTROL_ERROR)}
          >
            <option value="">Please choose a subject…</option>
            {SUBJECT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {fieldErrors.subject && (
            <p id={`${id('subject')}-error`} className="mt-1.5 text-sm text-red-600">
              {fieldErrors.subject}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={id('message')} className="block text-sm font-medium text-gray-700">
          Message
          <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
        </label>
        <textarea
          id={id('message')}
          required
          rows={5}
          maxLength={FIELD_LIMITS.message}
          value={formData.message}
          onChange={handleChange('message')}
          aria-invalid={fieldErrors.message ? 'true' : undefined}
          aria-describedby={fieldErrors.message ? `${id('message')}-error` : undefined}
          className={cn(CONTROL_BASE, fieldErrors.message && CONTROL_ERROR)}
          placeholder="Tell us what you are looking for…"
        />
        {fieldErrors.message && (
          <p id={`${id('message')}-error`} className="mt-1.5 text-sm text-red-600">
            {fieldErrors.message}
          </p>
        )}
      </div>

      <Button type="submit" loading={submitting} size="md" className="w-full sm:w-auto">
        {submitting ? 'Sending…' : 'Send Message'}
      </Button>
    </form>
  );
}
